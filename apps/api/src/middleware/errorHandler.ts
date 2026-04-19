import type { ErrorRequestHandler } from "express";

import { isApiError } from "../types/api.js";
import { logger, type Logger } from "../utils/logger.js";

export type ErrorHandlerOptions = {
	isProduction: boolean;
	logger?: Logger;
};

export const createErrorHandler = ({ isProduction, logger: appLogger = logger }: ErrorHandlerOptions): ErrorRequestHandler => {
	return (error, request, response, next) => {
		if (response.headersSent) {
			next(error);
			return;
		}

		const statusCode = isApiError(error) ? error.statusCode : 500;
		const code = isApiError(error) ? error.code : "internal_server_error";
		const message = isApiError(error)
			? error.message
			: isProduction
				? "Internal server error"
				: error instanceof Error
					? error.message
					: "Internal server error";

		appLogger.error("Request failed", {
			error,
			requestId: request.requestId,
			method: request.method,
			path: request.originalUrl,
			statusCode,
			code,
		});

		response.status(statusCode).json({
			success: false,
			error: {
				code,
				message,
			},
			timestamp: Date.now(),
		});
	};
};

export const errorHandler = createErrorHandler({ isProduction: false });