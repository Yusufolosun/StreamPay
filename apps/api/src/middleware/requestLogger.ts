import type { RequestHandler } from "express";

export const requestLogger: RequestHandler = (_request, _response, next) => {
	next();
};