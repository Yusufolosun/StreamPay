import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
	const message = error instanceof Error ? error.message : "Internal server error";
	response.status(500).json({
		success: false,
		error: {
			code: "internal_server_error",
			message,
		},
		timestamp: Date.now(),
	});
};