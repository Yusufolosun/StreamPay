import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { MockStacksService, MockStreamIndexer } from '../../test/mocks/stacksService.js';

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

describe('API Health Endpoint', () => {
  it('GET /health returns basic health information', async () => {
    const stacksService = new MockStacksService() as any;
    const streamIndexer = new MockStreamIndexer() as any;
    const config = loadConfig();
    const app = createApp(config, stacksService, streamIndexer);

    const res = await request(app)
      .get('/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body.stacks_node_reachable).toBe(true);
    expect(res.body.block_height).toBe(120);
    expect(typeof res.body.uptime).toBe('number');
  });
});
