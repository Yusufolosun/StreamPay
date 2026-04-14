import { describe } from "@hirosystems/clarinet-sdk";

describe("stream-nft", () => {
  // setup and fixture planning
  // TODO: create stream-core caller fixture and sample sender/recipient principals
  // TODO: add helper wrappers for mint, transfer, burn, and read-only lookups

  // SIP-009 surface
  // TODO: validate get-last-token-id starts at zero and increments after mint
  // TODO: validate get-token-uri returns metadata base URL for existing tokens
  // TODO: validate get-owner returns current owner and none for burned tokens

  // mint-stream-receipt
  // TODO: rejects non-stream-core callers
  // TODO: accepts SENDER receipts and records stream metadata
  // TODO: accepts RECIPIENT receipts and indexes both receipts for one stream
  // TODO: rejects duplicate receipt-type mints for the same stream

  // transfer
  // TODO: rejects non-owner callers
  // TODO: updates token ownership on a direct transfer
  // TODO: best-effort stream-core hook does not block NFT transfer
  // TODO: sender receipt transfer updates stream-core sender mapping

  // burn-stream-receipt
  // TODO: allows NFT owner to burn their receipt
  // TODO: allows stream-core to burn receipts during stream cleanup
  // TODO: removes token metadata and prunes empty stream index rows

  // read-only reverse lookups
  // TODO: get-stream-for-token returns stream-id, receipt-type, and minted-at
  // TODO: get-tokens-for-stream returns sender and recipient token ids when present

  // edge cases
  // TODO: zero token-id inputs return safe defaults or not-found responses
  // TODO: burned token reads return none without throwing
});
