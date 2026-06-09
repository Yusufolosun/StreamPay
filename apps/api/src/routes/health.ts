import { Router } from "express";

import { asyncHandler } from "../utils/asyncHandler.js";
import type { HealthResponse } from "../types/api.js";
import type { StacksService } from "../services/stacksService.js";
import type { StreamIndexer } from "../services/streamIndexer.js";

export const createHealthRouter = (stacksService: StacksService, streamIndexer?: StreamIndexer): Router => {
	const router = Router();

	router.get(
		"/",
		asyncHandler(async (_request, response) => {
			const health = await stacksService.getHealth();

			let status: "ok" | "warn" | "error" = "ok";
			if (!health.reachable) {
				status = "error";
			}

			let indexerPayload: HealthResponse["indexer"] | undefined;
			if (streamIndexer && streamIndexer.getIsRunning()) {
				const indexerHealth = await streamIndexer.getHealth();
				indexerPayload = indexerHealth;
				if (indexerHealth.status === "error") {
					status = "error";
				} else if (indexerHealth.status === "warn" && status !== "error") {
					status = "warn";
				}
			}

			const payload: HealthResponse = {
				status,
				uptime: process.uptime(),
				stacks_node_reachable: health.reachable,
				block_height: health.blockHeight,
				...(indexerPayload ? { indexer: indexerPayload } : {}),
			};

			response.json(payload);
		}),
	);

	return router;
};