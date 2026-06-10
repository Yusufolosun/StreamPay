/* -----------------------------------------------------------------------
 * StreamPay — Application Constants
 * ----------------------------------------------------------------------- */

/** Blocks per day on Stacks (~10 min per block) */
export const BLOCKS_PER_DAY = 144;

/** Protocol fee in basis points (0.25%) */
export const PROTOCOL_FEE_BPS = 25;

/** Maximum number of milestones per stream */
export const MAX_MILESTONES = 10;

/** Minimum number of milestones per stream */
export const MIN_MILESTONES = 1;

/** Basis points denominator used in Clarity contracts */
export const BPS_DENOMINATOR = 10_000;

/** Default contract addresses — overridden by env vars at runtime */
export const DEFAULT_STREAM_CORE =
  "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-core";

export const DEFAULT_STREAM_CONDITIONS =
  "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-conditions";

export const DEFAULT_STREAM_NFT =
  "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-nft";

/** Supported tokens for the v1 UI */
export const SUPPORTED_TOKENS = [
  { symbol: "STX", name: "Stacks", contract: "", icon: "S", decimals: 6 },
  { symbol: "sBTC", name: "Stacks BTC", contract: "sbtc", icon: "₿", decimals: 8 },
] as const;

/** Duration presets for continuous stream forms */
export const DURATION_PRESETS = [
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;
