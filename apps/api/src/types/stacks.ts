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

// ─────────────────────────────────────────────────────────────────────────────
// Milestone nested struct (inside OnChainMilestoneStream)
// Maps the Clarity tuple: { label, basis-points, is-released, released-at }
// ─────────────────────────────────────────────────────────────────────────────

export type OnChainMilestone = {
	label: string;
	basisPoints: number;
	isReleased: boolean;
	releasedAt: number | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// On-chain milestone stream (from stream-conditions `get-milestone-stream` read-only)
// Maps the Clarity tuple: { sender, recipient, arbiter, total-amount,
// token-contract, milestones, is-cancelled, created-at }
// ─────────────────────────────────────────────────────────────────────────────

export type OnChainMilestoneStream = {
	sender: string;
	recipient: string;
	arbiter: string | null;
	totalAmount: bigint;
	tokenContract: string | null;
	milestones: OnChainMilestone[];
	isCancelled: boolean;
	createdAt: number;
};


