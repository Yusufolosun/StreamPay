import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
	response.json({
		status: "ok",
		uptime: process.uptime(),
		stacks_node_reachable: false,
		block_height: 0,
	});
});