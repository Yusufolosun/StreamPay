import { createServer } from 'node:http';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { createHmac } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebhookService } from '../src/services/webhookService.js';
import { type StreamEvent } from '../src/types/stacks.js';

describe('Webhook delivery queue and retry logic', () => {
  const testDbPath = path.join(process.cwd(), 'data', 'webhook-delivery-test.json');
  let webhookService: WebhookService;
  let mockReceiver: ReturnType<typeof createServer>;
  let receiverPort = 0;
  let receivedRequests: { headers: any; body: string }[] = [];
  let receiverHandler: (req: any, res: any) => void = () => {};

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
    try {
      await fs.unlink(testDbPath);
    } catch {}

    webhookService = new WebhookService(testDbPath);
    await webhookService.init();

    mockReceiver = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        receivedRequests.push({ headers: req.headers, body });
        receiverHandler(req, res);
      });
    });

    receiverPort = await listen(mockReceiver);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => mockReceiver.close(() => resolve()));
    try {
      await fs.unlink(testDbPath);
    } catch {}
  });

  it('delivers webhook event with valid signature and payload', async () => {
    receivedRequests = [];
    receiverHandler = (_req, res) => {
      res.statusCode = 200;
      res.end();
    };

    const url = `http://127.0.0.1:${receiverPort}/webhook`;
    const sub = await webhookService.createSubscription(url, ['stream-created']);

    const event: StreamEvent = {
      eventType: 'stream-created',
      streamId: 42,
      caller: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      blockHeight: 1000,
      txId: '0x123',
      eventIndex: 0,
      depositAmount: 100000n,
      feeAmount: 50n,
    };

    // Dispatch (runs delivery in background)
    await webhookService.dispatch(event);

    // Wait briefly for delivery to execute
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(receivedRequests.length).toBe(1);
    const req = receivedRequests[0];
    expect(req.headers['content-type']).toBe('application/json');
    expect(req.headers['user-agent']).toBe('StreamPay-Webhook/1.0');

    const payloadStr = JSON.stringify(event, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    );
    expect(req.body).toBe(payloadStr);

    const expectedSignature = `sha256=${createHmac('sha256', sub.secret).update(payloadStr).digest('hex')}`;
    expect(req.headers['x-streampay-signature']).toBe(expectedSignature);

    // Subscription failures should be 0 and active should be true
    const updatedSub = webhookService.getSubscription(sub.id);
    expect(updatedSub?.consecutiveFailures).toBe(0);
    expect(updatedSub?.isActive).toBe(true);

    // Clean up subscription
    await webhookService.deleteSubscription(sub.id);
  });

  it('retries delivery on failure and deactivates after 10 consecutive failures', async () => {
    receivedRequests = [];
    // Force mock receiver to return 500
    receiverHandler = (_req, res) => {
      res.statusCode = 500;
      res.end('Internal Server Error');
    };

    // Create subscription with mock URL
    const url = `http://127.0.0.1:${receiverPort}/failed-webhook`;
    const sub = await webhookService.createSubscription(url, ['*']);

    const event: StreamEvent = {
      eventType: 'stream-paused',
      streamId: 42,
      caller: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      blockHeight: 1001,
      txId: '0x124',
      eventIndex: 1,
      checkpointBalance: 50000n,
    } as any;

    // Dispatch event. Delivery queue retries at [1000, 2000, 4000] ms.
    // Total attempts = 4 (initial + 3 retries).
    await webhookService.dispatch(event);

    // Wait 7.5 seconds to cover retries (1s + 2s + 4s + processing buffer)
    await new Promise((resolve) => setTimeout(resolve, 7500));

    // Expect 4 requests total (1 initial + 3 retries)
    expect(receivedRequests.length).toBe(4);

    // Should have incremented consecutive failures to 1
    let updatedSub = webhookService.getSubscription(sub.id);
    expect(updatedSub?.consecutiveFailures).toBe(1);
    expect(updatedSub?.isActive).toBe(true);

    // Simulate 9 more failures to test auto-deactivation
    if (updatedSub) {
      updatedSub.consecutiveFailures = 9;
      // Trigger another event to hit 10 consecutive failures
      receivedRequests = [];
      await webhookService.dispatch(event);

      // Wait for the delivery to run and fail
      await new Promise((resolve) => setTimeout(resolve, 7500));

      updatedSub = webhookService.getSubscription(sub.id);
      expect(updatedSub?.consecutiveFailures).toBe(10);
      expect(updatedSub?.isActive).toBe(false); // deactivated!
    }
  }, 20000);
});
