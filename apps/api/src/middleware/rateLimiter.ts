import rateLimit from 'express-rate-limit';

import { createApiError } from '../types/api.js';

const createLimiter = (limit: number, code: string, message: string) => {
  return rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_request, _response, next, options) => {
      next(createApiError(429, code, options.message));
    },
    message,
  });
};

export const publicRateLimiter = createLimiter(
  100,
  'rate_limit_public_exceeded',
  'Too many requests. Try again in a minute.',
);

export const writeRateLimiter = createLimiter(
  20,
  'rate_limit_write_exceeded',
  'Too many write requests. Try again in a minute.',
);

/**
 * Webhook subscribe rate limiter: 10 requests per IP per hour.
 * Prevents excessive subscription registration from a single source.
 */
export const webhookSubscribeRateLimiter = rateLimit({
  windowMs: 3_600_000, // 1 hour
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_request, _response, next, options) => {
    next(createApiError(429, 'rate_limit_webhook_exceeded', options.message));
  },
  message: 'Too many webhook subscription requests. Try again in an hour.',
});
