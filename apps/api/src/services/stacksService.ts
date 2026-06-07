/**
 * ════════════════════════════════════════════════════════════════════════════
 * BIGINT CONVENTION — applies to the entire StreamPay API codebase
 * ════════════════════════════════════════════════════════════════════════════
 *
 * All on-chain token amounts MUST be represented as `bigint` in TypeScript.
 *
 * Rules:
 *   1. Use `bigint` for every Clarity `uint` that represents a token amount
 *      (deposit-amount, rate-per-block, claimed-amount, fee-amount, etc.).
 *   2. NEVER convert a bigint amount to `Number` for arithmetic — this risks
 *      silent precision loss for values > Number.MAX_SAFE_INTEGER.
 *   3. Convert to `string` ONLY when serialising for JSON API responses.
 *   4. Block heights and basis-point values may use `number` because they
 *      are bounded indices (≤ ~12.6M blocks) or small constants (≤ 10 000).
 *   5. Comparisons between bigint values must use bigint operators
 *      (e.g. `a < b`, NOT `Number(a) < Number(b)`).
 *
 * Rationale:
 *   Stacks amounts are u128 — they can exceed 2^53. JavaScript's `number`
 *   (IEEE 754 double) silently truncates above MAX_SAFE_INTEGER. Using
 *   `bigint` everywhere prevents an entire class of financial bugs.
 * ════════════════════════════════════════════════════════════════════════════
 */


import type { CacheEntry, OnChainStream, OnChainMilestoneStream, StreamEvent, PaginationOptions, AddressStreams } from "../types/stacks.js";
import { StacksServiceError } from "../types/stacks.js";
import { c32address, c32addressDecode } from "c32check";

class TTLCache {
	private readonly cache = new Map<string, CacheEntry<any>>();

	public get<T>(key: string): T | undefined {
		const entry = this.cache.get(key);
		if (!entry) {
			return undefined;
		}

		if (Date.now() > entry.expiresAt) {
			this.cache.delete(key);
			return undefined;
		}

		return entry.value as T;
	}

	public set<T>(key: string, value: T, ttlMs: number): void {
		this.cache.set(key, {
			value,
			expiresAt: Date.now() + ttlMs,
		});
	}

	public invalidate(key: string): void {
		this.cache.delete(key);
	}

