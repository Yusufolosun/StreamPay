import { Router } from "express";

import { asyncHandler } from "../utils/asyncHandler.js";
import { createApiError } from "../types/api.js";

const streamsNotReady = () => createApiError(501, "streams_not_ready", "Stream indexing is not connected yet.");

export const createStreamsRouter = (): Router => {
	const router = Router();

	router.get(
		"/",
		asyncHandler(async () => {
			throw streamsNotReady();
		}),
	);

	router.get(
		"/:streamId",
		asyncHandler(async () => {
			throw streamsNotReady();
		}),
	);

	return router;
};