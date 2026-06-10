/* -----------------------------------------------------------------------
 * StreamPay — Transaction Types & Contract Error Mapping
 * Shared types consumed by lib/transactions.ts and hooks/useContractCall.ts
 * ----------------------------------------------------------------------- */

// ── Stream Core types ──────────────────────────────────────────────────

export interface CreateStreamParams {
  recipient: string;
  amount: bigint;
  ratePerBlock: bigint;
  durationBlocks: number;
  /** Fully-qualified contract principal, e.g. "SP3FBR2....token-contract" */
  tokenContract?: string;
}

// ── Milestone types ────────────────────────────────────────────────────

export interface MilestoneInput {
  label: string;
  /** Basis points (0-10000). All milestones must sum to 10000. */
  basisPoints: number;
}

export interface CreateMilestoneStreamParams {
  recipient: string;
  totalAmount: bigint;
  milestones: MilestoneInput[];
  /** Optional arbiter principal. Must be a registered arbiter on-chain. */
  arbiter?: string;
  /** Optional token contract principal. Omit for STX streams. */
  tokenContract?: string;
}

// ── Error mapping ──────────────────────────────────────────────────────
// Maps Clarity error codes to user-friendly strings.
// Must match define-constant err-* values in stream-core.clar and stream-conditions.clar

export const ERROR_MESSAGES: Record<number, string> = {
  // stream-core.clar (u1000–u1021)
  1000: "You are not authorised to perform this action.",
  1001: "Stream not found.",
  1002: "A stream with this ID already exists.",
  1003: "Invalid amount — must be greater than zero.",
  1004: "Invalid rate — rate per block is out of range.",
  1005: "Invalid recipient address.",
  1006: "This stream is currently paused.",
  1007: "This stream is already active.",
  1008: "Insufficient balance to complete this operation.",
  1009: "Cannot use the zero address.",
  1010: "Protocol fee exceeds the allowed maximum.",
  1011: "This stream has already expired.",
  1012: "Invalid duration — must be within the allowed range.",
  1013: "Maximum number of active streams reached.",
  1014: "The protocol is currently paused for maintenance.",
  1015: "This stream has been cancelled.",
  1016: "Invalid stream ID.",
  1017: "Invalid withdrawal — nothing to claim yet.",
  1018: "This token is not whitelisted for streaming.",
  1019: "Token transfer failed. Check your balance and allowance.",
  1020: "Fee transfer failed.",
  1021: "Contract has already been initialised.",

  // stream-conditions.clar (u2000–u2013)
  2000: "You are not authorised to perform this action.",
  2001: "Milestone stream not found.",
  2002: "Invalid total amount — must be greater than zero.",
  2003: "Invalid milestones — check labels, counts, and basis point sum.",
  2004: "Invalid milestone index.",
  2005: "This milestone has already been released.",
  2006: "Invalid arbiter — must be registered and not the sender or recipient.",
  2007: "No active dispute on this milestone.",
  2008: "A dispute is already active on this milestone.",
  2009: "This milestone stream has been cancelled.",
  2010: "Token is not whitelisted.",
  2011: "Whitelist check failed.",
  2012: "Token transfer failed.",
  2013: "Insufficient arbiter stake.",
};

/**
 * Parse an on-chain Clarity error response into a user-friendly message.
 * Falls back to a generic message if the code is unrecognised.
 */
export const parseContractError = (errorValue: unknown): string => {
  if (typeof errorValue === "number") {
    return ERROR_MESSAGES[errorValue] ?? `Unknown contract error (u${errorValue}).`;
  }
  if (typeof errorValue === "string") {
    // Try to extract error code from string like "(err u1003)"
    const match = errorValue.match(/u(\d+)/);
    if (match) {
      const code = parseInt(match[1], 10);
      return ERROR_MESSAGES[code] ?? `Unknown contract error (u${code}).`;
    }
  }
  return "An unexpected contract error occurred.";
};
