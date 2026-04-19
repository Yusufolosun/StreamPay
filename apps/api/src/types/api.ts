export type ApiErrorPayload = {
	code: string;
	message: string;
};

export type ApiErrorResponse = {
	success: false;
	error: ApiErrorPayload;
	timestamp: number;
};

export type HealthResponse = {
	status: "ok";
	uptime: number;
	stacks_node_reachable: boolean;
	block_height: number;
};