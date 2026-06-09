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
		// skeleton
	}

	public stop(): void {
		// skeleton
	}

	private async poll(): Promise<void> {
		// skeleton
	}

	private async loadState(): Promise<void> {
		// skeleton
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