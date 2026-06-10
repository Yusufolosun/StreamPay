import { describe, expect, it } from 'vitest';
import { isValidStacksAddress, parseStreamId } from '../src/utils/validation.js';

describe('validation utilities', () => {
  describe('isValidStacksAddress', () => {
    it('returns true for valid standard Stacks mainnet addresses', () => {
      // standard mainnet: SP... (version 22)
      expect(isValidStacksAddress('SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R')).toBe(true);
    });

    it('returns true for valid standard Stacks testnet addresses', () => {
      // standard testnet: ST... (version 26)
      expect(isValidStacksAddress('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM')).toBe(true);
    });

    it('returns false for invalid prefix', () => {
      expect(isValidStacksAddress('SM1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM')).toBe(false);
    });

    it('returns false for invalid characters', () => {
      // contains I or O or L which aren't in base32
      expect(isValidStacksAddress('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGI')).toBe(false);
    });

    it('returns false for non-string or empty input', () => {
      expect(isValidStacksAddress('')).toBe(false);
      expect(isValidStacksAddress(null as any)).toBe(false);
    });
  });

  describe('parseStreamId', () => {
    it('parses valid stream IDs', () => {
      expect(parseStreamId('123')).toBe(123);
      expect(parseStreamId('0')).toBe(0);
    });

    it('returns null for negative values', () => {
      expect(parseStreamId('-1')).toBe(null);
    });

    it('returns null for non-integer inputs', () => {
      expect(parseStreamId('1.5')).toBe(null);
      expect(parseStreamId('abc')).toBe(null);
    });

    it('returns null for overly large values', () => {
      expect(parseStreamId('10000000')).toBe(null); // 10 million limit
    });
  });
});
