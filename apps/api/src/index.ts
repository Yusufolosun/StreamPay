import { createServer } from "node:http";

import { createApp } from "./app.js";
import { ConfigError, loadConfig } from "./config.js";
import { logger } from "./utils/logger.js";

const bootstrap = async (): Promise<void> => {
	try {
		const config = loadConfig();
		const app = createApp(config);
		const server = createServer(app);

		await new Promise<void>((resolve, reject) => {
			server.once("error", reject);
			server.listen(config.port, resolve);
		});

		logger.info("API server listening", {
			port: config.port,
			nodeEnv: config.nodeEnv,
			stacksNetwork: config.stacksNetwork,
		});
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

		process.exitCode = 1;
	}
};

void bootstrap();
