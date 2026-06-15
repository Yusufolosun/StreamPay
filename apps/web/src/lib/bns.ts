import { isValidStacksAddress } from "./validation";

const cache = new Map<string, { value: string | null; expiresAt: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 60 minutes in milliseconds

function getHiroApiUrl(): string {
  if (process.env.NEXT_PUBLIC_HIRO_API_URL) {
    return process.env.NEXT_PUBLIC_HIRO_API_URL;
  }
  const network = process.env.NEXT_PUBLIC_STACKS_NETWORK || "devnet";
  if (network === "mainnet") return "https://api.mainnet.hiro.so";
  if (network === "testnet") return "https://api.testnet.hiro.so";
  return "http://localhost:3999";
}

/**
 * Resolves a .btc name to a Stacks address via Hiro BNS API.
 * Caches the result for 60 minutes. Returns null if resolution fails.
 */
export async function resolveName(name: string): Promise<string | null> {
  const cleanName = name.trim().toLowerCase();
  if (!cleanName.endsWith(".btc")) {
    return null;
  }

  const cacheKey = `name-${cleanName}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const api = getHiroApiUrl();
    const res = await fetch(`${api}/v1/names/${cleanName}`);
    if (res.ok) {
      const data = await res.json();
      const address = data.address || null;
      cache.set(cacheKey, { value: address, expiresAt: Date.now() + CACHE_DURATION });
      return address;
    }
  } catch (error) {
    console.error(`Error resolving BNS name ${cleanName}:`, error);
  }

  return null;
}

/**
 * Performs a reverse lookup of a Stacks address to find its registered .btc name.
 * Caches the result for 60 minutes.
 */
export async function lookupName(address: string): Promise<string | null> {
  const cleanAddress = address.trim();
  if (!isValidStacksAddress(cleanAddress)) {
    return null;
  }

  const cacheKey = `address-${cleanAddress}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const api = getHiroApiUrl();
    const res = await fetch(`${api}/v1/addresses/stacks/${cleanAddress}/names`);
    if (res.ok) {
      const data = await res.json();
      const name = (data.names?.[0] as string) || null;
      cache.set(cacheKey, { value: name, expiresAt: Date.now() + CACHE_DURATION });
      return name;
    }
  } catch (error) {
    console.error(`Error looking up BNS name for address ${cleanAddress}:`, error);
  }

  return null;
}

/**
 * Checks if input is a valid Stacks address or a name ending in .btc.
 */
export function isValidInput(input: string): boolean {
  if (!input || typeof input !== "string") return false;
  const val = input.trim();
  return isValidStacksAddress(val) || val.toLowerCase().endsWith(".btc");
}

/**
 * Resolves input name to Stacks address if it is a .btc name.
 * If input is already a valid address, returns it as-is.
 * Otherwise, throws an INVALID_ADDRESS error.
 */
export async function resolveOrValidate(input: string, network?: any): Promise<string> {
  const val = input.trim();
  if (val.toLowerCase().endsWith(".btc")) {
    const resolved = await resolveName(val);
    if (!resolved) {
      throw new Error("INVALID_ADDRESS");
    }
    return resolved;
  }

  if (isValidStacksAddress(val)) {
    return val;
  }

  throw new Error("INVALID_ADDRESS");
}
