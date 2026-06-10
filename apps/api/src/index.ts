import { createServer } from "node:http";
import * as path from "node:path";

import { createApp } from "./app.js";
import { ConfigError, loadConfig } from "./config.js";
import { StacksService } from "./services/stacksService.js";
import { StreamIndexer } from "./services/streamIndexer.js";
import { WebSocketServerManager } from "./utils/wsServer.js";
import { logger } from "./utils/logger.js";

const bootstrap = async (): Promise<void> => {
	let streamIndexer: StreamIndexer | null = null;
	let wsManager: WebSocketServerManager | null = null;

	try {
		const config = loadConfig();

		const stacksService = new StacksService(
			config.hiroApiUrl,
			config.hiroApiKey,
			config.contractStreamCore,
			config.contractStreamConditions,
		);

		const stateFilePath = path.join(process.cwd(), "data", "indexer-state.json");
		streamIndexer = new StreamIndexer(
			stacksService,
			config.contractStreamCore,
			stateFilePath,
		);

		const { WebhookService } = await import("./services/webhookService.js");
		const webhookService = new WebhookService();
		await webhookService.init();

		const app = createApp(config, stacksService, streamIndexer, webhookService);
		const server = createServer(app);

		wsManager = new WebSocketServerManager(server);
		streamIndexer.setOnStreamUpdate((streamId, event) => {
			wsManager?.broadcastStreamUpdate(streamId, event);
			webhookService.dispatch(event).catch((err) => {
				logger.error("Failed to dispatch webhook event", { error: err });
			});
		});

		wsManager.start();
		await streamIndexer.start();

		await new Promise<void>((resolve, reject) => {
			server.once("error", reject);
			server.listen(config.port, resolve);
		});

		logger.info("API server listening", {
			port: config.port,
			nodeEnv: config.nodeEnv,
			stacksNetwork: config.stacksNetwork,
		});

		const handleShutdown = () => {
			logger.info("Shutting down API server gracefully...");
			streamIndexer?.stop();
			wsManager?.stop();
			server.close(() => {
				logger.info("HTTP server closed.");
				process.exit(0);
			});
		};

		process.on("SIGINT", handleShutdown);
		process.on("SIGTERM", handleShutdown);
	} catch (error) {
		if (error instanceof ConfigError) {
			logger.error("API failed to start due to invalid configuration", {
				error,
				problems: error.problems,
			});
		} else {
			logger.error("API failed to start", {
				error,
			});
		}

		if (streamIndexer) streamIndexer.stop();
		if (wsManager) wsManager.stop();
		process.exitCode = 1;
	}
};

void bootstrap();
