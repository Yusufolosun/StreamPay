import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { MockStacksService, MockStreamIndexer } from '../../test/mocks/stacksService.js';
import { publicRateLimiter } from '../../src/middleware/rateLimiter.js';

const originalEnv = { ...process.env };

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '32128';
  process.env.STACKS_NETWORK = 'devnet';
  process.env.HIRO_API_URL = 'http://127.0.0.1:32128';
  process.env.API_KEYS = 'testkey-123';
  process.env.CONTRACT_STREAM_CORE = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-core';
  process.env.CONTRACT_STREAM_CONDITIONS = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-conditions';
  process.env.CONTRACT_STREAM_NFT = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-nft';
  process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/streampay?schema=public';
  process.env.JWT_SECRET = '0123456789abcdef0123456789abcdef';
  process.env.CORS_ORIGINS = 'http://localhost:3000';
});

afterAll(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, originalEnv);
});

beforeEach(() => {
  if (publicRateLimiter && typeof publicRateLimiter.resetKey === 'function') {
    publicRateLimiter.resetKey('::ffff:127.0.0.1');
    publicRateLimiter.resetKey('127.0.0.1');
  }
});

describe('GET /api/streams/:id happy path', () => {
  it('should return 200 with the stream data and real-time claimable balance', async () => {
    const stacksService = new MockStacksService() as any;
    const streamIndexer = new MockStreamIndexer() as any;
    const config = loadConfig();
    const app = createApp(config, stacksService, streamIndexer);

    const res = await request(app)
      .get('/api/streams/1')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.stream).toBeDefined();
    expect(res.body.data.stream.id).toBe('1');
    expect(res.body.data.claimableBalance).toBeDefined();
  });
});

describe('GET /api/streams/:id error paths', () => {
  it('should return 404 for a non-existent stream ID', async () => {
    const stacksService = new MockStacksService() as any;
    const streamIndexer = new MockStreamIndexer() as any;
    const config = loadConfig();
    const app = createApp(config, stacksService, streamIndexer);

    const res = await request(app)
      .get('/api/streams/9999')
      .expect('Content-Type', /json/)
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('stream_not_found');
  });

  it('should return 400 for an invalid stream ID format', async () => {
    const stacksService = new MockStacksService() as any;
    const streamIndexer = new MockStreamIndexer() as any;
    const config = loadConfig();
    const app = createApp(config, stacksService, streamIndexer);

    const res = await request(app)
      .get('/api/streams/invalid')
      .expect('Content-Type', /json/)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('invalid_stream_id');
  });
});

describe('GET /api/streams listing and default pagination', () => {
  it('should return 200 with list of streams and default pagination metadata', async () => {
    const stacksService = new MockStacksService() as any;
    const streamIndexer = new MockStreamIndexer() as any;
    const config = loadConfig();
    const app = createApp(config, stacksService, streamIndexer);

    const res = await request(app)
      .get('/api/streams')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(3); // Based on fixtures.ts mockStreams count
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(20);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.totalPages).toBe(1);
  });
});

describe('GET /api/streams sender address filtering', () => {
  it('should filter streams by sender address', async () => {
    const stacksService = new MockStacksService() as any;
    const streamIndexer = new MockStreamIndexer() as any;
    const config = loadConfig();
    const app = createApp(config, stacksService, streamIndexer);

    const res = await request(app)
      .get('/api/streams')
      .query({ sender: 'SP2C578R0AER8Q81143TFEWCWJHXGYT4AK1P4GYGV' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].sender).toBe('SP2C578R0AER8Q81143TFEWCWJHXGYT4AK1P4GYGV');
    expect(res.body.data[1].sender).toBe('SP2C578R0AER8Q81143TFEWCWJHXGYT4AK1P4GYGV');
  });

  it('should return 400 for an invalid sender address format', async () => {
    const stacksService = new MockStacksService() as any;
    const streamIndexer = new MockStreamIndexer() as any;
    const config = loadConfig();
    const app = createApp(config, stacksService, streamIndexer);

    const res = await request(app)
      .get('/api/streams')
      .query({ sender: 'invalid-address-format' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('invalid_sender');
  });
});

describe('GET /api/streams status filtering', () => {
  it('should filter streams by active status', async () => {
    const stacksService = new MockStacksService() as any;
    const streamIndexer = new MockStreamIndexer() as any;
    const config = loadConfig();
    const app = createApp(config, stacksService, streamIndexer);

    const res = await request(app)
      .get('/api/streams')
      .query({ status: 'active' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].status).toBe('active');
  });

  it('should filter streams by paused status', async () => {
    const stacksService = new MockStacksService() as any;
    const streamIndexer = new MockStreamIndexer() as any;
    const config = loadConfig();
    const app = createApp(config, stacksService, streamIndexer);

    const res = await request(app)
      .get('/api/streams')
      .query({ status: 'paused' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].status).toBe('paused');
  });

  it('should filter streams by cancelled status', async () => {
    const stacksService = new MockStacksService() as any;
    const streamIndexer = new MockStreamIndexer() as any;
    const config = loadConfig();
    const app = createApp(config, stacksService, streamIndexer);

    const res = await request(app)
      .get('/api/streams')
      .query({ status: 'cancelled' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].status).toBe('cancelled');
  });

  it('should return 400 for an invalid status parameter', async () => {
    const stacksService = new MockStacksService() as any;
    const streamIndexer = new MockStreamIndexer() as any;
    const config = loadConfig();
    const app = createApp(config, stacksService, streamIndexer);

    const res = await request(app)
      .get('/api/streams')
      .query({ status: 'invalid-status' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('invalid_status');
  });
});

describe('GET /api/streams custom pagination limits', () => {
  it('should support custom page and limit parameters', async () => {
    const stacksService = new MockStacksService() as any;
    const streamIndexer = new MockStreamIndexer() as any;
    const config = loadConfig();
    const app = createApp(config, stacksService, streamIndexer);

    const res = await request(app)
      .get('/api/streams')
      .query({ page: 2, limit: 1 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].id).toBe('2'); // Stream ID 2 is the second stream
    expect(res.body.pagination.page).toBe(2);
    expect(res.body.pagination.limit).toBe(1);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.totalPages).toBe(3);
  });
});
