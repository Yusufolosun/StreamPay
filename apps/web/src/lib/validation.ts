/**
 * Validates a Stacks blockchain address.
 * Accepts both mainnet (SP) and testnet/devnet (ST) prefixes.
 */
export function isValidStacksAddress(address: string): boolean {
  if (!address || typeof address !== "string") return false;
  return /^S[PT][A-Z0-9]{20,}$/i.test(address.trim());
}

/**
 * Truncates a Stacks address for display.
 * "SP3FBR2AGK5H9Q...FEGM" → "SP3FBR...FEGM"
 */
export function truncateAddress(address: string, startLen = 6, endLen = 4): string {
  if (!address || address.length <= startLen + endLen + 3) return address;
  return `${address.slice(0, startLen)}...${address.slice(-endLen)}`;
}

/**
 * Format micro-STX to human-readable STX string.
 */
export function formatSTX(microSTX: bigint | number, decimals = 6): string {
  const value = typeof microSTX === "bigint" ? Number(microSTX) : microSTX;
  return (value / 1_000_000).toFixed(decimals);
}

/**
 * Convert STX to micro-STX (bigint).
 */
export function toMicroSTX(stx: number | string): bigint {
  const parsed = typeof stx === "string" ? parseFloat(stx) : stx;
  if (isNaN(parsed) || parsed < 0) return 0n;
  return BigInt(Math.floor(parsed * 1_000_000));
}
