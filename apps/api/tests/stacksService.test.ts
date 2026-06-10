import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { StacksService } from '../src/services/stacksService.js';
import { StacksServiceError } from '../src/types/stacks.js';

// ─────────────────────────────────────────────────────────────────────────────
// Mock Hiro API server
// ─────────────────────────────────────────────────────────────────────────────

type MockHandler = (req: IncomingMessage, res: ServerResponse) => void;
let mockHandler: MockHandler = () => {};

let mockServer = createServer();
let mockPort = 0;
let service: StacksService;

const CONTRACT_CORE = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-core';
const CONTRACT_CONDITIONS = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-conditions';

const listen = (server: ReturnType<typeof createServer>): Promise<number> => {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, () => {
      const address = server.address();
      if (address == null || typeof address === 'string') {
        reject(new Error('Failed to bind test server'));
        return;
      }
      resolve(address.port);
    });
  });
};

const jsonResponse = (res: ServerResponse, data: unknown, status = 200): void => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(data));
};

beforeAll(async () => {
  mockServer = createServer((req, res) => {
    mockHandler(req, res);
  });
  mockPort = await listen(mockServer);
  service = new StacksService(
    `http://127.0.0.1:${mockPort}`,
    null,
    CONTRACT_CORE,
    CONTRACT_CONDITIONS,
  );
});

afterAll(async () => {
  await new Promise<void>((resolve) => mockServer.close(() => resolve()));
});

beforeEach(() => {
  service.clearCache();
});

