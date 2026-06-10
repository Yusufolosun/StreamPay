import { Router } from 'express';

import { asyncHandler } from '../utils/asyncHandler.js';
import { createApiError } from '../types/api.js';
import type { StreamIndexer } from '../services/streamIndexer.js';

const statsNotReady = () =>
  createApiError(501, 'stats_not_ready', 'Stream indexing is not connected yet.');

export const createStatsRouter = (streamIndexer?: StreamIndexer): Router => {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (_request, response) => {
      if (!streamIndexer) {
        throw statsNotReady();
      }

      response.json({
        success: true,
        data: {
          totalStreams: streamIndexer.getStreamCount(),
          activeStreams: streamIndexer.getActiveStreamCount(),
          totalVolume: streamIndexer.getTotalVolume().toString(),
          isProtocolPaused: streamIndexer.getIsProtocolPaused(),
        },
        timestamp: Date.now(),
      });
    }),
  );

  return router;
};
