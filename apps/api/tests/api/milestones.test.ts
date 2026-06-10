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

describe('GET /api/milestones/:id happy path', () => {
  it('should return 200 with the milestone stream data', async () => {
    const stacksService = new MockStacksService() as any;
    const streamIndexer = new MockStreamIndexer() as any;
    const config = loadConfig();
    const app = createApp(config, stacksService, streamIndexer);

    const res = await request(app)
      .get('/api/milestones/1')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBe(1);
    expect(res.body.data.totalAmount).toBe('10000');
    expect(res.body.data.sender).toBe('SP2C578R0AER8Q81143TFEWCWJHXGYT4AK1P4GYGV');
    expect(res.body.data.recipient).toBe('SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R');
    expect(res.body.data.arbiter).toBe('SP2ANPCGYA3YB7SMYQ7JBS35S88349RADBCQNJ92J');
  });

  it('should return 404 for a non-existent milestone stream ID', async () => {
    const stacksService = new MockStacksService() as any;
    const streamIndexer = new MockStreamIndexer() as any;
    const config = loadConfig();
    const app = createApp(config, stacksService, streamIndexer);

    const res = await request(app)
      .get('/api/milestones/9999')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('milestone_stream_not_found');
  });
});
