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

// ─────────────────────────────────────────────────────────────────────────────
// StreamEvents (Discriminated union for events parsed from contract logs)
// ─────────────────────────────────────────────────────────────────────────────

export type StreamEventBase = {
	eventType: string;
	streamId: number | null;
	caller: string;
	blockHeight: number;
	txId: string;
	eventIndex: number;
};

export type StreamCreatedEvent = StreamEventBase & {
	eventType: "stream-created";
	streamId: number;
	depositAmount: bigint;
	feeAmount: bigint;
};

export type StreamClaimedEvent = StreamEventBase & {
	eventType: "stream-claimed";
	streamId: number;
	claimedAmount: bigint;
};

export type StreamPausedEvent = StreamEventBase & {
	eventType: "stream-paused";
	streamId: number;
	checkpointBalance: bigint;
};

export type StreamResumedEvent = StreamEventBase & {
	eventType: "stream-resumed";
	streamId: number;
	checkpointBalance: bigint;
};

export type StreamCancelledEvent = StreamEventBase & {
	eventType: "stream-cancelled";
	streamId: number;
	recipientPaid: bigint;
	senderRefunded: bigint;
};

export type SenderTransferredEvent = StreamEventBase & {
	eventType: "sender-transferred";
	streamId: number;
	newSender: string;
};

export type FeeUpdatedEvent = StreamEventBase & {
	eventType: "fee-updated";
	streamId: null;
	oldFee: number;
	newFee: number;
};

export type ProtocolPausedEvent = StreamEventBase & {
	eventType: "protocol-paused";
	streamId: null;
};

export type ProtocolResumedEvent = StreamEventBase & {
	eventType: "protocol-resumed";
	streamId: null;
};

export type FeesWithdrawnEvent = StreamEventBase & {
	eventType: "fees-withdrawn";
	streamId: null;
	amount: bigint;
	recipient: string;
};

export type DisputeRaisedEvent = StreamEventBase & {
	eventType: "dispute-raised";
	streamId: number;
	milestoneIndex: number;
};

export type StreamEvent =
	| StreamCreatedEvent
	| StreamClaimedEvent
	| StreamPausedEvent
	| StreamResumedEvent
	| StreamCancelledEvent
	| SenderTransferredEvent
	| FeeUpdatedEvent
	| ProtocolPausedEvent
	| ProtocolResumedEvent
	| FeesWithdrawnEvent
	| DisputeRaisedEvent;



