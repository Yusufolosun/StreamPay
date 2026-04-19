import { Router } from "express";

import { asyncHandler } from "../utils/asyncHandler.js";
import type { HealthResponse } from "../types/api.js";
import type { StacksService } from "../services/stacksService.js";

export const createHealthRouter = (stacksService: StacksService): Router => {
	const router = Router();

	router.get(
		"/",
		asyncHandler(async (_request, response) => {
			const health = await stacksService.getHealth();

			const payload: HealthResponse = {
				status: "ok",
				uptime: process.uptime(),
				stacks_node_reachable: health.reachable,
				block_height: health.blockHeight,
			};

			response.json(payload);
		}),
	);

	return router;
};