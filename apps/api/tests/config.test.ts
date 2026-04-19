import { afterEach, describe, expect, it } from "vitest";

import { ConfigError, loadConfig } from "../src/config.js";

const originalEnv = { ...process.env };

const restoreEnv = (): void => {
	for (const key of Object.keys(process.env)) {
		if (!(key in originalEnv)) {
			delete process.env[key];
		}
	}

	Object.assign(process.env, originalEnv);
};

afterEach(() => {
	restoreEnv();
});

describe("API config loader", () => {
	it("refuses to start when required env vars are missing", () => {
		process.env.PORT = "32123";
		process.env.NODE_ENV = "production";
		process.env.STACKS_NETWORK = "mainnet";
		process.env.HIRO_API_URL = "https://api.mainnet.hiro.so";
		delete process.env.HIRO_API_KEY;
		process.env.CONTRACT_STREAM_CORE = "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-core";
		process.env.CONTRACT_STREAM_CONDITIONS = "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-conditions";
		process.env.CONTRACT_STREAM_NFT = "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-nft";
		delete process.env.DATABASE_URL;
		delete process.env.JWT_SECRET;
		delete process.env.CORS_ORIGINS;

		expect(() => loadConfig()).toThrow(ConfigError);

		try {
			loadConfig();
		} catch (error) {
			expect(error).toBeInstanceOf(ConfigError);
			const message = (error as Error).message;
			expect(message).toContain("Missing variables:");
			expect(message).toContain("HIRO_API_KEY");
			expect(message).toContain("DATABASE_URL");
			expect(message).toContain("JWT_SECRET");
			expect(message).toContain("CORS_ORIGINS");
		}
	});
});