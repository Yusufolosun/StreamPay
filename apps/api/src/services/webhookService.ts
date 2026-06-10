import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createHmac } from 'node:crypto';
import { type StreamEvent } from '../types/stacks.js';

export type WebhookSubscription = {
  id: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  consecutiveFailures: number;
  createdAt: number;
};

export class WebhookService {
  private subscriptions: Map<string, WebhookSubscription> = new Map();
  private readonly filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), 'data', 'webhooks.json');
  }

  public async init(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const data = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(data) as WebhookSubscription[];
      for (const sub of parsed) {
        this.subscriptions.set(sub.id, sub);
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error('Failed to load webhooks from file:', error);
      }
    }
  }

  private async save(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const array = Array.from(this.subscriptions.values());
      await fs.writeFile(this.filePath, JSON.stringify(array, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save webhooks to file:', error);
    }
  }

  public async createSubscription(url: string, events: string[]): Promise<WebhookSubscription> {
    const id = 'sub_' + Math.random().toString(36).substring(2, 15);
    const secret =
      'whsec_' +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    const sub: WebhookSubscription = {
      id,
      url,
      events,
      secret,
      isActive: true,
      consecutiveFailures: 0,
      createdAt: Date.now(),
    };

    this.subscriptions.set(id, sub);
    await this.save();
    return sub;
  }

  public getSubscription(id: string): WebhookSubscription | undefined {
    return this.subscriptions.get(id);
  }

  public getSubscriptions(): WebhookSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  public async deleteSubscription(id: string): Promise<boolean> {
    const deleted = this.subscriptions.delete(id);
    if (deleted) {
      await this.save();
    }
    return deleted;
  }

  public async dispatch(event: StreamEvent): Promise<void> {
    const matchingSubs = Array.from(this.subscriptions.values()).filter(
      (sub) => sub.isActive && (sub.events.includes(event.eventType) || sub.events.includes('*')),
    );

    for (const sub of matchingSubs) {
      this.deliverWithRetry(sub, event).catch((err) => {
        console.error(`Webhook delivery completely failed for subscription ${sub.id}:`, err);
      });
    }
  }

  private async deliverWithRetry(sub: WebhookSubscription, event: StreamEvent): Promise<void> {
    const payload = JSON.stringify(event, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    );

    const hmac = createHmac('sha256', sub.secret);
    hmac.update(payload);
    const signature = `sha256=${hmac.digest('hex')}`;

    const retries = [1000, 2000, 4000]; // backoff delays in ms
    let success = false;
    let attempt = 0;

    while (!success && attempt <= retries.length) {
      if (attempt > 0) {
        const delay = retries[attempt - 1];
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(sub.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-StreamPay-Signature': signature,
            'User-Agent': 'StreamPay-Webhook/1.0',
          },
          body: payload,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          success = true;
        } else {
          console.warn(
            `Webhook subscription ${sub.id} returned status ${response.status} on attempt ${attempt + 1}`,
          );
        }
      } catch (error: any) {
        console.warn(
          `Webhook subscription ${sub.id} failed attempt ${attempt + 1}: ${error.message}`,
        );
      }

      attempt++;
    }

    if (success) {
      if (sub.consecutiveFailures > 0) {
        sub.consecutiveFailures = 0;
        await this.save();
      }
    } else {
      sub.consecutiveFailures += 1;
      if (sub.consecutiveFailures >= 10) {
        sub.isActive = false;
        console.warn(
          `Webhook subscription ${sub.id} deactivated due to 10 consecutive delivery failures.`,
        );
      }
      await this.save();
    }
  }
}
