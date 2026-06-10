import { c32addressDecode } from 'c32check';

/**
 * Validates a Stacks address using c32check decoding.
 * Returns true if the address is a valid STX principal (standard address).
 */
export const isValidStacksAddress = (address: string): boolean => {
  if (typeof address !== 'string' || address.length === 0) {
    return false;
  }

  // Must start with SP (mainnet) or ST (testnet)
  if (!address.startsWith('SP') && !address.startsWith('ST')) {
    return false;
  }

  try {
    const [version] = c32addressDecode(address);
    // Standard mainnet: 22, Standard testnet: 26
    // Multisig mainnet: 20, Multisig testnet: 21
    return [22, 26, 20, 21].includes(version);
  } catch {
    return false;
  }
};

/**
 * Validates a stream ID parameter from route params.
 * Must be a positive integer less than 10,000,000.
 */
export const parseStreamId = (raw: string): number | null => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 0 || id >= 10_000_000) {
    return null;
  }
  return id;
};
