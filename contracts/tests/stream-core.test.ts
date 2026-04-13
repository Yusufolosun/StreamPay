import { describe } from "@hirosystems/clarinet-sdk";

describe("stream-core", () => {
	// validation matrix
	// create-stream
	// - recipient == sender -> err-invalid-recipient
	// - recipient == zero principal -> err-zero-address
	// - amount <= MIN-STREAM-AMOUNT -> err-invalid-amount
	// - rate-per-block == 0 -> err-invalid-rate
	// - duration == 0 or > MAX-STREAM-DURATION -> err-invalid-duration

	// stream creation
	// TODO: rejects sender=recipient, zero recipient, invalid amount/rate/duration
	// TODO: creates STX streams and appends stream id to sender/recipient indexes
	// TODO: creates SIP-010 streams and collects protocol fee correctly

	// claim and checkpoint accounting
	// TODO: accrues by block delta and caps claimable at remaining deposit
	// TODO: rejects claim when caller is not recipient or claimable is zero
	// TODO: claim after end-block does not exceed remaining deposit
	// TODO: repeated claim in same block returns err-insufficient-balance

	// pause/resume lifecycle
	// TODO: checkpoints accrued balance before pausing
	// TODO: resumes from current block without back-accruing paused interval
	// TODO: non-sender cannot pause or resume stream
	// TODO: pause on expired stream returns err-stream-expired

	// cancellation
	// TODO: pays recipient accrued amount then refunds sender remainder
	// TODO: rejects repeated cancellation
	// TODO: non-sender cancellation attempts return err-not-authorised
	// TODO: cancellation on paused stream still pays checkpointed recipient balance

	// read-only
	// TODO: validates get-stream/get-stream-status/get-claimable-balance outputs
	// TODO: validates sender and recipient reverse index queries
	// TODO: invalid stream-id queries return none or zero-safe defaults
	// TODO: stream status returns active, paused, expired, cancelled transitions correctly
});
