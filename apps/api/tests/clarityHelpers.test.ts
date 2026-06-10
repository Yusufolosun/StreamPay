import { describe, expect, it } from 'vitest';

import {
  deserializeClarityHex,
  parseClarityRepr,
  mapEventTupleToStreamEvent,
  serializeUint,
} from '../src/services/stacksService.js';

// ─────────────────────────────────────────────────────────────────────────────
// Clarity hex deserializer
// ─────────────────────────────────────────────────────────────────────────────

describe('deserializeClarityHex', () => {
  it('deserializes a uint (tag 0x01)', () => {
    // u1000000 = 0x000000000000000000000000000F4240
    const hex = '0x01000000000000000000000000000f4240';
    const val = deserializeClarityHex(hex);
    expect(val).toBe(1_000_000n);
  });

  it('deserializes a zero uint', () => {
    const hex = '0x01' + '0'.repeat(32);
    const val = deserializeClarityHex(hex);
    expect(val).toBe(0n);
  });

  it('deserializes a very large uint (> Number.MAX_SAFE_INTEGER)', () => {
    // u10000000000000000 (10^16) > 2^53
    const bigVal = 10_000_000_000_000_000n;
    const hex = '0x01' + bigVal.toString(16).padStart(32, '0');
    const val = deserializeClarityHex(hex);
    expect(val).toBe(bigVal);
  });

  it('deserializes true (tag 0x03)', () => {
    expect(deserializeClarityHex('0x03')).toBe(true);
  });

  it('deserializes false (tag 0x04)', () => {
    expect(deserializeClarityHex('0x04')).toBe(false);
  });

  it('deserializes none (tag 0x09)', () => {
    expect(deserializeClarityHex('0x09')).toBeNull();
  });

  it('deserializes some(uint)', () => {
    // some(u42) = 0x0a + 0x01 + 42 in 16 bytes
    const inner = 42n.toString(16).padStart(32, '0');
    const hex = `0x0a01${inner}`;
    const val = deserializeClarityHex(hex);
    expect(val).toBe(42n);
  });

  it('deserializes some(none) as null', () => {
    expect(deserializeClarityHex('0x0a09')).toBeNull();
  });

  it('deserializes a list of uints', () => {
    // list of 3 uints: [1, 2, 3]
    const u1 = 1n.toString(16).padStart(32, '0');
    const u2 = 2n.toString(16).padStart(32, '0');
    const u3 = 3n.toString(16).padStart(32, '0');
    const hex = `0x0b00000003` + `01${u1}` + `01${u2}` + `01${u3}`;
    const val = deserializeClarityHex(hex);
    expect(val).toEqual([1n, 2n, 3n]);
  });

  it('deserializes an empty list', () => {
    const hex = '0x0b00000000';
    const val = deserializeClarityHex(hex);
    expect(val).toEqual([]);
  });

  it('deserializes an ASCII string (tag 0x0d)', () => {
    // "hello" = 5 bytes
    const hello = Buffer.from('hello').toString('hex');
    const hex = `0x0d00000005${hello}`;
    const val = deserializeClarityHex(hex);
    expect(val).toBe('hello');
  });

  it('deserializes a tuple (tag 0x0c)', () => {
    // Simple tuple with one key "amount" => u100
    const keyBytes = Buffer.from('amount').toString('hex');
    const keyLen = '06'; // 6 chars
    const uint = 100n.toString(16).padStart(32, '0');
    const hex = `0x0c00000001${keyLen}${keyBytes}01${uint}`;
    const val = deserializeClarityHex(hex);
    expect(val).toHaveProperty('amount');
    expect(val.amount).toBe(100n);
  });

  it('throws on unsupported Clarity tag', () => {
    expect(() => deserializeClarityHex('0xff')).toThrow('Unsupported Clarity tag');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Clarity repr parser
// ─────────────────────────────────────────────────────────────────────────────

describe('parseClarityRepr', () => {
  it('parses a tuple with string and uint values', () => {
    const repr = '(tuple (event-type "stream-created") (block-height u100))';
    const result = parseClarityRepr(repr);
    expect(result['event-type']).toBe('stream-created');
    expect(result['block-height']).toBe(100n);
  });

  it('parses boolean values', () => {
    const repr = '(tuple (is-paused true) (is-cancelled false))';
    const result = parseClarityRepr(repr);
    expect(result['is-paused']).toBe(true);
    expect(result['is-cancelled']).toBe(false);
  });

  it('parses none value', () => {
    const repr = '(tuple (token-contract none))';
    const result = parseClarityRepr(repr);
    expect(result['token-contract']).toBeNull();
  });

  it('parses some(uint) value', () => {
    const repr = '(tuple (stream-id (some u42)))';
    const result = parseClarityRepr(repr);
    expect(result['stream-id']).toBe(42n);
  });

  it('returns null for non-tuple repr', () => {
    expect(parseClarityRepr('u42')).toBeNull();
    expect(parseClarityRepr('true')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Event mapper
// ─────────────────────────────────────────────────────────────────────────────

describe('mapEventTupleToStreamEvent', () => {
  it('maps a stream-created event', () => {
    const parsed = {
      'event-type': 'stream-created',
      'stream-id': 1n,
      caller: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      'block-height': 100n,
      'deposit-amount': 5000n,
      'fee-amount': 125n,
    };

    const event = mapEventTupleToStreamEvent(parsed, '0xabc', 0);
    expect(event).not.toBeNull();
    expect(event!.eventType).toBe('stream-created');
    if (event!.eventType === 'stream-created') {
      expect(event!.streamId).toBe(1);
      expect(event!.depositAmount).toBe(5000n);
      expect(event!.feeAmount).toBe(125n);
    }
  });

  it('maps a stream-cancelled event', () => {
    const parsed = {
      'event-type': 'stream-cancelled',
      'stream-id': 5n,
      caller: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      'block-height': 200n,
      'recipient-paid': 3000n,
      'sender-refunded': 7000n,
    };

    const event = mapEventTupleToStreamEvent(parsed, '0xdef', 1);
    expect(event).not.toBeNull();
    if (event!.eventType === 'stream-cancelled') {
      expect(event!.recipientPaid).toBe(3000n);
      expect(event!.senderRefunded).toBe(7000n);
    }
  });

  it('maps a protocol-paused event with null streamId', () => {
    const parsed = {
      'event-type': 'protocol-paused',
      'stream-id': null,
      caller: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      'block-height': 500n,
    };

    const event = mapEventTupleToStreamEvent(parsed, '0x999', 0);
    expect(event).not.toBeNull();
    expect(event!.streamId).toBeNull();
  });

  it('maps a fee-updated event', () => {
    const parsed = {
      'event-type': 'fee-updated',
      'stream-id': null,
      caller: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      'block-height': 300n,
      'old-fee': 25n,
      'new-fee': 50n,
    };

    const event = mapEventTupleToStreamEvent(parsed, '0x111', 0);
    expect(event!.eventType).toBe('fee-updated');
    if (event!.eventType === 'fee-updated') {
      expect(event!.oldFee).toBe(25);
      expect(event!.newFee).toBe(50);
    }
  });

  it('maps a dispute-raised event', () => {
    const parsed = {
      'event-type': 'dispute-raised',
      'stream-id': 10n,
      caller: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      'block-height': 400n,
      'milestone-index': 2n,
    };

    const event = mapEventTupleToStreamEvent(parsed, '0x222', 0);
    expect(event!.eventType).toBe('dispute-raised');
    if (event!.eventType === 'dispute-raised') {
      expect(event!.milestoneIndex).toBe(2);
    }
  });

  it('returns null for unknown event types', () => {
    const parsed = {
      'event-type': 'unknown-event',
      'stream-id': 1n,
      caller: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      'block-height': 100n,
    };

    const event = mapEventTupleToStreamEvent(parsed, '0x000', 0);
    expect(event).toBeNull();
  });

  it('returns null when event-type is missing', () => {
    const parsed = {
      'stream-id': 1n,
      caller: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    };

    const event = mapEventTupleToStreamEvent(parsed, '0x000', 0);
    expect(event).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// serializeUint
// ─────────────────────────────────────────────────────────────────────────────

describe('serializeUint', () => {
  it('serializes 0', () => {
    const hex = serializeUint(0n);
    expect(hex).toBe('0x01' + '0'.repeat(32));
  });

  it('serializes 1', () => {
    const hex = serializeUint(1n);
    expect(hex).toBe('0x01' + '0'.repeat(31) + '1');
  });

  it('serializes a large value', () => {
    const hex = serializeUint(1_000_000n);
    expect(hex).toMatch(/^0x01/);
    expect(hex.length).toBe(36); // 0x01 + 32 hex chars
  });

  it('accepts a number argument', () => {
    const hex = serializeUint(42);
    expect(hex).toBe(serializeUint(42n));
  });
});
