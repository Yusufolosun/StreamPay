import { Router } from "express";

import { asyncHandler } from "../utils/asyncHandler.js";
import { createApiError } from "../types/api.js";
import { type StreamIndexer, type StreamIndexEntry } from "../services/streamIndexer.js";

const streamsNotReady = () => createApiError(501, "streams_not_ready", "Stream indexing is not connected yet.");

export const createStreamsRouter = (streamIndexer?: StreamIndexer): Router => {
	const router = Router();

	router.get(
		"/",
		asyncHandler(async (request, response) => {
			if (!streamIndexer) {
				throw streamsNotReady();
			}

			const { sender, recipient, address } = request.query;

			let entries: StreamIndexEntry[] = [];
			if (typeof sender === "string") {
				entries = streamIndexer.getSenderStreams(sender);
			} else if (typeof recipient === "string") {
				entries = streamIndexer.getRecipientStreams(recipient);
			} else if (typeof address === "string") {
				const senderEntries = streamIndexer.getSenderStreams(address);
				const recipientEntries = streamIndexer.getRecipientStreams(address);
				const merged = new Map<number, StreamIndexEntry>();
				for (const e of senderEntries) merged.set(e.id, e);
				for (const e of recipientEntries) merged.set(e.id, e);
				entries = Array.from(merged.values());
			} else {
				entries = streamIndexer.getStreams();
			}

			const views = await streamIndexer.getStreamViews(entries);
			response.json({
				success: true,
				data: views,
				timestamp: Date.now(),
			});
		}),
	);

	router.get(
		"/:streamId",
		asyncHandler(async (request, response) => {
			if (!streamIndexer) {
				throw streamsNotReady();
			}

			const streamId = Number(request.params.streamId);
			if (Number.isNaN(streamId)) {
				throw createApiError(400, "invalid_stream_id", "The provided stream ID is not a valid number.");
			}

			const view = await streamIndexer.getStreamView(streamId);
			if (!view) {
				throw createApiError(404, "stream_not_found", `Stream with ID ${streamId} was not found.`);
			}

			response.json({
				success: true,
				data: view,
				timestamp: Date.now(),
			});
		}),
	);

	return router;
};