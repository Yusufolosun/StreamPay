import type { Request, Response, NextFunction } from 'express';
import { createApiError } from '../types/api.js';

/**
 * API key authentication middleware.
 * Reads valid keys from the API_KEYS environment variable (comma-separated).
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
  if (!validKeys.includes(token)) {
    throw createApiError(403, 'INVALID_API_KEY', 'The provided API key is not valid.');
  }

  next();
};
