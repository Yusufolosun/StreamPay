import { describe } from "@hirosystems/clarinet-sdk";

describe("stream-conditions", () => {
  // setup and fixture planning
  // TODO: create sender/recipient/arbiter accounts and helper call wrappers
  // TODO: seed arbiter-registry for positive-path arbitration tests

  // create-milestone-stream
  // TODO: validate canonical success path with two to four milestones
  // TODO: verify nonce increment and stream tuple persistence
  // TODO: rejects when basis-points sum is less than 10000
  // TODO: rejects when basis-points sum is greater than 10000
  // TODO: rejects empty labels and zero-length milestone lists

  // release-milestone
  // TODO: verify sender can release unreleased milestone
  // TODO: verify released-at gets current block-height and cannot double-release

  // dispute and resolution
  // TODO: recipient can raise dispute only when arbiter is configured
  // TODO: only stream arbiter can resolve active dispute
  // TODO: resolve false path refunds sender and closes dispute

  // cancellation
  // TODO: sender can cancel only when no active disputes exist
  // TODO: cancellation refunds only unreleased milestone amounts
});
