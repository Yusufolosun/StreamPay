import * as fs from "node:fs/promises";
import * as path from "node:path";
import { calculateStreamBalance, type StreamBalanceInput, type StreamBalanceSnapshot } from "./balanceCalculator.js";
import { type StacksService } from "./stacksService.js";
import { type StreamEvent } from "../types/stacks.js";

export type StreamLifecycleStatus = "active" | "paused" | "cancelled" | "completed";

export type IndexedStreamRecord = StreamBalanceInput & {
	id: string;
	sender: string;
	recipient: string;
	tokenContract: string;
};

export type IndexedStreamView = IndexedStreamRecord & {
	status: StreamLifecycleStatus;
	balance: StreamBalanceSnapshot;
};

export type StreamIndexEntry = {
	id: number;
	sender: string;
	recipient: string;
	tokenContract: string;
	depositAmount: bigint;
	ratePerBlock: bigint;
	startBlock: number;
	endBlock: number;
	claimedAmount: bigint;
	pausedAtBlock: number | null;
	cancelledAtBlock: number | null;
	isPaused: boolean;
	isCancelled: boolean;
	createdAt: number;
};

export function bigintJsonReplacer(key: string, value: any): any {
	if (typeof value === "bigint") {
		return { __type: "bigint", value: value.toString() };
	}
	return value;
}

export function bigintJsonReviver(key: string, value: any): any {
	if (value && typeof value === "object" && value.__type === "bigint") {
		return BigInt(value.value);
	}
	return value;
}


const resolveStatus = (record: IndexedStreamRecord, balance: StreamBalanceSnapshot): StreamLifecycleStatus => {
	if (record.cancelledAtBlock != null) {
		return "cancelled";
	}

	if (record.pausedAtBlock != null) {
		return "paused";
	}

	if (balance.claimableAmount === 0n && balance.remainingAmount === 0n) {
		return "completed";
	}

	return "active";
};

export const summarizeStream = (record: IndexedStreamRecord): IndexedStreamView => {
	const balance = calculateStreamBalance(record);

	return {
		...record,
		status: resolveStatus(record, balance),
		balance,
	};
};

export class StreamIndexer {
	private cursor = 0;
	private streams = new Map<number, StreamIndexEntry>();
	private senderStreams = new Map<string, number[]>();
	private recipientStreams = new Map<string, number[]>();
	private protocolFee = 0;
	private isProtocolPaused = false;
	private isRunning = false;
	private intervalId: NodeJS.Timeout | null = null;
	private readonly stateFilePath: string;

	constructor(
		private readonly stacksService: StacksService,
		private readonly contractAddress: string,
		stateFilePath?: string,
	) {
		this.stateFilePath = stateFilePath || "";
	}

	public getCursor(): number {
		return this.cursor;
	}

	public getStreams(): StreamIndexEntry[] {
		return Array.from(this.streams.values());
	}

	public getStream(id: number): StreamIndexEntry | undefined {
		return this.streams.get(id);
	}

	public getSenderStreams(sender: string): StreamIndexEntry[] {
		const ids = this.senderStreams.get(sender) || [];
		return ids.map((id) => this.streams.get(id)!).filter(Boolean);
	}

	public getRecipientStreams(recipient: string): StreamIndexEntry[] {
		const ids = this.recipientStreams.get(recipient) || [];
		return ids.map((id) => this.streams.get(id)!).filter(Boolean);
	}

	public getProtocolFee(): number {
		return this.protocolFee;
	}

	public getIsProtocolPaused(): boolean {
		return this.isProtocolPaused;
	}

	public async start(): Promise<void> {
		if (this.isRunning) return;
		this.isRunning = true;

		await this.loadState();

		// Run immediate poll, then set interval
		this.poll().catch((err) => console.error("Initial indexer poll failed:", err));

		this.intervalId = setInterval(() => {
			this.poll().catch((err) => console.error("Indexer poll failed:", err));
		}, 5000);
	}

