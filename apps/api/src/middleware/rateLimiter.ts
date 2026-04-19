import type { RequestHandler } from "express";

export const publicRateLimiter: RequestHandler = (_request, _response, next) => {
	next();
};

export const writeRateLimiter: RequestHandler = (_request, _response, next) => {
	next();
};