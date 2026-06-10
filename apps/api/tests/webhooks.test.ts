import { createServer } from 'node:http';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { WebhookService } from '../src/services/webhookService.js';

describe('Webhook management routes', () => {
  let apiServer = createServer();
  let apiPort = 0;
  let webhookService: WebhookService;
  const testDbPath = path.join(process.cwd(), 'data', 'webhooks-test.json');
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

  beforeAll(async () => {
    // Set environment variables for config loading
    process.env.PORT = '32125';
    process.env.NODE_ENV = 'test';
    process.env.STACKS_NETWORK = 'devnet';
    process.env.HIRO_API_URL = 'http://127.0.0.1:32125';
    process.env.API_KEYS = 'testkey-123,testkey-456';
    process.env.CONTRACT_STREAM_CORE = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-core';
    process.env.CONTRACT_STREAM_CONDITIONS =
      'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-conditions';
    process.env.CONTRACT_STREAM_NFT = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-nft';
    process.env.DATABASE_URL =
      'postgresql://postgres:password@localhost:5432/streampay?schema=public';
    process.env.JWT_SECRET = '0123456789abcdef0123456789abcdef';
    process.env.CORS_ORIGINS = 'http://localhost:3000';

    // Clean up any existing test json
    try {
      await fs.unlink(testDbPath);
    } catch {}

    webhookService = new WebhookService(testDbPath);
    await webhookService.init();

    const config = loadConfig();
    apiServer = createServer(createApp(config, undefined, undefined, webhookService));
    apiPort = await listen(apiServer);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => apiServer.close(() => resolve()));
    try {
      await fs.unlink(testDbPath);
    } catch {}
    // Restore env
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  it('returns 401 when API key is missing on /subscribe', async () => {
    const response = await fetch(`http://127.0.0.1:${apiPort}/api/webhooks/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'http://example.com/webhook',
        events: ['stream-created'],
      }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toMatchObject({
      error: {
        code: 'MISSING_API_KEY',
      },
    });
  });

  it('returns 403 when invalid API key is provided on /subscribe', async () => {
    const response = await fetch(`http://127.0.0.1:${apiPort}/api/webhooks/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid-key',
      },
      body: JSON.stringify({
        url: 'http://example.com/webhook',
        events: ['stream-created'],
      }),
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      error: {
        code: 'INVALID_API_KEY',
      },
    });
  });

  it('returns 400 when invalid events or non-http/https URL is provided', async () => {
    // Non-http/https url
    const res1 = await fetch(`http://127.0.0.1:${apiPort}/api/webhooks/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer testkey-123',
      },
      body: JSON.stringify({
        url: 'ftp://example.com',
        events: ['stream-created'],
      }),
    });
    expect(res1.status).toBe(400);

    // Invalid event type
    const res2 = await fetch(`http://127.0.0.1:${apiPort}/api/webhooks/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer testkey-123',
      },
      body: JSON.stringify({
        url: 'http://example.com/webhook',
        events: ['invalid-event'],
      }),
    });
    expect(res2.status).toBe(400);
  });

  it('registers, retrieves, and deletes a subscription successfully', async () => {
    // 1. Subscribe
    const resSubscribe = await fetch(`http://127.0.0.1:${apiPort}/api/webhooks/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer testkey-123',
      },
      body: JSON.stringify({
        url: 'http://example.com/webhook',
        events: ['stream-created', 'stream-paused'],
      }),
    });

    expect(resSubscribe.status).toBe(201);
    const bodySubscribe = (await resSubscribe.json()) as any;
    expect(bodySubscribe.success).toBe(true);
    expect(bodySubscribe.data).toBeDefined();
    const subId = bodySubscribe.data.id;
    expect(bodySubscribe.data.url).toBe('http://example.com/webhook');
    expect(bodySubscribe.data.events).toContain('stream-created');

    // 2. Retrieve details
    const resGet = await fetch(`http://127.0.0.1:${apiPort}/api/webhooks/${subId}`, {
      headers: {
        Authorization: 'Bearer testkey-456',
      },
    });
    expect(resGet.status).toBe(200);
    const bodyGet = (await resGet.json()) as any;
    expect(bodyGet.success).toBe(true);
    expect(bodyGet.data.id).toBe(subId);

    // 3. Delete
    const resDelete = await fetch(`http://127.0.0.1:${apiPort}/api/webhooks/${subId}`, {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer testkey-123',
      },
    });
    expect(resDelete.status).toBe(200);
    const bodyDelete = (await resDelete.json()) as any;
    expect(bodyDelete.success).toBe(true);
    expect(bodyDelete.deleted).toBe(true);

    // 4. Retrieve again (should be 404)
    const resGetAfter = await fetch(`http://127.0.0.1:${apiPort}/api/webhooks/${subId}`, {
      headers: {
        Authorization: 'Bearer testkey-456',
      },
    });
    expect(resGetAfter.status).toBe(404);
  });
});
