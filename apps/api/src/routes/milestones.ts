import { Router } from "express";

import { asyncHandler } from "../utils/asyncHandler.js";
import { createApiError } from "../types/api.js";

const milestonesNotReady = () => createApiError(501, "milestones_not_ready", "Milestone indexing is not connected yet.");

export const createMilestonesRouter = (): Router => {
	const router = Router();

	router.get(
		"/",
		asyncHandler(async () => {
			throw milestonesNotReady();
		}),
	);

	router.get(
		"/:milestoneId",
		asyncHandler(async () => {
			throw milestonesNotReady();
		}),
	);

	return router;
};