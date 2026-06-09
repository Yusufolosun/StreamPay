import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import * as path from "node:path";

import type { AppConfig } from "./config.js";
import { createErrorHandler } from "./middleware/errorHandler.js";
import { publicRateLimiter } from "./middleware/rateLimiter.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { createHealthRouter } from "./routes/health.js";
import { createMilestonesRouter } from "./routes/milestones.js";
import { createStreamsRouter } from "./routes/streams.js";
import { createWebhooksRouter } from "./routes/webhooks.js";
import { StacksService } from "./services/stacksService.js";
import { StreamIndexer } from "./services/streamIndexer.js";

export const createApp = (
	config: AppConfig,
	stacksService?: StacksService,
	streamIndexer?: StreamIndexer,
): Express => {
	const app = express();
	const actualStacksService = stacksService ?? new StacksService(
		config.hiroApiUrl,
		config.hiroApiKey,
		config.contractStreamCore,
		config.contractStreamConditions,
	);

	const stateFilePath = path.join(process.cwd(), "data", "indexer-state.json");
	const actualStreamIndexer = streamIndexer ?? new StreamIndexer(
		actualStacksService,
		config.contractStreamCore,
		stateFilePath,
	);

	app.disable("x-powered-by");
	app.use(helmet());
	app.use(
		cors({
			origin: config.corsOrigins,
			credentials: true,
		}),
	);
	app.use(express.json({ limit: "100kb" }));
	app.use(requestLogger);
	app.use(publicRateLimiter);
	app.use("/health", createHealthRouter(actualStacksService, actualStreamIndexer));
	app.use("/streams", createStreamsRouter(actualStreamIndexer));
	app.use("/milestones", createMilestonesRouter());
	app.use("/webhooks", createWebhooksRouter());
	app.use(
		createErrorHandler({
			isProduction: config.nodeEnv === "production",
		}),
	);

	return app;
};