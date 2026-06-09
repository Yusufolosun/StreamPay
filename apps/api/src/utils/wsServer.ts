import { type Server as HttpServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";

export class WebSocketServerManager {
	private wss: WebSocketServer | null = null;

	public constructor(private readonly server: HttpServer) {}

	public start(): void {
		if (this.wss) return;

		this.wss = new WebSocketServer({ server: this.server });

		this.wss.on("connection", (ws: WebSocket) => {
			console.log("WebSocket client connected");

			ws.on("close", () => {
				console.log("WebSocket client disconnected");
			});

			ws.on("error", (error) => {
				console.error("WebSocket client error:", error);
			});
		});
	}

	public stop(): void {
		if (this.wss) {
			this.wss.close();
			this.wss = null;
		}
	}
}