afterEach(() => {
  mockHandler = () => {};
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build a hex-encoded Clarity uint (tag 0x01 + 16 bytes big-endian)
// ─────────────────────────────────────────────────────────────────────────────

function clarityUintHex(val: bigint): string {
  const hex = val.toString(16).padStart(32, '0');
  return `0x01${hex}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build a hex-encoded Clarity optional-none (tag 0x09)
// ─────────────────────────────────────────────────────────────────────────────

function clarityNoneHex(): string {
  return '0x09';
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build a hex-encoded Clarity bool
// ─────────────────────────────────────────────────────────────────────────────

function clarityBoolHex(val: boolean): string {
  return val ? '0x03' : '0x04';
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('StacksServiceError', () => {
  it('stores code, message, and retryable flag', () => {
    const err = new StacksServiceError('NETWORK_ERROR', 'timeout', true);
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.message).toBe('timeout');
    expect(err.retryable).toBe(true);
    expect(err.name).toBe('StacksServiceError');
  });

  it('stores a non-retryable error', () => {
    const err = new StacksServiceError('NOT_FOUND', 'not found', false);
    expect(err.retryable).toBe(false);
  });

  it('inherits from Error', () => {
    const err = new StacksServiceError('TEST', 'test', false);
    expect(err).toBeInstanceOf(Error);
  });
});

describe('getCurrentBlockHeight', () => {
  it('fetches block height from status endpoint', async () => {
    mockHandler = (_req, res) => {
      jsonResponse(res, { stacks_tip_height: 42_000 });
    };

    const height = await service.getCurrentBlockHeight();
    expect(height).toBe(42_000);
  });

  it('caches block height for subsequent calls', async () => {
    let callCount = 0;
    mockHandler = (_req, res) => {
      callCount++;
      jsonResponse(res, { stacks_tip_height: 42_000 });
    };

    await service.getCurrentBlockHeight();
    await service.getCurrentBlockHeight();
    expect(callCount).toBe(1);
  });

  it('returns cached value within 5s TTL window', async () => {
    let currentHeight = 100;
    mockHandler = (_req, res) => {
      jsonResponse(res, { stacks_tip_height: currentHeight });
    };

    const first = await service.getCurrentBlockHeight();
    currentHeight = 200;
    const second = await service.getCurrentBlockHeight();

    expect(first).toBe(100);
    expect(second).toBe(100); // still cached
  });
});

describe('getHealth', () => {
  it('returns reachable=true with block height when API is up', async () => {
    mockHandler = (_req, res) => {
      jsonResponse(res, { stacks_tip_height: 12_345 });
    };

    const health = await service.getHealth();
    expect(health.reachable).toBe(true);
    expect(health.blockHeight).toBe(12_345);
  });

  it('returns reachable=false when API is down', async () => {
    mockHandler = (_req, res) => {
      res.destroy();
    };

    const health = await service.getHealth();
    expect(health.reachable).toBe(false);
    expect(health.blockHeight).toBe(0);
  });
});

describe('getStreamById', () => {
  it('returns null for a non-existent stream', async () => {
    mockHandler = (_req, res) => {
      jsonResponse(res, { okay: true, result: clarityNoneHex() });
    };

    const stream = await service.getStreamById(999);
    expect(stream).toBeNull();
  });

  it('caches stream data', async () => {
    let callCount = 0;
    mockHandler = (_req, res) => {
      callCount++;
      jsonResponse(res, { okay: true, result: clarityNoneHex() });
    };

    await service.getStreamById(1);
    await service.getStreamById(1);
    expect(callCount).toBe(1);
  });
});

describe('getClaimableBalance', () => {
  it('returns a bigint balance', async () => {
    mockHandler = (_req, res) => {
      jsonResponse(res, {
        okay: true,
        result: clarityUintHex(1_000_000n),
      });
    };

    const balance = await service.getClaimableBalance(1);
    expect(typeof balance).toBe('bigint');
    expect(balance).toBe(1_000_000n);
  });

  it('handles zero balance', async () => {
    mockHandler = (_req, res) => {
      jsonResponse(res, {
        okay: true,
        result: clarityUintHex(0n),
      });
    };

    const balance = await service.getClaimableBalance(2);
    expect(balance).toBe(0n);
  });
});

describe('getAddressStreams', () => {
  it('returns sent and received stream ID arrays', async () => {
    mockHandler = (req, res) => {
      const url = req.url || '';
      // Build a Clarity list hex: tag 0x0b + uint32 length + items
      if (url.includes('get-sender-streams')) {
        // list of 2 uints: [1, 3]
        const item1 = 1n.toString(16).padStart(32, '0');
        const item2 = 3n.toString(16).padStart(32, '0');
        const listHex = `0x0b00000002` + `01${item1}` + `01${item2}`;
        jsonResponse(res, { okay: true, result: listHex });
      } else if (url.includes('get-recipient-streams')) {
        // list of 1 uint: [2]
        const item1 = 2n.toString(16).padStart(32, '0');
        const listHex = `0x0b00000001` + `01${item1}`;
        jsonResponse(res, { okay: true, result: listHex });
      } else {
        res.writeHead(404);
        res.end();
      }
    };

    const result = await service.getAddressStreams('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM');
    expect(result.sent).toEqual([1, 3]);
    expect(result.received).toEqual([2]);
  });

  it('returns empty arrays when no streams exist', async () => {
    mockHandler = (_req, res) => {
      const emptyList = `0x0b00000000`;
      jsonResponse(res, { okay: true, result: emptyList });
    };

    const result = await service.getAddressStreams('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM');
    expect(result.sent).toEqual([]);
    expect(result.received).toEqual([]);
  });
});

describe('getContractEvents', () => {
  it('parses events with hex values', async () => {
    mockHandler = (_req, res) => {
      jsonResponse(res, {
        results: [
          {
            event_type: 'smart_contract_log',
            tx_id: '0xabc123',
            event_index: 0,
            block_height: 100,
            contract_log: {
              value: {
                repr: '(tuple (event-type "stream-created") (stream-id (some u1)) (caller \'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM) (block-height u100) (deposit-amount u5000) (fee-amount u125))',
              },
            },
          },
        ],
      });
    };

    const events = await service.getContractEvents(CONTRACT_CORE, { limit: 10 });
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('stream-created');
    if (events[0].eventType === 'stream-created') {
      expect(events[0].streamId).toBe(1);
      expect(events[0].depositAmount).toBe(5000n);
      expect(events[0].feeAmount).toBe(125n);
    }
  });

  it('skips non-contract-log events', async () => {
    mockHandler = (_req, res) => {
      jsonResponse(res, {
        results: [
          {
            event_type: 'stx_transfer',
            tx_id: '0xfff',
            event_index: 0,
          },
        ],
      });
    };

    const events = await service.getContractEvents(CONTRACT_CORE);
    expect(events).toHaveLength(0);
  });

  it('handles pagination parameters', async () => {
    let capturedUrl = '';
    mockHandler = (req, res) => {
      capturedUrl = req.url || '';
      jsonResponse(res, { results: [] });
    };

    await service.getContractEvents(CONTRACT_CORE, { limit: 5, offset: 10 });
    expect(capturedUrl).toContain('limit=5');
    expect(capturedUrl).toContain('offset=10');
  });
});

describe('error handling and retry', () => {
  it('retries on 5xx errors', async () => {
    let callCount = 0;
    mockHandler = (_req, res) => {
      callCount++;
      if (callCount < 3) {
        jsonResponse(res, { error: 'Internal Server Error' }, 500);
      } else {
        jsonResponse(res, { stacks_tip_height: 99_999 });
      }
    };

    const height = await service.getCurrentBlockHeight();
    expect(height).toBe(99_999);
    expect(callCount).toBe(3);
  });

  it('does not retry on 4xx errors', async () => {
    let callCount = 0;
    mockHandler = (_req, res) => {
      callCount++;
      jsonResponse(res, { error: 'Bad Request' }, 400);
    };

    await expect(service.getClaimableBalance(999)).rejects.toThrow(StacksServiceError);
    expect(callCount).toBe(1);
  });

  it('retries on 429 rate limit errors', async () => {
    let callCount = 0;
    mockHandler = (_req, res) => {
      callCount++;
      if (callCount === 1) {
        jsonResponse(res, { error: 'Rate limited' }, 429);
      } else {
        jsonResponse(res, {
          okay: true,
          result: clarityUintHex(42n),
        });
      }
    };

    const balance = await service.getClaimableBalance(5);
    expect(balance).toBe(42n);
    expect(callCount).toBe(2);
  });

  it('throws after max retries', async () => {
    mockHandler = (_req, res) => {
      jsonResponse(res, { error: 'Internal Server Error' }, 500);
    };

    await expect(service.getClaimableBalance(999)).rejects.toThrow(StacksServiceError);
  });
});

describe('cache invalidation', () => {
  it('invalidateStreamCache clears stream and claimable cache', async () => {
    let callCount = 0;
    mockHandler = (_req, res) => {
      callCount++;
      jsonResponse(res, { okay: true, result: clarityNoneHex() });
    };

    await service.getStreamById(1);
    expect(callCount).toBe(1);

    // should be cached
    await service.getStreamById(1);
    expect(callCount).toBe(1);

    // invalidate
    service.invalidateStreamCache(1);

    // should fetch again
    await service.getStreamById(1);
    expect(callCount).toBe(2);
  });

  it('clearCache clears all cached data', async () => {
    let callCount = 0;
    mockHandler = (_req, res) => {
      callCount++;
      jsonResponse(res, { stacks_tip_height: 50_000 });
    };

    await service.getCurrentBlockHeight();
    expect(callCount).toBe(1);

    service.clearCache();

    await service.getCurrentBlockHeight();
    expect(callCount).toBe(2);
  });
});