	public clear(): void {
		this.cache.clear();
	}
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelayMs = 500): Promise<T> {
	let attempt = 0;
	while (true) {
		try {
			return await fn();
		} catch (error) {
			attempt++;
			const isRetryable = error instanceof StacksServiceError && error.retryable;
			if (!isRetryable || attempt > maxRetries) {
				throw error;
			}
			const delay = baseDelayMs * Math.pow(2, attempt - 1);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}
}

function hexToBytes(hex: string): Uint8Array {
	const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
	if (clean.length % 2 !== 0) {
		throw new Error("Invalid hex string length");
	}
	const bytes = new Uint8Array(clean.length / 2);
	for (let i = 0; i < clean.length; i += 2) {
		bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
	}
	return bytes;
}

export function serializeUint(val: bigint | number): string {
	const hexVal = BigInt(val).toString(16).padStart(32, "0");
	return `0x01${hexVal}`;
}

export function serializePrincipal(address: string): string {
	const [version, hash160] = c32addressDecode(address);
	const versionHex = version.toString(16).padStart(2, "0");
	return `0x05${versionHex}${hash160}`;
}

class ClarityDeserializer {
	private pos = 0;

	constructor(private readonly bytes: Uint8Array) {}

	public deserialize(): any {
		if (this.pos >= this.bytes.length) {
			throw new Error("Unexpected end of bytes during Clarity deserialization");
		}

		const tag = this.bytes[this.pos++];
		switch (tag) {
			case 0x01: {
				const valBytes = this.bytes.slice(this.pos, this.pos + 16);
				this.pos += 16;
				let val = 0n;
				for (const byte of valBytes) {
					val = (val << 8n) + BigInt(byte);
				}
				return val;
			}
			case 0x03:
				return true;
			case 0x04:
				return false;
			case 0x05: {
				const version = this.bytes[this.pos++];
				const hash160Bytes = this.bytes.slice(this.pos, this.pos + 20);
				this.pos += 20;
				const hash160Hex = Array.from(hash160Bytes)
					.map((b) => b.toString(16).padStart(2, "0"))
					.join("");
				return c32address(version, hash160Hex);
			}
			case 0x06: {
				const version = this.bytes[this.pos++];
				const hash160Bytes = this.bytes.slice(this.pos, this.pos + 20);
				this.pos += 20;
				const hash160Hex = Array.from(hash160Bytes)
					.map((b) => b.toString(16).padStart(2, "0"))
					.join("");
				const address = c32address(version, hash160Hex);

				const nameLen = this.bytes[this.pos++];
				const nameBytes = this.bytes.slice(this.pos, this.pos + nameLen);
				this.pos += nameLen;
				const name = new TextDecoder().decode(nameBytes);
				return `${address}.${name}`;
			}
			case 0x09:
				return null;
			case 0x0a:
				return this.deserialize();
			case 0x0b: {
				const len = this.readUint32();
				const list: any[] = [];
				for (let i = 0; i < len; i++) {
					list.push(this.deserialize());
				}
				return list;
			}
			case 0x0c: {
				const len = this.readUint32();
				const obj: Record<string, any> = {};
				for (let i = 0; i < len; i++) {
					const keyLen = this.bytes[this.pos++];
					const keyBytes = this.bytes.slice(this.pos, this.pos + keyLen);
					this.pos += keyLen;
					const key = new TextDecoder().decode(keyBytes);
					const val = this.deserialize();
					obj[key] = val;
				}
				return obj;
			}
			case 0x0d: {
				const len = this.readUint32();
				const strBytes = this.bytes.slice(this.pos, this.pos + len);
				this.pos += len;
				return new TextDecoder().decode(strBytes);
			}
			default:
				throw new Error(`Unsupported Clarity tag: 0x${tag.toString(16)}`);
		}
	}

	private readUint32(): number {
		if (this.pos + 4 > this.bytes.length) {
			throw new Error("Unexpected end of bytes when reading uint32");
		}
		const val =
			(this.bytes[this.pos] << 24) |
			(this.bytes[this.pos + 1] << 16) |
			(this.bytes[this.pos + 2] << 8) |
			this.bytes[this.pos + 3];
		this.pos += 4;
		return val >>> 0;
	}
}

export function deserializeClarityHex(hex: string): any {
	const bytes = hexToBytes(hex);
	const deserializer = new ClarityDeserializer(bytes);
	return deserializer.deserialize();
}

export function parseClarityRepr(repr: string): any {
	let str = repr.trim();
	if (!str.startsWith("(tuple") || !str.endsWith(")")) {
		return null;
	}

	str = str.slice(6, -1).trim();

	const obj: Record<string, any> = {};
	const entries: string[] = [];
	let depth = 0;
	let start = -1;
	for (let i = 0; i < str.length; i++) {
		const char = str[i];
		if (char === '(') {
			if (depth === 0) {
				start = i;
			}
			depth++;
		} else if (char === ')') {
			depth--;
			if (depth === 0 && start !== -1) {
				entries.push(str.slice(start + 1, i));
				start = -1;
			}
		}
	}

	for (const entry of entries) {
		const trimmed = entry.trim();
		const match = trimmed.match(/^([a-zA-Z0-9-]+)\s+(.*)$/s);
		if (!match) continue;
		const key = match[1];
		const valStr = match[2].trim();

		if (valStr.startsWith('"') && valStr.endsWith('"')) {
			obj[key] = valStr.slice(1, -1);
		} else if (valStr.startsWith("'")) {
			obj[key] = valStr.slice(1);
		} else if (valStr.startsWith("u")) {
			obj[key] = BigInt(valStr.slice(1));
		} else if (valStr === "true") {
			obj[key] = true;
		} else if (valStr === "false") {
			obj[key] = false;
		} else if (valStr === "none") {
			obj[key] = null;
		} else if (valStr.startsWith("(some ")) {
			const inner = valStr.slice(6, -1).trim();
			if (inner.startsWith("u")) {
				obj[key] = BigInt(inner.slice(1));
			} else if (inner.startsWith('"') && inner.endsWith('"')) {
				obj[key] = inner.slice(1, -1);
			} else if (inner === "none") {
				obj[key] = null;
			} else {
				obj[key] = inner;
			}
		} else {
			obj[key] = valStr;
		}
	}
	return obj;
}

export function mapEventTupleToStreamEvent(
	parsed: any,
	txId: string,
	eventIndex: number,
	txBlockHeight?: number,
): StreamEvent | null {
	const eventType = parsed["event-type"] || parsed["event"];
	if (typeof eventType !== "string") {
		return null;
	}

	const blockHeightVal = parsed["block-height"] !== undefined ? parsed["block-height"] : txBlockHeight;
	const blockHeight = typeof blockHeightVal === "bigint" ? Number(blockHeightVal) : Number(blockHeightVal || 0);
	const caller = parsed.caller || "";

	let streamId: number | null = null;
	if (parsed["stream-id"] !== undefined && parsed["stream-id"] !== null) {
		streamId = Number(parsed["stream-id"]);
	}

	const base = {
		eventType,
		streamId,
		caller,
		blockHeight,
		txId,
		eventIndex,
	};

	switch (eventType) {
		case "stream-created":
			return {
				...base,
				eventType: "stream-created",
				streamId: streamId!,
				depositAmount: BigInt(parsed["deposit-amount"] || 0n),
				feeAmount: BigInt(parsed["fee-amount"] || 0n),
			};
		case "stream-claimed":
			return {
				...base,
				eventType: "stream-claimed",
				streamId: streamId!,
				claimedAmount: BigInt(parsed["claimed-amount"] || 0n),
			};
		case "stream-paused":
			return {
				...base,
				eventType: "stream-paused",
				streamId: streamId!,
				checkpointBalance: BigInt(parsed["checkpoint-balance"] || 0n),
			};
		case "stream-resumed":
			return {
				...base,
				eventType: "stream-resumed",
				streamId: streamId!,
				checkpointBalance: BigInt(parsed["checkpoint-balance"] || 0n),
			};
		case "stream-cancelled":
			return {
				...base,
				eventType: "stream-cancelled",
				streamId: streamId!,
				recipientPaid: BigInt(parsed["recipient-paid"] || 0n),
				senderRefunded: BigInt(parsed["sender-refunded"] || 0n),
			};
		case "sender-transferred":
			return {
				...base,
				eventType: "sender-transferred",
				streamId: streamId!,
				newSender: parsed["new-sender"] || "",
			};
		case "fee-updated":
			return {
				...base,
				eventType: "fee-updated",
				streamId: null,
				oldFee: Number(parsed["old-fee"] || 0),
				newFee: Number(parsed["new-fee"] || 0),
			};
		case "protocol-paused":
			return {
				...base,
				eventType: "protocol-paused",
				streamId: null,
			};
		case "protocol-resumed":
			return {
				...base,
				eventType: "protocol-resumed",
				streamId: null,
			};
		case "fees-withdrawn":
			return {
				...base,
				eventType: "fees-withdrawn",
				streamId: null,
				amount: BigInt(parsed.amount || 0n),
				recipient: parsed.recipient || "",
			};
		case "dispute-raised":
			return {
				...base,
				eventType: "dispute-raised",
				streamId: streamId!,
				milestoneIndex: Number(parsed["milestone-index"] || 0),
			};
		default:
			return null;
	}
}

export type StacksHealth = {
	reachable: boolean;
	blockHeight: number;
};

type StacksStatusPayload = Record<string, unknown>;

const extractBlockHeight = (payload: StacksStatusPayload): number => {
	const candidates = [payload.stacks_tip_height, payload.burn_block_height, payload.block_height, payload.height];

	for (const candidate of candidates) {
		if (typeof candidate === "number" && Number.isFinite(candidate) && candidate >= 0) {
			return candidate;
		}

		if (typeof candidate === "string") {
			const parsed = Number(candidate);
			if (Number.isFinite(parsed) && parsed >= 0) {
				return parsed;
			}
		}
	}

	return 0;
};

export class StacksService {
	private readonly cache = new TTLCache();

	public constructor(
		private readonly baseUrl: string,
		private readonly apiKey: string | null = null,
		private readonly contractStreamCore: string = "",
		private readonly contractStreamConditions: string = "",
	) {}

	private async fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
		const url = new URL(path, this.baseUrl);
		const headers: Record<string, string> = {
			"content-type": "application/json",
			...(options.headers as Record<string, string>),
		};
		if (this.apiKey) {
			headers["x-api-key"] = this.apiKey;
		}

		try {
			const response = await fetch(url, {
				...options,
				headers,
				signal: AbortSignal.timeout(5_000),
			});

			if (!response.ok) {
				const status = response.status;
				let message = `Hiro API responded with status ${status}`;
				try {
					const errBody = (await response.json()) as any;
					if (errBody && errBody.error) {
						message = errBody.error;
					}
				} catch {}

				const retryable = status === 429 || status >= 500;
				const code =
					status === 429
						? "RATE_LIMIT_ERROR"
						: status === 404
						? "NOT_FOUND"
						: status >= 500
						? "SERVER_ERROR"
						: "CLIENT_ERROR";

				throw new StacksServiceError(code, message, retryable);
			}

			return (await response.json()) as T;
		} catch (error) {
			if (error instanceof StacksServiceError) {
				throw error;
			}
			throw new StacksServiceError(
				"NETWORK_ERROR",
				error instanceof Error ? error.message : String(error),
				true,
				error,
			);
		}
	}

	private async callReadOnly(
		contractAddress: string,
		contractName: string,
		functionName: string,
		args: string[],
	): Promise<string> {
		const path = `/v2/contracts/call-read/${contractAddress}/${contractName}/${functionName}`;
		const payload = {
			sender: contractAddress,
			arguments: args,
		};

		const response = await this.fetchJson<{ okay: boolean; result: string }>(path, {
			method: "POST",
			body: JSON.stringify(payload),
		});

		if (!response.okay) {
			throw new StacksServiceError(
				"READ_ONLY_CALL_FAILED",
				`Read-only call to ${contractName}.${functionName} returned okay=false`,
				false,
			);
		}

		return response.result;
	}

	private async fetchStatus(): Promise<StacksStatusPayload> {
		return this.fetchJson<StacksStatusPayload>("/extended/v1/status");
	}

	public async getHealth(): Promise<StacksHealth> {
		try {
			const blockHeight = await this.getCurrentBlockHeight();
			return {
				reachable: true,
				blockHeight,
			};
		} catch {
			return {
				reachable: false,
				blockHeight: 0,
			};
		}
	}

	public async getCurrentBlockHeight(): Promise<number> {
		const cacheKey = "block-height";
		const cached = this.cache.get<number>(cacheKey);
		if (cached !== undefined) {
			return cached;
		}

		const height = await withRetry(async () => {
			const status = await this.fetchStatus();
			return extractBlockHeight(status);
		});

		this.cache.set(cacheKey, height, 5_000);
		return height;
	}

	public async getStreamById(streamId: number): Promise<OnChainStream | null> {
		const cacheKey = `stream-${streamId}`;
		const cached = this.cache.get<OnChainStream | null>(cacheKey);
		if (cached !== undefined) {
			return cached;
		}

		const stream = await withRetry(async () => {
			const [contractAddress, contractName] = this.contractStreamCore.split(".");
			const resultHex = await this.callReadOnly(
				contractAddress,
				contractName,
				"get-stream",
				[serializeUint(streamId)],
			);
			const parsed = deserializeClarityHex(resultHex);
			if (parsed === null) {
				return null;
			}

			const mapped: OnChainStream = {
				sender: parsed.sender,
				recipient: parsed.recipient,
				tokenContract: parsed["token-contract"],
				depositAmount: parsed["deposit-amount"],
				ratePerBlock: parsed["rate-per-block"],
				startBlock: Number(parsed["start-block"]),
				endBlock: Number(parsed["end-block"]),
				claimedAmount: parsed["claimed-amount"],
				isPaused: parsed["is-paused"],
				isCancelled: parsed["is-cancelled"],
				createdAt: Number(parsed["created-at"]),
			};
			return mapped;
		});

		this.cache.set(cacheKey, stream, 10_000);
		return stream;
	}

	public async getClaimableBalance(streamId: number): Promise<bigint> {
		const cacheKey = `claimable-${streamId}`;
		const cached = this.cache.get<bigint>(cacheKey);
		if (cached !== undefined) {
			return cached;
		}

		const balance = await withRetry(async () => {
			const [contractAddress, contractName] = this.contractStreamCore.split(".");
			const resultHex = await this.callReadOnly(
				contractAddress,
				contractName,
				"get-claimable-balance",
				[serializeUint(streamId)],
			);
			const parsed = deserializeClarityHex(resultHex);
			return BigInt(parsed);
		});

		this.cache.set(cacheKey, balance, 10_000);
		return balance;
	}

	public async getAddressStreams(address: string): Promise<AddressStreams> {
		const cacheKey = `address-streams-${address}`;
		const cached = this.cache.get<AddressStreams>(cacheKey);
		if (cached !== undefined) {
			return cached;
		}

		const result = await withRetry(async () => {
			const [contractAddress, contractName] = this.contractStreamCore.split(".");
			const serializedAddr = serializePrincipal(address);

			const [senderResultHex, recipientResultHex] = await Promise.all([
				this.callReadOnly(contractAddress, contractName, "get-sender-streams", [serializedAddr]),
				this.callReadOnly(contractAddress, contractName, "get-recipient-streams", [serializedAddr]),
			]);

			const senderParsed = deserializeClarityHex(senderResultHex) as bigint[];
			const recipientParsed = deserializeClarityHex(recipientResultHex) as bigint[];

			return {
				sent: senderParsed.map((id) => Number(id)),
				received: recipientParsed.map((id) => Number(id)),
			};
		});

		this.cache.set(cacheKey, result, 10_000);
		return result;
	}

	public async getMilestoneStream(id: number): Promise<OnChainMilestoneStream | null> {
		const cacheKey = `milestone-stream-${id}`;
		const cached = this.cache.get<OnChainMilestoneStream | null>(cacheKey);
		if (cached !== undefined) {
			return cached;
		}

		const stream = await withRetry(async () => {
			const [contractAddress, contractName] = this.contractStreamConditions.split(".");
			const resultHex = await this.callReadOnly(
				contractAddress,
				contractName,
				"get-milestone-stream",
				[serializeUint(id)],
			);
			const parsed = deserializeClarityHex(resultHex);
			if (parsed === null) {
				return null;
			}

			const milestonesMapped = (parsed.milestones as any[]).map((m) => ({
				label: m.label,
				basisPoints: Number(m["basis-points"]),
				isReleased: m["is-released"],
				releasedAt: m["released-at"] !== null ? Number(m["released-at"]) : null,
			}));

			const mapped: OnChainMilestoneStream = {
				sender: parsed.sender,
				recipient: parsed.recipient,
				arbiter: parsed.arbiter,
				totalAmount: parsed["total-amount"],
				tokenContract: parsed["token-contract"],
				milestones: milestonesMapped,
				isCancelled: parsed["is-cancelled"],
				createdAt: Number(parsed["created-at"]),
			};
			return mapped;
		});

		this.cache.set(cacheKey, stream, 10_000);
		return stream;
	}

	public async getContractEvents(
		contractId: string,
		options: PaginationOptions = {},
	): Promise<StreamEvent[]> {
		const limit = options.limit ?? 20;
		const offset = options.offset ?? 0;
		const path = `/extended/v1/contract/${contractId}/events?limit=${limit}&offset=${offset}`;

		const response = await withRetry(async () => {
			return await this.fetchJson<{ results: any[] }>(path);
		});

		const events: StreamEvent[] = [];
		for (const item of response.results) {
			if (item.event_type !== "smart_contract_log") {
				continue;
			}
			const log = item.contract_log;
			if (!log || !log.value) {
				continue;
			}

			try {
				let parsed: any = null;
				if (log.value.hex) {
					parsed = deserializeClarityHex(log.value.hex);
				} else if (log.value.repr) {
					parsed = parseClarityRepr(log.value.repr);
				}

				if (!parsed) {
					continue;
				}

				const mapped = mapEventTupleToStreamEvent(
					parsed,
					item.tx_id,
					item.event_index,
					item.block_height,
				);
				if (mapped) {
					events.push(mapped);
				}
			} catch (e) {
				// skip malformed logs but don't fail the whole request
			}
		}

		return events;
	}

	public invalidateCache(key: string): void {
		this.cache.invalidate(key);
	}

	public invalidateStreamCache(streamId: number): void {
		this.cache.invalidate(`stream-${streamId}`);
		this.cache.invalidate(`claimable-${streamId}`);
	}

	public clearCache(): void {
		this.cache.clear();
	}
}