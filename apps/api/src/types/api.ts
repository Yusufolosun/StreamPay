export type ApiErrorPayload = {
	code: string;
	message: string;
};

export type ApiErrorResponse = {
	success: false;
	error: ApiErrorPayload;
	timestamp: number;
};

export type ApiSuccessResponse<T> = {
	success: true;
	data: T;
	timestamp: number;
};

export type HealthResponse = {
	status: "ok";
	uptime: number;
	stacks_node_reachable: boolean;
	block_height: number;
};

export type WebhookAcceptedResponse = {
	success: true;
	accepted: true;
	timestamp: number;
};

export class ApiHttpError extends Error {
	public constructor(
		public readonly statusCode: number,
		public readonly code: string,
		message: string,
		public readonly expose = true,
		public readonly details?: unknown,
	) {
		super(message);
		this.name = "ApiHttpError";
	}
}

export const createApiError = (
	statusCode: number,
	code: string,
	message: string,
	options: { expose?: boolean; details?: unknown } = {},
): ApiHttpError => {
	return new ApiHttpError(statusCode, code, message, options.expose ?? true, options.details);
};

export const isApiError = (error: unknown): error is ApiHttpError => {
	return error instanceof ApiHttpError;
};

declare global {
	namespace Express {
		interface Request {
			requestId?: string;
		}
	}
}

export {};