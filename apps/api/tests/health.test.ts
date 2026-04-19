import { createServer } from "node:http";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";

const originalEnv = { ...process.env };

let apiServer = createServer();
let stacksServer = createServer();
let apiPort = 0;
let stacksPort = 0;

const listen = (server: ReturnType<typeof createServer>): Promise<number> => {
	return new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, () => {
			const address = server.address();

			if (address == null || typeof address === "string") {
				reject(new Error("Failed to bind test server"));
				return;
			}

			resolve(address.port);
		});
	});
};

const restoreEnv = (): void => {
	for (const key of Object.keys(process.env)) {
		if (!(key in originalEnv)) {
			delete process.env[key];
		}
	}

	Object.assign(process.env, originalEnv);
};

beforeAll(async () => {
	stacksServer = createServer((request, response) => {
		if (request.url !== "/extended/v1/status") {
			response.statusCode = 404;
			response.end();
			return;
		}

		response.setHeader("content-type", "application/json");
		response.end(JSON.stringify({ stacks_tip_height: 24_680 }));
	});

	stacksPort = await listen(stacksServer);
	const stacksApiUrl = `http://127.0.0.1:${stacksPort}`;

	process.env.PORT = "32123";
	process.env.NODE_ENV = "test";
	process.env.STACKS_NETWORK = "devnet";
	process.env.HIRO_API_URL = stacksApiUrl;
	delete process.env.HIRO_API_KEY;
	process.env.CONTRACT_STREAM_CORE = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-core";
	process.env.CONTRACT_STREAM_CONDITIONS = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-conditions";
	process.env.CONTRACT_STREAM_NFT = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-nft";
	process.env.DATABASE_URL = "postgresql://postgres:password@localhost:5432/streampay?schema=public";
	process.env.JWT_SECRET = "0123456789abcdef0123456789abcdef";
	process.env.CORS_ORIGINS = "http://localhost:3000";

	const config = loadConfig();
	apiServer = createServer(createApp(config));
	apiPort = await listen(apiServer);
});

afterAll(async () => {
	await new Promise<void>((resolve) => apiServer.close(() => resolve()));
	await new Promise<void>((resolve) => stacksServer.close(() => resolve()));
	restoreEnv();
});

describe("API health endpoint", () => {
	it("starts the server and reports health", async () => {
		const response = await fetch(`http://127.0.0.1:${apiPort}/health`);
		expect(response.status).toBe(200);

		const body = (await response.json()) as {
			status: string;
			uptime: number;
			stacks_node_reachable: boolean;
			block_height: number;
		};

		expect(body).toMatchObject({
			status: "ok",
			stacks_node_reachable: true,
			block_height: 24_680,
		});
		expect(typeof body.uptime).toBe("number");
	});
});