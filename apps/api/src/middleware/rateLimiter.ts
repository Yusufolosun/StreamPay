import rateLimit from "express-rate-limit";

import { createApiError } from "../types/api.js";

const createLimiter = (limit: number, code: string, message: string) => {
	return rateLimit({
		windowMs: 60_000,
		limit,
		standardHeaders: true,
		legacyHeaders: false,
		keyGenerator: (request) => request.ip,
		handler: (_request, _response, next, options) => {
			next(createApiError(429, code, options.message));
		},
		message,
	});
};

export const publicRateLimiter = createLimiter(100, "rate_limit_public_exceeded", "Too many requests. Try again in a minute.");

export const writeRateLimiter = createLimiter(20, "rate_limit_write_exceeded", "Too many write requests. Try again in a minute.");