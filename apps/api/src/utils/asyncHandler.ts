import type { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncRouteHandler = (request: Request, response: Response, next: NextFunction) => Promise<void>;

export const asyncHandler = (handler: AsyncRouteHandler): RequestHandler => {
	return (request, response, next) => {
		void handler(request, response, next).catch(next);
	};
};