	public stop(): void {
		if (!this.isRunning) return;
		this.isRunning = false;

		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	private async poll(): Promise<void> {
		try {
			const tip = await this.stacksService.getCurrentBlockHeight();
			if (tip <= this.cursor) {
				return;
			}

			// Skeleton: fetch new events and process them
			const events = await this.fetchEventsSince(this.cursor, tip);
			
			for (const event of events) {
				await this.dispatchEvent(event);
			}

			this.cursor = tip;
			await this.saveState();
		} catch (error) {
			console.error("Error in indexer poll cycle:", error);
		}
	}

	private async fetchEventsSince(cursor: number, tip: number): Promise<StreamEvent[]> {
		const limit = 50;
		let offset = 0;
		let fetchMore = true;
		const allEvents: StreamEvent[] = [];

		while (fetchMore) {
			const events = await this.stacksService.getContractEvents(this.contractAddress, { limit, offset });
			if (events.length === 0) {
				break;
			}

			for (const event of events) {
				if (event.blockHeight <= cursor) {
					fetchMore = false;
					break;
				}
				if (event.blockHeight <= tip) {
					allEvents.push(event);
				}
			}

			if (events.length < limit) {
				break;
			}
			offset += limit;
		}

		return allEvents.sort((a, b) => {
			if (a.blockHeight !== b.blockHeight) {
				return a.blockHeight - b.blockHeight;
			}
			return a.eventIndex - b.eventIndex;
		});
	}

	private async dispatchEvent(event: StreamEvent): Promise<void> {
		// skeleton
	}

	private addStreamToSenderRecipientMaps(entry: StreamIndexEntry): void {
		const senderIds = this.senderStreams.get(entry.sender) || [];
		if (!senderIds.includes(entry.id)) {
			senderIds.push(entry.id);
			this.senderStreams.set(entry.sender, senderIds);
		}

		const recipientIds = this.recipientStreams.get(entry.recipient) || [];
		if (!recipientIds.includes(entry.id)) {
			recipientIds.push(entry.id);
			this.recipientStreams.set(entry.recipient, recipientIds);
		}
	}

	private removeStreamFromSenderRecipientMaps(entry: StreamIndexEntry): void {
		const senderIds = this.senderStreams.get(entry.sender);
		if (senderIds) {
			const index = senderIds.indexOf(entry.id);
			if (index !== -1) {
				senderIds.splice(index, 1);
			}
			if (senderIds.length === 0) {
				this.senderStreams.delete(entry.sender);
			}
		}

		const recipientIds = this.recipientStreams.get(entry.recipient);
		if (recipientIds) {
			const index = recipientIds.indexOf(entry.id);
			if (index !== -1) {
				recipientIds.splice(index, 1);
			}
			if (recipientIds.length === 0) {
				this.recipientStreams.delete(entry.recipient);
			}
		}
	}

	private async loadState(): Promise<void> {
		if (!this.stateFilePath) return;

		try {
			try {
				await fs.access(this.stateFilePath);
			} catch {
				return;
			}

			const serialized = await fs.readFile(this.stateFilePath, "utf8");
			const parsed = JSON.parse(serialized, bigintJsonReviver);

			if (parsed) {
				if (typeof parsed.cursor === "number") {
					this.cursor = parsed.cursor;
				}
				if (Array.isArray(parsed.streams)) {
					this.streams = new Map<number, StreamIndexEntry>(parsed.streams);

					this.senderStreams.clear();
					this.recipientStreams.clear();
					for (const entry of this.streams.values()) {
						this.addStreamToSenderRecipientMaps(entry);
					}
				}
				if (typeof parsed.protocolFee === "number") {
					this.protocolFee = parsed.protocolFee;
				}
				if (typeof parsed.isProtocolPaused === "boolean") {
					this.isProtocolPaused = parsed.isProtocolPaused;
				}
			}
		} catch (error) {
			console.error("Failed to load indexer state:", error);
		}
	}

	private async saveState(): Promise<void> {
		if (!this.stateFilePath) return;

		try {
			const dir = path.dirname(this.stateFilePath);
			await fs.mkdir(dir, { recursive: true });

			const data = {
				cursor: this.cursor,
				streams: Array.from(this.streams.entries()),
				protocolFee: this.protocolFee,
				isProtocolPaused: this.isProtocolPaused,
			};

			const serialized = JSON.stringify(data, bigintJsonReplacer, 2);
			await fs.writeFile(this.stateFilePath, serialized, "utf8");
		} catch (error) {
			console.error("Failed to save indexer state:", error);
		}
	}

	public summarizeStream(record: IndexedStreamRecord): IndexedStreamView {
		return summarizeStream(record);
	}

	public summarizeStreams(records: IndexedStreamRecord[]): IndexedStreamView[] {
		return records.map((record) => summarizeStream(record));
	}
}