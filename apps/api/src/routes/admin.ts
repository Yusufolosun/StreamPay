import { Router } from 'express';
import { randomBytes } from 'node:crypto';

import { asyncHandler } from '../utils/asyncHandler.js';
import { createApiError } from '../types/api.js';
import { apiKeyAuth } from '../middleware/apiKeyAuth.js';

const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Admin router.
 * POST /admin/rotate-key — Generates a new API key and deprecates the old one
 * with a 24-hour grace period.
 *
 * Security: Must be IP-restricted at the reverse-proxy level (see docs/nginx-ip-restriction.conf).
 */
export const createAdminRouter = (): Router => {
  const router = Router();

  router.post(
    '/rotate-key',
    apiKeyAuth,
    asyncHandler(async (request, response) => {
      const currentKeysEnv = process.env.API_KEYS;
      if (!currentKeysEnv) {
        throw createApiError(503, 'AUTH_NOT_CONFIGURED', 'API key authentication is not configured.');
      }

      // Generate a new cryptographically-random 32-byte key
      const newKey = randomBytes(32).toString('hex');
      const now = Date.now();
      const gracePeriodEndsAt = now + GRACE_PERIOD_MS;

      // Derive the current key from the request's Authorization header
      const authHeader = request.headers.authorization;
      const oldKey = authHeader ? authHeader.slice(7).trim() : '';

      // Append the new key to API_KEYS
      const existingKeys = currentKeysEnv
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      if (!existingKeys.includes(newKey)) {
        existingKeys.push(newKey);
      }

      process.env.API_KEYS = existingKeys.join(',');

      // Track deprecated keys with grace period timestamps
      const deprecatedKeysEnv = process.env.DEPRECATED_API_KEYS || '';
      const deprecatedEntries = deprecatedKeysEnv
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);

      // Format: key:expiryTimestamp
      deprecatedEntries.push(`${oldKey}:${gracePeriodEndsAt}`);
      process.env.DEPRECATED_API_KEYS = deprecatedEntries.join(',');

      // Remove old key from active keys (it's now deprecated)
      const activeKeys = existingKeys.filter((k) => k !== oldKey);
      process.env.API_KEYS = activeKeys.join(',');

      response.status(200).json({
        success: true,
        data: {
          newKey,
          deprecatedAt: new Date(now).toISOString(),
          gracePeriodEndsAt: new Date(gracePeriodEndsAt).toISOString(),
        },
        timestamp: now,
      });
    }),
  );

  return router;
};
