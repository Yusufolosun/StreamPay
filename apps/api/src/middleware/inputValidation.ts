import type { RequestHandler } from 'express';

import { createApiError } from '../types/api.js';

/**
 * Rejects POST/PUT/PATCH requests that do not declare application/json content type.
 * Prevents content-type confusion attacks.
 */
export const requireJsonContentType: RequestHandler = (request, _response, next) => {
  const method = request.method.toUpperCase();
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const contentType = request.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
      throw createApiError(
        415,
        'UNSUPPORTED_CONTENT_TYPE',
        'Content-Type must be application/json for POST/PUT/PATCH requests.',
      );
    }
  }
  next();
};

/**
 * Sanitizes all string query parameters:
 * - Trims whitespace
 * - Caps length at 100 characters
 */
export const sanitizeQueryParams: RequestHandler = (request, _response, next) => {
  const query = request.query;
  for (const key of Object.keys(query)) {
    const value = query[key];
    if (typeof value === 'string') {
      (query as Record<string, any>)[key] = value.trim().slice(0, 100);
    }
  }
  next();
};

/**
 * Enforces a hard cap of 100 on the `limit` query parameter.
 * Prevents clients from requesting unbounded result sets.
 */
export const enforcePaginationCap: RequestHandler = (request, _response, next) => {
  const limitStr = request.query.limit;
  if (typeof limitStr === 'string') {
    const parsed = parseInt(limitStr, 10);
    if (!isNaN(parsed) && parsed > 100) {
      (request.query as Record<string, any>).limit = '100';
    }
  }
  next();
};
