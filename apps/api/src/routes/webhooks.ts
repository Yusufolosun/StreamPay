import { Router } from "express";

import { asyncHandler } from "../utils/asyncHandler.js";
import type { WebhookAcceptedResponse } from "../types/api.js";
import { writeRateLimiter } from "../middleware/rateLimiter.js";

export const createWebhooksRouter = (): Router => {
	const router = Router();

	router.use(writeRateLimiter);

	router.post(
		"/",
		asyncHandler(async (_request, response) => {
			const payload: WebhookAcceptedResponse = {
				success: true,
				accepted: true,
				timestamp: Date.now(),
			};

			response.status(202).json(payload);
		}),
	);

	return router;
};