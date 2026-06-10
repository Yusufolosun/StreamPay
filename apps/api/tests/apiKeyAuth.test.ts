import { describe, expect, it, beforeEach, afterEach } from "vitest";
import type { Request, Response } from "express";
import { apiKeyAuth } from "../src/middleware/apiKeyAuth.js";
import { ApiHttpError } from "../src/types/api.js";

describe("apiKeyAuth middleware", () => {
	const originalEnv = process.env.API_KEYS;

	beforeEach(() => {
		// Clear or set environment variable
		process.env.API_KEYS = "testkey-123,another-key-456";
	});

	afterEach(() => {
		process.env.API_KEYS = originalEnv;
	});

	it("throws AUTH_NOT_CONFIGURED if API_KEYS is not set", () => {
		delete process.env.API_KEYS;
		const req = {
			headers: { authorization: "Bearer testkey-123" }
		} as Request;
		const res = {} as Response;
		const next = () => {};

		expect(() => apiKeyAuth(req, res, next)).toThrowError();
		try {
			apiKeyAuth(req, res, next);
		} catch (err: any) {
			expect(err).toBeInstanceOf(ApiHttpError);
			expect(err.statusCode).toBe(503);
			expect(err.code).toBe("AUTH_NOT_CONFIGURED");
		}
	});

	it("throws MISSING_API_KEY if authorization header is missing or not Bearer", () => {
		const req = {
			headers: {}
		} as Request;
		const res = {} as Response;
		const next = () => {};

		expect(() => apiKeyAuth(req, res, next)).toThrowError();
		try {
			apiKeyAuth(req, res, next);
		} catch (err: any) {
			expect(err).toBeInstanceOf(ApiHttpError);
			expect(err.statusCode).toBe(401);
			expect(err.code).toBe("MISSING_API_KEY");
		}
	});

	it("throws INVALID_API_KEY if the provided key is not in the configuration", () => {
		const req = {
			headers: { authorization: "Bearer wrongkey" }
		} as Request;
		const res = {} as Response;
		const next = () => {};

		expect(() => apiKeyAuth(req, res, next)).toThrowError();
		try {
			apiKeyAuth(req, res, next);
		} catch (err: any) {
			expect(err).toBeInstanceOf(ApiHttpError);
			expect(err.statusCode).toBe(403);
			expect(err.code).toBe("INVALID_API_KEY");
		}
	});

	it("calls next() if a valid key is provided", () => {
		const req = {
			headers: { authorization: "Bearer another-key-456" }
		} as Request;
		const res = {} as Response;
		let calledNext = false;
		const next = () => {
			calledNext = true;
		};

		apiKeyAuth(req, res, next);
		expect(calledNext).toBe(true);
	});
});
