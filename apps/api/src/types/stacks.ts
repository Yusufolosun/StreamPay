/**
 * Typed error for all Stacks blockchain service failures.
 *
 * `retryable` indicates whether the caller should retry the request:
 *   - `true`  → network timeouts, 5xx server errors, rate limits (429)
 *   - `false` → 4xx client errors, parse failures, contract not found
 */
export class StacksServiceError extends Error {
	public constructor(
		public readonly code: string,
		message: string,
		public readonly retryable: boolean,
		public readonly cause?: unknown,
	) {
		super(message);
		this.name = "StacksServiceError";
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// On-chain stream (from stream-core `get-stream` read-only)
// Maps the Clarity tuple: { sender, recipient, token-contract, deposit-amount,
// rate-per-block, start-block, end-block, claimed-amount, is-paused,
// is-cancelled, created-at }
// ─────────────────────────────────────────────────────────────────────────────

export type OnChainStream = {
	sender: string;
	recipient: string;
	tokenContract: string | null;
	depositAmount: bigint;
	ratePerBlock: bigint;
	startBlock: number;
	endBlock: number;
	claimedAmount: bigint;
	isPaused: boolean;
	isCancelled: boolean;
	createdAt: number;
};

