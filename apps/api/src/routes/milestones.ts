import { Router } from 'express';

import { asyncHandler } from '../utils/asyncHandler.js';
import { createApiError } from '../types/api.js';
import type { StacksService } from '../services/stacksService.js';
import { calculateMilestoneAmounts } from '../services/balanceCalculator.js';
import { parseStreamId, isValidStacksAddress } from '../utils/validation.js';

const milestonesNotReady = () =>
  createApiError(501, 'milestones_not_ready', 'Milestone indexing is not connected yet.');

export const createMilestonesRouter = (stacksService?: StacksService): Router => {
  const router = Router();

  // GET /milestones — query/list milestone streams by participant (sender, recipient, arbiter, or general participant)
  router.get(
    '/',
    asyncHandler(async (request, response) => {
      if (!stacksService) {
        throw milestonesNotReady();
      }

      const { sender, recipient, arbiter, participant } = request.query;
      const page = Math.max(1, Number(request.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 20));

      // Validate input addresses if provided
      if (typeof sender === 'string' && !isValidStacksAddress(sender)) {
        throw createApiError(
          400,
          'invalid_sender',
          'The provided sender address is not a valid Stacks address.',
        );
      }
      if (typeof recipient === 'string' && !isValidStacksAddress(recipient)) {
        throw createApiError(
          400,
          'invalid_recipient',
          'The provided recipient address is not a valid Stacks address.',
        );
      }
      if (typeof arbiter === 'string' && !isValidStacksAddress(arbiter)) {
        throw createApiError(
          400,
          'invalid_arbiter',
          'The provided arbiter address is not a valid Stacks address.',
        );
      }
      if (typeof participant === 'string' && !isValidStacksAddress(participant)) {
        throw createApiError(
          400,
          'invalid_participant',
          'The provided participant address is not a valid Stacks address.',
        );
      }

      // Retrieve all milestone streams up to nonce to filter
      const nonce = await stacksService.getMilestoneStreamIdNonce();
      const fetchPromises = [];
      for (let id = 1; id <= nonce; id++) {
        fetchPromises.push(
          stacksService
            .getMilestoneStream(id)
            .then((stream) => (stream ? { id, ...stream } : null)),
        );
      }

      const allStreams = (await Promise.all(fetchPromises)).filter(Boolean) as any[];

      // Filter based on query parameters
      let filteredStreams = allStreams;
      if (typeof sender === 'string') {
        filteredStreams = filteredStreams.filter((s) => s.sender === sender);
      }
      if (typeof recipient === 'string') {
        filteredStreams = filteredStreams.filter((s) => s.recipient === recipient);
      }
      if (typeof arbiter === 'string') {
        filteredStreams = filteredStreams.filter((s) => s.arbiter === arbiter);
      }
      if (typeof participant === 'string') {
        filteredStreams = filteredStreams.filter(
          (s) =>
            s.sender === participant || s.recipient === participant || s.arbiter === participant,
        );
      }

      // Paginate
      const total = filteredStreams.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const paginatedStreams = filteredStreams.slice(offset, offset + limit);

      // Map milestones with calculated amounts for response
      const data = paginatedStreams.map((stream) => {
        const milestoneAmounts = calculateMilestoneAmounts(stream);
        return {
          ...stream,
          milestones: milestoneAmounts,
        };
      });

      response.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
        timestamp: Date.now(),
      });
    }),
  );

  // GET /milestones/:milestoneStreamId — returns full milestone stream with per-milestone status and amounts
  router.get(
    '/:milestoneStreamId',
    asyncHandler(async (request, response) => {
      if (!stacksService) {
        throw milestonesNotReady();
      }

      const milestoneStreamId = parseStreamId(request.params.milestoneStreamId as string);
      if (milestoneStreamId === null) {
        throw createApiError(
          400,
          'invalid_stream_id',
          'The provided stream ID is not a valid number.',
        );
      }

      const stream = await stacksService.getMilestoneStream(milestoneStreamId);
      if (!stream) {
        throw createApiError(
          404,
          'milestone_stream_not_found',
          `Milestone stream with ID ${milestoneStreamId} was not found.`,
        );
      }

      const milestoneAmounts = calculateMilestoneAmounts(stream);

      response.json({
        success: true,
        data: {
          id: milestoneStreamId,
          ...stream,
          milestones: milestoneAmounts,
        },
        timestamp: Date.now(),
      });
    }),
  );

  // GET /milestones/:id/releasable — lists indices of releasable milestones
  router.get(
    '/:id/releasable',
    asyncHandler(async (request, response) => {
      if (!stacksService) {
        throw milestonesNotReady();
      }

      const id = parseStreamId(request.params.id as string);
      if (id === null) {
        throw createApiError(
          400,
          'invalid_stream_id',
          'The provided stream ID is not a valid number.',
        );
      }

      const stream = await stacksService.getMilestoneStream(id);
      if (!stream) {
        throw createApiError(
          404,
          'milestone_stream_not_found',
          `Milestone stream with ID ${id} was not found.`,
        );
      }

      const releasableIndices: number[] = [];
      if (!stream.isCancelled) {
        stream.milestones.forEach((m, index) => {
          if (!m.isReleased) {
            releasableIndices.push(index);
          }
        });
      }

      response.json({
        success: true,
        data: releasableIndices,
        timestamp: Date.now(),
      });
    }),
  );

  return router;
};
