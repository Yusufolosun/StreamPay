import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import http from 'node:http';
import { createHmac } from 'node:crypto';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { MockStacksService, MockStreamIndexer } from '../../test/mocks/stacksService.js';
import { WebhookService } from '../../src/services/webhookService.js';
import { publicRateLimiter } from '../../src/middleware/rateLimiter.js';
import { type StreamEvent } from '../../src/types/stacks.js';

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

describe('POST /api/webhooks/subscribe HTTPS and event validation', () => {
  it('should reject non-HTTPS URLs in production environment', async () => {
    const stacksService = new MockStacksService() as any;
    const streamIndexer = new MockStreamIndexer() as any;
    const webhookService = new WebhookService(testWebhooksFile);
    await webhookService.init();

    const config = loadConfig();
    const app = createApp(config, stacksService, streamIndexer, webhookService);

    // Set production to enforce HTTPS-only
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const res = await request(app)
        .post('/api/webhooks/subscribe')
        .set('Authorization', 'Bearer testkey-123')
        .send({
          url: 'http://example.com/webhook',
          events: ['stream-created'],
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('invalid_url');
      expect(res.body.error.message).toContain('HTTPS-only');
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });

  it('should reject invalid event types', async () => {
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
        events: ['invalid-event'],
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('invalid_event_type');
    expect(res.body.error.message).toContain('not supported');
  });
});

describe('POST /api/webhooks/subscribe authentication', () => {
  it('should reject request without API key', async () => {
    const stacksService = new MockStacksService() as any;
    const streamIndexer = new MockStreamIndexer() as any;
    const webhookService = new WebhookService(testWebhooksFile);
    await webhookService.init();

    const config = loadConfig();
    const app = createApp(config, stacksService, streamIndexer, webhookService);

    const res = await request(app)
      .post('/api/webhooks/subscribe')
      .send({
        url: 'https://example.com/webhook',
        events: ['stream-created'],
      })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('MISSING_API_KEY');
  });

  it('should reject request with invalid API key', async () => {
    const stacksService = new MockStacksService() as any;
    const streamIndexer = new MockStreamIndexer() as any;
    const webhookService = new WebhookService(testWebhooksFile);
    await webhookService.init();

    const config = loadConfig();
    const app = createApp(config, stacksService, streamIndexer, webhookService);

    const res = await request(app)
      .post('/api/webhooks/subscribe')
      .set('Authorization', 'Bearer invalid-key')
      .send({
        url: 'https://example.com/webhook',
        events: ['stream-created'],
      })
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_API_KEY');
  });
});

describe('DELETE /api/webhooks/:id', () => {
  it('should delete (deactivate) an existing subscription', async () => {
    const stacksService = new MockStacksService() as any;
    const streamIndexer = new MockStreamIndexer() as any;
    const webhookService = new WebhookService(testWebhooksFile);
    await webhookService.init();
    vi.spyOn(webhookService, 'init').mockResolvedValue(undefined);

    // Directly insert a sub using the service
    const sub = await webhookService.createSubscription('https://example.com/webhook', ['stream-created']);

    const config = loadConfig();
    const app = createApp(config, stacksService, streamIndexer, webhookService);

    // Call DELETE
    const delRes = await request(app)
      .delete(`/api/webhooks/${sub.id}`)
      .set('Authorization', 'Bearer testkey-123')
      .expect(200);

    expect(delRes.body.success).toBe(true);
    expect(delRes.body.deleted).toBe(true);

    // Verify it is gone via GET
    const getRes = await request(app)
      .get(`/api/webhooks/${sub.id}`)
      .set('Authorization', 'Bearer testkey-123')
      .expect(404);

    expect(getRes.body.success).toBe(false);
    expect(getRes.body.error.code).toBe('subscription_not_found');
  });

  it('should return 404 for deleting a non-existent subscription', async () => {
    const stacksService = new MockStacksService() as any;
    const streamIndexer = new MockStreamIndexer() as any;
    const webhookService = new WebhookService(testWebhooksFile);
    await webhookService.init();

    const config = loadConfig();
    const app = createApp(config, stacksService, streamIndexer, webhookService);

    const res = await request(app)
      .delete('/api/webhooks/sub_nonexistent')
      .set('Authorization', 'Bearer testkey-123')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('subscription_not_found');
  });
});

describe('Webhook Delivery & Signature Verification', () => {
  it('should deliver webhook with valid HMAC signature to a local HTTP server', async () => {
    let resolveVerification: (value: any) => void;
    const verificationPromise = new Promise((resolve) => {
      resolveVerification = resolve;
    });

    const event: StreamEvent = {
      eventType: 'stream-created',
      txId: '0x1234567890abcdef',
      blockHeight: 120,
      timestamp: Date.now(),
      data: {
        streamId: 1,
        sender: 'SP2C578R0AER8Q81143TFEWCWJHXGYT4AK1P4GYGV',
        recipient: 'SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R',
        deposit: 10000n as any,
        startBlock: 100,
        stopBlock: 200,
      },
    };

    let receivedHeaders: http.IncomingHttpHeaders | null = null;
    let receivedBody = '';

    const server = http.createServer((req, res) => {
      receivedHeaders = req.headers;
      
      req.on('data', (chunk) => {
        receivedBody += chunk;
      });

      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
        resolveVerification(true);
      });
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as any).port;
    const localUrl = `http://127.0.0.1:${port}/webhook`;

    try {
      const webhookService = new WebhookService(testWebhooksFile);
      await webhookService.init();
      vi.spyOn(webhookService, 'init').mockResolvedValue(undefined);

      const sub = await webhookService.createSubscription(localUrl, ['stream-created']);
      await webhookService.dispatch(event);
      await verificationPromise;

      expect(receivedHeaders).toBeDefined();
      expect(receivedHeaders!['content-type']).toBe('application/json');
      expect(receivedHeaders!['user-agent']).toBe('StreamPay-Webhook/1.0');
      
      const signature = receivedHeaders!['x-streampay-signature'] as string;
      expect(signature).toBeDefined();

      const expectedPayload = JSON.stringify(event, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      );
      const hmac = createHmac('sha256', sub.secret);
      hmac.update(expectedPayload);
      const expectedSignature = `sha256=${hmac.digest('hex')}`;

      expect(signature).toBe(expectedSignature);
      expect(JSON.parse(receivedBody)).toEqual(JSON.parse(expectedPayload));
      expect(sub.consecutiveFailures).toBe(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});



