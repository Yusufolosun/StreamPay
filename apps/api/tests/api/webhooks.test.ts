import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { MockStacksService, MockStreamIndexer } from '../../test/mocks/stacksService.js';
import { WebhookService } from '../../src/services/webhookService.js';
import { publicRateLimiter } from '../../src/middleware/rateLimiter.js';

const originalEnv = { ...process.env };
const testWebhooksFile = path.join(process.cwd(), 'data', 'webhooks-test.json');

beforeAll(async () => {
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

  await fs.rm(testWebhooksFile, { force: true }).catch(() => {});
});

afterAll(async () => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, originalEnv);
  await fs.rm(testWebhooksFile, { force: true }).catch(() => {});
});

beforeEach(async () => {
  if (publicRateLimiter && typeof publicRateLimiter.resetKey === 'function') {
    publicRateLimiter.resetKey('::ffff:127.0.0.1');
    publicRateLimiter.resetKey('127.0.0.1');
  }
  await fs.rm(testWebhooksFile, { force: true }).catch(() => {});
});

describe('POST /api/webhooks/subscribe happy path', () => {
  it('should successfully subscribe to webhooks', async () => {
    const stacksService = new MockStacksService() as any;
    const streamIndexer = new MockStreamIndexer() as any;
    const webhookService = new WebhookService(testWebhooksFile);
    await webhookService.init();

    const config = loadConfig();
    const app = createApp(config, stacksService, streamIndexer, webhookService);

    const res = await request(app)
      .post('/api/webhooks/subscribe')
      .set('Authorization', 'Bearer testkey-123')
      .send({
        url: 'https://example.com/webhook',
        events: ['stream-created'],
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.url).toBe('https://example.com/webhook');
    expect(res.body.data.events).toEqual(['stream-created']);
    expect(res.body.data.isActive).toBe(true);
    expect(res.body.data.consecutiveFailures).toBe(0);
    expect(typeof res.body.data.secret).toBe('string');
  });
});
