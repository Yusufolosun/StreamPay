import { randomUUID } from "node:crypto";

import type { RequestHandler } from "express";

import { logger, type Logger } from "../utils/logger.js";

const buildRequestLogger = (appLogger: Logger): RequestHandler => {
	return (request, response, next) => {
		const requestId = randomUUID();
		const startedAt = process.hrtime.bigint();
		let logged = false;

		request.requestId = requestId;
		response.setHeader("x-request-id", requestId);

		const logCompletion = (outcome: "completed" | "aborted") => {
			if (logged) {
				return;
			}

			logged = true;
			const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

			appLogger.info("HTTP request completed", {
				requestId,
				method: request.method,
				path: request.originalUrl,
				statusCode: response.statusCode,
				durationMs: Number(durationMs.toFixed(2)),
				ip: request.ip,
				userAgent: request.get("user-agent") ?? null,
				outcome,
			});
		};

		response.on("finish", () => logCompletion("completed"));
		response.on("close", () => {
			if (!response.writableEnded) {
				logCompletion("aborted");
			}
		});

		next();
	};
};

export const createRequestLogger = (appLogger: Logger = logger): RequestHandler => buildRequestLogger(appLogger);

export const requestLogger = createRequestLogger();