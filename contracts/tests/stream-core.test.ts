import { describe } from "@hirosystems/clarinet-sdk";

describe("stream-core", () => {
	// stream creation
	// TODO: rejects sender=recipient, zero recipient, invalid amount/rate/duration
	// TODO: creates STX streams and appends stream id to sender/recipient indexes
	// TODO: creates SIP-010 streams and collects protocol fee correctly

	// claim and checkpoint accounting
	// TODO: accrues by block delta and caps claimable at remaining deposit
	// TODO: rejects claim when caller is not recipient or claimable is zero

	// pause/resume lifecycle
	// TODO: checkpoints accrued balance before pausing
	// TODO: resumes from current block without back-accruing paused interval

	// cancellation
	// TODO: pays recipient accrued amount then refunds sender remainder
	// TODO: rejects repeated cancellation

	// read-only
	// TODO: validates get-stream/get-stream-status/get-claimable-balance outputs
	// TODO: validates sender and recipient reverse index queries
});
