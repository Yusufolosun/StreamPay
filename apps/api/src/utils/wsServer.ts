import { type Server as HttpServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";

export class WebSocketServerManager {
	private wss: WebSocketServer | null = null;
	// streamId -> Set of WebSockets
	private subscriptions = new Map<number, Set<WebSocket>>();
	// WebSocket -> Set of streamIds
	private clientSubscriptions = new Map<WebSocket, Set<number>>();

	public constructor(private readonly server: HttpServer) {}

	public start(): void {
		if (this.wss) return;

		this.wss = new WebSocketServer({ server: this.server });

		this.wss.on("connection", (ws: WebSocket) => {
			console.log("WebSocket client connected");

			ws.on("message", (messageData: string) => {
				try {
					const payload = JSON.parse(messageData);
					if (payload && typeof payload === "object") {
						const { type, streamId } = payload;
						if (typeof streamId === "number") {
							if (type === "subscribe") {
								this.subscribe(ws, streamId);
							} else if (type === "unsubscribe") {
								this.unsubscribe(ws, streamId);
							}
						}
					}
				} catch (error) {
					console.error("Failed to parse WebSocket message:", error);
				}
			});

			ws.on("close", () => {
				console.log("WebSocket client disconnected");
				this.cleanupClient(ws);
			});

			ws.on("error", (error) => {
				console.error("WebSocket client error:", error);
				this.cleanupClient(ws);
			});
		});
	}

	public stop(): void {
		if (this.wss) {
			this.wss.close();
			this.wss = null;
		}
		this.subscriptions.clear();
		this.clientSubscriptions.clear();
	}

	private subscribe(ws: WebSocket, streamId: number): void {
		// Add to subscriptions map
		let clients = this.subscriptions.get(streamId);
		if (!clients) {
			clients = new Set<WebSocket>();
			this.subscriptions.set(streamId, clients);
		}
		clients.add(ws);

		// Add to client's subscription tracking
		let streamIds = this.clientSubscriptions.get(ws);
		if (!streamIds) {
			streamIds = new Set<number>();
			this.clientSubscriptions.set(ws, streamIds);
		}
		streamIds.add(streamId);

		console.log(`WebSocket client subscribed to stream ${streamId}`);
	}

	private unsubscribe(ws: WebSocket, streamId: number): void {
		// Remove from subscriptions map
		const clients = this.subscriptions.get(streamId);
		if (clients) {
			clients.delete(ws);
			if (clients.size === 0) {
				this.subscriptions.delete(streamId);
			}
		}

		// Remove from client's subscription tracking
		const streamIds = this.clientSubscriptions.get(ws);
		if (streamIds) {
			streamIds.delete(streamId);
			if (streamIds.size === 0) {
				this.clientSubscriptions.delete(ws);
			}
		}

		console.log(`WebSocket client unsubscribed from stream ${streamId}`);
	}

	private cleanupClient(ws: WebSocket): void {
		const streamIds = this.clientSubscriptions.get(ws);
		if (streamIds) {
			for (const streamId of streamIds) {
				const clients = this.subscriptions.get(streamId);
				if (clients) {
					clients.delete(ws);
					if (clients.size === 0) {
						this.subscriptions.delete(streamId);
					}
				}
			}
			this.clientSubscriptions.delete(ws);
		}
	}
}
