import { createServer } from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import type { StreamIndexEntry } from '../src/services/streamIndexer.js';
import type { OnChainMilestoneStream } from '../src/types/stacks.js';

describe('Streams, Milestones and Stats Routes', () => {
  let apiServer = createServer();
  let apiPort = 0;
  let stacksServiceMock: any;
  let streamIndexerMock: any;
  const originalEnv = { ...process.env };

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

  const mockStreams: StreamIndexEntry[] = [
    {
      id: 1,
      sender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      recipient: 'ST2C578R0AER8Q81143TFEWCWJHXGYT4AK00SES79',
      tokenContract: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sip-010-token',
      depositAmount: 1000n,
      ratePerBlock: 10n,
      startBlock: 100,
      endBlock: 200,
      claimedAmount: 200n,
      pausedAtBlock: null,
      cancelledAtBlock: null,
      isPaused: false,
      isCancelled: false,
      createdAt: 1620000000,
    },
    {
      id: 2,
      sender: 'ST2C578R0AER8Q81143TFEWCWJHXGYT4AK00SES79',
      recipient: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      tokenContract: null,
      depositAmount: 5000n,
      ratePerBlock: 50n,
      startBlock: 110,
      endBlock: 210,
      claimedAmount: 0n,
      pausedAtBlock: 115,
      cancelledAtBlock: null,
      isPaused: true,
      isCancelled: false,
      createdAt: 1620000100,
    },
  ];

  const mockMilestoneStreams: Record<number, OnChainMilestoneStream> = {
    1: {
      sender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      recipient: 'ST2C578R0AER8Q81143TFEWCWJHXGYT4AK00SES79',
      arbiter: 'ST2ANPCGYA3YB7SMYQ7JBS35S88349RADBFGG78Y4',
      totalAmount: 10000n,
      tokenContract: null,
      milestones: [
        { label: 'M1', basisPoints: 3000, isReleased: true, releasedAt: 105 },
        { label: 'M2', basisPoints: 7000, isReleased: false, releasedAt: null },
      ],
      isCancelled: false,
      createdAt: 1620000200,
    },
    2: {
      sender: 'ST2C578R0AER8Q81143TFEWCWJHXGYT4AK00SES79',
      recipient: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      arbiter: null,
      totalAmount: 20000n,
      tokenContract: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sip-010-token',
      milestones: [
        { label: 'Milestone A', basisPoints: 5000, isReleased: false, releasedAt: null },
        { label: 'Milestone B', basisPoints: 5000, isReleased: false, releasedAt: null },
      ],
      isCancelled: true,
      createdAt: 1620000300,
    },
  };

  beforeAll(async () => {
    process.env.PORT = '32126';
    process.env.NODE_ENV = 'test';
    process.env.STACKS_NETWORK = 'devnet';
    process.env.HIRO_API_URL = 'http://127.0.0.1:32126';
    process.env.API_KEYS = 'testkey-123';
    process.env.CONTRACT_STREAM_CORE = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-core';
    process.env.CONTRACT_STREAM_CONDITIONS =
      'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-conditions';
    process.env.CONTRACT_STREAM_NFT = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-nft';
    process.env.DATABASE_URL =
      'postgresql://postgres:password@localhost:5432/streampay?schema=public';
    process.env.JWT_SECRET = '0123456789abcdef0123456789abcdef';
    process.env.CORS_ORIGINS = 'http://localhost:3000';

    stacksServiceMock = {
      getHealth: vi.fn().mockResolvedValue({ reachable: true, blockHeight: 120 }),
      getCurrentBlockHeight: vi.fn().mockResolvedValue(120),
      getMilestoneStreamIdNonce: vi.fn().mockResolvedValue(2),
      getMilestoneStream: vi
        .fn()
        .mockImplementation(async (id) => mockMilestoneStreams[id] || null),
    };

    streamIndexerMock = {
      getCursor: vi.fn().mockReturnValue(120),
      getIsRunning: vi.fn().mockReturnValue(true),
      getHealth: vi.fn().mockResolvedValue({ status: 'ok', cursor: 120, tip: 120, lag: 0 }),
      getStream: vi.fn().mockImplementation((id) => mockStreams.find((s) => s.id === id)),
      getStreams: vi.fn().mockReturnValue(mockStreams),
      getSenderStreams: vi
        .fn()
        .mockImplementation((sender) => mockStreams.filter((s) => s.sender === sender)),
      getRecipientStreams: vi
        .fn()
        .mockImplementation((recipient) => mockStreams.filter((s) => s.recipient === recipient)),
      getStreamView: vi.fn().mockImplementation(async (id) => {
        const stream = mockStreams.find((s) => s.id === id);
        return stream
          ? {
              ...stream,
              depositAmount: stream.depositAmount.toString(),
              claimedAmount: stream.claimedAmount.toString(),
            }
          : null;
      }),
      getStreamViews: vi.fn().mockImplementation(async (entries) => {
        return entries.map((stream: any) => ({
          ...stream,
          depositAmount: stream.depositAmount.toString(),
          claimedAmount: stream.claimedAmount.toString(),
        }));
      }),
      getStreamHistory: vi
        .fn()
        .mockImplementation((id) => [
          {
            eventType: 'stream-created',
            streamId: id,
            blockHeight: 100,
            txId: 'tx-1',
            eventIndex: 0,
            caller: 'ST1',
          },
        ]),
      getStreamCount: vi.fn().mockReturnValue(2),
      getActiveStreamCount: vi.fn().mockReturnValue(1),
      getTotalVolume: vi.fn().mockReturnValue(6000n),
      getIsProtocolPaused: vi.fn().mockReturnValue(false),
    };

    const config = loadConfig();
    apiServer = createServer(createApp(config, stacksServiceMock, streamIndexerMock));
    apiPort = await listen(apiServer);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => apiServer.close(() => resolve()));
    // Restore env
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  describe('GET /api/streams', () => {
    it('lists all streams paginated with default limit', async () => {
      const res = await fetch(`http://127.0.0.1:${apiPort}/api/streams`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
      expect(body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
      expect(res.headers.get('etag')).toBeDefined();
    });

    it('filters streams by sender address', async () => {
      const res = await fetch(
        `http://127.0.0.1:${apiPort}/api/streams?sender=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM`,
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(1);
    });

    it('filters streams by active status', async () => {
      const res = await fetch(`http://127.0.0.1:${apiPort}/api/streams?status=active`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(1);
    });

    it('returns 400 for invalid Stacks address in query', async () => {
      const res = await fetch(`http://127.0.0.1:${apiPort}/api/streams?sender=invalid-addr`);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe('invalid_sender');
    });
  });

  describe('GET /api/streams/:id', () => {
    it('returns stream details with claimable balance', async () => {
      const res = await fetch(`http://127.0.0.1:${apiPort}/api/streams/1`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.stream.id).toBe(1);
      expect(body.data.claimableBalance).toBe('0'); // 120 block cursor, start: 100, end: 200, deposit: 1000, rate: 10 -> (20 * 10) - 200 claimed = 0
    });

    it('returns 404 for non-existent stream ID', async () => {
      const res = await fetch(`http://127.0.0.1:${apiPort}/api/streams/999`);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.code).toBe('stream_not_found');
    });

    it('returns 400 for malformed stream ID', async () => {
      const res = await fetch(`http://127.0.0.1:${apiPort}/api/streams/abc`);
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/streams/:id/history', () => {
    it('returns event history chronologically', async () => {
      const res = await fetch(`http://127.0.0.1:${apiPort}/api/streams/1/history`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].eventType).toBe('stream-created');
    });
  });

  describe('GET /api/streams/:id/balance', () => {
    it('returns detailed balance projection and status', async () => {
      const res = await fetch(`http://127.0.0.1:${apiPort}/api/streams/1/balance`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        claimable: '0',
        totalDeposited: '1000',
        totalClaimed: '200',
        percentClaimed: 20,
      });
      expect(body.data.progress).toBeDefined();
      expect(body.data.progress.percentComplete).toBe(20);
    });
  });

  describe('GET /api/stats', () => {
    it('returns aggregated global stats', async () => {
      const res = await fetch(`http://127.0.0.1:${apiPort}/api/stats`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual({
        totalStreams: 2,
        activeStreams: 1,
        totalVolume: '6000',
        isProtocolPaused: false,
        blockHeight: 120,
      });
    });
  });

  describe('GET /api/milestones', () => {
    it('returns all milestone streams paginated with amounts', async () => {
      const res = await fetch(`http://127.0.0.1:${apiPort}/api/milestones`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
      expect(body.data[0].milestones[0]).toMatchObject({
        label: 'M1',
        basisPoints: 3000,
        amount: '3000', // 30% of 10000
      });
    });

    it('filters milestone streams by participant', async () => {
      const res = await fetch(
        `http://127.0.0.1:${apiPort}/api/milestones?participant=ST2C578R0AER8Q81143TFEWCWJHXGYT4AK00SES79`,
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      // Both milestone streams have ST2 as sender/recipient
      expect(body.data).toHaveLength(2);
    });

    it('filters milestone streams by arbiter', async () => {
      const res = await fetch(
        `http://127.0.0.1:${apiPort}/api/milestones?arbiter=ST2ANPCGYA3YB7SMYQ7JBS35S88349RADBFGG78Y4`,
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(1);
    });
  });

  describe('GET /api/milestones/:id', () => {
    it('returns full milestone stream details', async () => {
      const res = await fetch(`http://127.0.0.1:${apiPort}/api/milestones/1`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(1);
      expect(body.data.milestones).toHaveLength(2);
    });

    it('returns 404 for non-existent milestone stream ID', async () => {
      const res = await fetch(`http://127.0.0.1:${apiPort}/api/milestones/99`);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/milestones/:id/releasable', () => {
    it('returns indices of not yet released milestones for active stream', async () => {
      const res = await fetch(`http://127.0.0.1:${apiPort}/api/milestones/1/releasable`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual([1]); // M1 is released (index 0), M2 is not released (index 1)
    });

    it('returns empty array for cancelled milestone stream', async () => {
      const res = await fetch(`http://127.0.0.1:${apiPort}/api/milestones/2/releasable`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual([]); // Stream 2 is cancelled, so no milestones are releasable
    });
  });
});
