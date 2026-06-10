import { Router } from 'express';

import { asyncHandler } from '../utils/asyncHandler.js';
import { createApiError, type WebhookAcceptedResponse } from '../types/api.js';
import { writeRateLimiter } from '../middleware/rateLimiter.js';
import { apiKeyAuth } from '../middleware/apiKeyAuth.js';
import { type WebhookService } from '../services/webhookService.js';

const VALID_EVENTS = [
  'stream-created',
  'stream-claimed',
  'stream-paused',
  'stream-resumed',
  'stream-cancelled',
  'sender-transferred',
  '*',
];

export const createWebhooksRouter = (webhookService?: WebhookService): Router => {
  const router = Router();

  // Receive webhook payload (unauthenticated target endpoint)
  router.post(
    '/',
    writeRateLimiter,
    asyncHandler(async (_request, response) => {
      const payload: WebhookAcceptedResponse = {
        success: true,
        accepted: true,
        timestamp: Date.now(),
      };

      response.status(202).json(payload);
    }),
  );

  // Subscription management endpoints (authenticated with API keys)
  router.post(
    '/subscribe',
    apiKeyAuth,
    writeRateLimiter,
    asyncHandler(async (request, response) => {
      if (!webhookService) {
        throw createApiError(501, 'webhooks_not_ready', 'Webhook service is not connected yet.');
      }

      const { url, events } = request.body;

      if (typeof url !== 'string') {
        throw createApiError(400, 'invalid_url', 'URL must be a string.');
      }

      const isProd = process.env.NODE_ENV === 'production';
      const isHttps = url.startsWith('https://');
      const isHttpAllowed = !isProd && url.startsWith('http://');
      if (!isHttps && !isHttpAllowed) {
        throw createApiError(400, 'invalid_url', 'URL must be HTTPS-only.');
      }

      if (!Array.isArray(events) || events.length === 0) {
        throw createApiError(400, 'invalid_events', 'Events must be a non-empty array of strings.');
      }

      for (const event of events) {
        if (!VALID_EVENTS.includes(event)) {
          throw createApiError(
            400,
            'invalid_event_type',
            `Event type '${event}' is not supported.`,
          );
        }
      }

      const sub = await webhookService.createSubscription(url, events);
      response.status(201).json({
        success: true,
        data: sub,
      });
    }),
  );

  router.get(
    '/:id',
    apiKeyAuth,
    asyncHandler(async (request, response) => {
      if (!webhookService) {
        throw createApiError(501, 'webhooks_not_ready', 'Webhook service is not connected yet.');
      }

      const sub = webhookService.getSubscription(request.params.id);
      if (!sub) {
        throw createApiError(
          404,
          'subscription_not_found',
          `Subscription with ID ${request.params.id} was not found.`,
        );
      }

      response.json({
        success: true,
        data: sub,
      });
    }),
  );

  router.delete(
    '/:id',
    apiKeyAuth,
    writeRateLimiter,
    asyncHandler(async (request, response) => {
      if (!webhookService) {
        throw createApiError(501, 'webhooks_not_ready', 'Webhook service is not connected yet.');
      }

      const deleted = await webhookService.deleteSubscription(request.params.id);
      if (!deleted) {
        throw createApiError(
          404,
          'subscription_not_found',
          `Subscription with ID ${request.params.id} was not found.`,
        );
      }

      response.json({
        success: true,
        deleted: true,
      });
    }),
  );

  return router;
};
