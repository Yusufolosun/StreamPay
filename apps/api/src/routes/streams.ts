import { Router } from 'express';

import { asyncHandler } from '../utils/asyncHandler.js';
import { createApiError } from '../types/api.js';
import { type StreamIndexer, type StreamIndexEntry } from '../services/streamIndexer.js';
import {
  calculateClaimableBalance,
  calculateStreamProgress,
} from '../services/balanceCalculator.js';
import { parseStreamId } from '../utils/validation.js';
import { isValidStacksAddress } from '../utils/validation.js';

const streamsNotReady = () =>
  createApiError(501, 'streams_not_ready', 'Stream indexing is not connected yet.');

export const createStreamsRouter = (streamIndexer?: StreamIndexer): Router => {
  const router = Router();

  // GET /streams — paginated, max 100.
  // Query: sender, recipient, address, status, page, limit
  router.get(
    '/',
    asyncHandler(async (request, response) => {
      if (!streamIndexer) {
        throw streamsNotReady();
      }

      const { sender, recipient, address, status } = request.query;
      const page = Math.max(1, Number(request.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 20));

      // Validate address parameters
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
      if (typeof address === 'string' && !isValidStacksAddress(address)) {
        throw createApiError(
          400,
          'invalid_address',
          'The provided address is not a valid Stacks address.',
        );
      }

      let entries: StreamIndexEntry[] = [];
      if (typeof sender === 'string') {
        entries = streamIndexer.getSenderStreams(sender);
      } else if (typeof recipient === 'string') {
        entries = streamIndexer.getRecipientStreams(recipient);
      } else if (typeof address === 'string') {
        const senderEntries = streamIndexer.getSenderStreams(address);
        const recipientEntries = streamIndexer.getRecipientStreams(address);
        const merged = new Map<number, StreamIndexEntry>();
        for (const e of senderEntries) merged.set(e.id, e);
        for (const e of recipientEntries) merged.set(e.id, e);
        entries = Array.from(merged.values());
      } else {
        entries = streamIndexer.getStreams();
      }

      // Filter by status if specified
      if (typeof status === 'string') {
        const validStatuses = ['active', 'paused', 'cancelled'];
        if (!validStatuses.includes(status)) {
          throw createApiError(
            400,
            'invalid_status',
            `Status must be one of: ${validStatuses.join(', ')}`,
          );
        }
        entries = entries.filter((entry) => {
          if (status === 'active') return !entry.isPaused && !entry.isCancelled;
          if (status === 'paused') return entry.isPaused;
          if (status === 'cancelled') return entry.isCancelled;
          return true;
        });
      }

      // Paginate
      const total = entries.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const paginatedEntries = entries.slice(offset, offset + limit);

      const views = await streamIndexer.getStreamViews(paginatedEntries);

      // ETag based on cursor (invalidated when new events arrive)
      const etag = `"streams-${streamIndexer.getCursor()}-${page}-${limit}"`;
      response.setHeader('ETag', etag);

      response.json({
        success: true,
        data: views,
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

  // GET /streams/:streamId — stream data + real-time claimable balance
  router.get(
    '/:streamId',
    asyncHandler(async (request, response) => {
      if (!streamIndexer) {
        throw streamsNotReady();
      }

      const streamId = parseStreamId(request.params.streamId);
      if (streamId === null) {
        throw createApiError(
          400,
          'invalid_stream_id',
          'The provided stream ID is not a valid number.',
        );
      }

      const entry = streamIndexer.getStream(streamId);
      if (!entry) {
        throw createApiError(404, 'stream_not_found', `Stream with ID ${streamId} was not found.`);
      }

      const currentBlock = streamIndexer.getCursor();
      const claimableBalance = calculateClaimableBalance(entry, currentBlock);

      const view = await streamIndexer.getStreamView(streamId);

      const etag = `"stream-${streamId}-${streamIndexer.getCursor()}"`;
      response.setHeader('ETag', etag);

      response.json({
        success: true,
        data: {
          stream: view,
          claimableBalance: claimableBalance.toString(),
        },
        timestamp: Date.now(),
      });
    }),
  );

  // GET /streams/:streamId/history — events sorted chronologically
  router.get(
    '/:streamId/history',
    asyncHandler(async (request, response) => {
      if (!streamIndexer) {
        throw streamsNotReady();
      }

      const streamId = parseStreamId(request.params.streamId);
      if (streamId === null) {
        throw createApiError(
          400,
          'invalid_stream_id',
          'The provided stream ID is not a valid number.',
        );
      }

      const entry = streamIndexer.getStream(streamId);
      if (!entry) {
        throw createApiError(404, 'stream_not_found', `Stream with ID ${streamId} was not found.`);
      }

      const history = streamIndexer.getStreamHistory(streamId);

      response.json({
        success: true,
        data: history,
        timestamp: Date.now(),
      });
    }),
  );

  // GET /streams/:streamId/balance — detailed balance breakdown
  router.get(
    '/:streamId/balance',
    asyncHandler(async (request, response) => {
      if (!streamIndexer) {
        throw streamsNotReady();
      }

      const streamId = parseStreamId(request.params.streamId);
      if (streamId === null) {
        throw createApiError(
          400,
          'invalid_stream_id',
          'The provided stream ID is not a valid number.',
        );
      }

      const entry = streamIndexer.getStream(streamId);
      if (!entry) {
        throw createApiError(404, 'stream_not_found', `Stream with ID ${streamId} was not found.`);
      }

      const currentBlock = streamIndexer.getCursor();
      const claimable = calculateClaimableBalance(entry, currentBlock);
      const totalDeposited = entry.depositAmount;
      const totalClaimed = entry.claimedAmount;
      const percentClaimed =
        totalDeposited > 0n ? Number((totalClaimed * 10000n) / totalDeposited) / 100 : 0;

      const progress = calculateStreamProgress(entry, currentBlock);

      response.json({
        success: true,
        data: {
          claimable: claimable.toString(),
          totalDeposited: totalDeposited.toString(),
          totalClaimed: totalClaimed.toString(),
          percentClaimed,
          progress: {
            percentComplete: progress.percentComplete,
            blocksElapsed: progress.blocksElapsed,
            blocksRemaining: progress.blocksRemaining,
            estimatedEndDate: progress.estimatedEndDate.toISOString(),
            totalStreamed: progress.totalStreamed.toString(),
            totalUnclaimed: progress.totalUnclaimed.toString(),
          },
        },
        timestamp: Date.now(),
      });
    }),
  );

  return router;
};
