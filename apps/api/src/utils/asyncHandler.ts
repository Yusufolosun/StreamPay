import type { NextFunction, RequestHandler, Response } from "express";

export const asyncHandler = (
	handler: (request: Parameters<RequestHandler>[0], response: Response, next: NextFunction) => Promise<void>,
): RequestHandler => {
	return (request, response, next) => {
		void handler(request, response, next).catch(next);
	};
};