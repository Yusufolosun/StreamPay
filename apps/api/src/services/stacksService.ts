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
import { StacksServiceError } from "../types/stacks.js";
import { c32addressDecode } from "c32check";

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