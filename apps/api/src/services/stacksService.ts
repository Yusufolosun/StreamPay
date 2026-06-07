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


import type { CacheEntry } from "../types/stacks.js";

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
	public constructor(
		private readonly baseUrl: string,
		private readonly apiKey: string | null = null,
	) {}

	private async fetchStatus(): Promise<StacksStatusPayload> {
		const statusUrl = new URL("/extended/v1/status", this.baseUrl);
		const response = await fetch(statusUrl, {
			headers: this.apiKey == null ? undefined : { "x-api-key": this.apiKey },
			signal: AbortSignal.timeout(2_000),
		});

		if (!response.ok) {
			throw new Error(`Stacks API responded with ${response.status}`);
		}

		return (await response.json()) as StacksStatusPayload;
	}

	public async getHealth(): Promise<StacksHealth> {
		try {
			const status = await this.fetchStatus();

			return {
				reachable: true,
				blockHeight: extractBlockHeight(status),
			};
		} catch {
			return {
				reachable: false,
				blockHeight: 0,
			};
		}
	}
}