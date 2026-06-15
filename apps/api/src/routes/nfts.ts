import { Router } from 'express';

import { asyncHandler } from '../utils/asyncHandler.js';
import { createApiError } from '../types/api.js';
import { isValidStacksAddress } from '../utils/validation.js';
import type { StacksService } from '../services/stacksService.js';

export const createNftsRouter = (stacksService: StacksService): Router => {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (request, response) => {
      const { owner } = request.query;

      if (!owner || typeof owner !== 'string') {
        throw createApiError(400, 'missing_owner', 'The owner query parameter is required.');
      }

      if (!isValidStacksAddress(owner)) {
        throw createApiError(
          400,
          'invalid_owner',
          'The provided owner address is not a valid Stacks address.',
        );
      }

      const nfts = await stacksService.getNftsByOwner(owner);

      response.json({
        success: true,
        data: nfts,
        timestamp: Date.now(),
      });
    }),
  );

  return router;
};
