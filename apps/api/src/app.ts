import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";

import type { AppConfig } from "./config.js";
import { createErrorHandler } from "./middleware/errorHandler.js";
import { publicRateLimiter } from "./middleware/rateLimiter.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { createHealthRouter } from "./routes/health.js";
import { createMilestonesRouter } from "./routes/milestones.js";
import { createStreamsRouter } from "./routes/streams.js";
import { createWebhooksRouter } from "./routes/webhooks.js";
import { StacksService } from "./services/stacksService.js";

export const createApp = (config: AppConfig): Express => {
	const app = express();
	const stacksService = new StacksService(config.hiroApiUrl, config.hiroApiKey);

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
	app.use("/health", createHealthRouter(stacksService));
	app.use("/streams", createStreamsRouter());
	app.use("/milestones", createMilestonesRouter());
	app.use("/webhooks", createWebhooksRouter());
	app.use(
		createErrorHandler({
			isProduction: config.nodeEnv === "production",
		}),
	);

	return app;
};