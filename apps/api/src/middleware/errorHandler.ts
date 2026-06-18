import type { ErrorRequestHandler } from 'express';

import { isApiError } from '../types/api.js';
import { logger, type Logger } from '../utils/logger.js';

export type ErrorHandlerOptions = {
  isProduction: boolean;
  logger?: Logger;
};

const sanitizeErrorMessage = (message: string): string => {
  if (!message) return '';
  // Strip file paths: Windows paths (C:\foo\bar) and Unix paths (/foo/bar) or relative paths (../foo/bar)
  let clean = message.replace(/(?:[a-zA-Z]:\\|\/|\.\.?\/)[^\s:]+\.(?:js|ts|json|jsx|tsx|html|css|sh)\b/gi, '[path]');
  clean = clean.replace(/(?:[a-zA-Z]:\\|\/)[a-zA-Z0-9_\-\.\/\\]+/g, (match) => {
    if (match.includes('\\') || match.includes('/')) {
      return '[path]';
    }
    return match;
  });
  // Strip library names
  clean = clean.replace(/\b(express|node|vitest|stacks|hiro|supertest|mongodb|knex|pg|zod|helmet|cors|nodemon|typescript|ts-node)\b/gi, '[library]');
  return clean;
};

export const createErrorHandler = ({
  isProduction,
  logger: appLogger = logger,
}: ErrorHandlerOptions): ErrorRequestHandler => {
  return (error, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    const statusCode = isApiError(error) ? error.statusCode : 500;
    const code = isApiError(error) ? error.code : 'internal_server_error';
    
    let rawMessage = 'Internal server error';
    if (isApiError(error)) {
      // In production, keep client error messages (4xx) but hide 5xx internal details
      rawMessage = isProduction && statusCode >= 500 ? 'Internal server error' : error.message;
    } else if (!isProduction && error instanceof Error) {
      rawMessage = error.message;
    }

    const message = sanitizeErrorMessage(rawMessage);

    appLogger.error('Request failed', {
      error,
      requestId: request.requestId,
      method: request.method,
      path: request.originalUrl,
      statusCode,
      code,
    });

    response.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
      },
      timestamp: Date.now(),
    });
  };
};

export const errorHandler = createErrorHandler({ isProduction: false });
