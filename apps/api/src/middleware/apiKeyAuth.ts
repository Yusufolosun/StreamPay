import type { Request, Response, NextFunction } from 'express';
import { createApiError } from '../types/api.js';

/**
 * API key authentication middleware.
 * Reads valid keys from the API_KEYS environment variable (comma-separated).
 * Also checks DEPRECATED_API_KEYS for keys within a grace period.
 * Format for deprecated keys: "key1:expiryTimestamp,key2:expiryTimestamp"
 * Expects: Authorization: Bearer <key>
 */
export const apiKeyAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const apiKeysEnv = process.env.API_KEYS;
  if (!apiKeysEnv || apiKeysEnv.trim().length === 0) {
    throw createApiError(503, 'AUTH_NOT_CONFIGURED', 'API key authentication is not configured.');
  }

  const validKeys = apiKeysEnv
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createApiError(
      401,
      'MISSING_API_KEY',
      'Authorization header with Bearer token is required.',
    );
  }

  const token = authHeader.slice(7).trim();

  // Check active keys first
  if (validKeys.includes(token)) {
    next();
    return;
  }

  // Check deprecated keys within grace period
  const deprecatedKeysEnv = process.env.DEPRECATED_API_KEYS || '';
  const deprecatedEntries = deprecatedKeysEnv
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  const now = Date.now();
  for (const entry of deprecatedEntries) {
    const [key, expiryStr] = entry.split(':');
    const expiry = Number(expiryStr);
    if (key === token && !isNaN(expiry) && now < expiry) {
      // Key is within grace period — accept but continue
      next();
      return;
    }
  }

  throw createApiError(403, 'INVALID_API_KEY', 'The provided API key is not valid.');
};
