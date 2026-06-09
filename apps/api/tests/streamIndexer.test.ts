import { createServer } from "node:http";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";

import { StreamIndexer, type StreamIndexEntry } from "../src/services/streamIndexer.js";
import { StacksService } from "../src/services/stacksService.js";
import { WebSocketServerManager } from "../src/utils/wsServer.js";
import { type StreamEvent } from "../src/types/stacks.js";

const CONTRACT_CORE = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-core";
const tempStateFile = path.join(process.cwd(), "tests", "indexer-state-test.json");

describe("StreamIndexer Unit Tests", () => {
	let stacksServiceMock: any;
	let indexer: StreamIndexer;

	beforeEach(async () => {
		try {
			await fs.unlink(tempStateFile);
		} catch {}

		stacksServiceMock = {
			getCurrentBlockHeight: vi.fn().mockResolvedValue(100),
			getContractEvents: vi.fn().mockResolvedValue([]),
			getStreamById: vi.fn(),
		};

		indexer = new StreamIndexer(
			stacksServiceMock as StacksService,
			CONTRACT_CORE,
			tempStateFile
		);
	});

	afterEach(async () => {
		indexer.stop();
		try {
			await fs.unlink(tempStateFile);
		} catch {}
	});

	it("initializes with cursor 0 and empty state", () => {
		expect(indexer.getCursor()).toBe(0);
		expect(indexer.getStreams()).toEqual([]);
	});

	it("saves and loads state correctly", async () => {
		// Simulate finding some events/streams and advancing cursor
		// Manually hack the internal cursor for test purposes
		(indexer as any).cursor = 50;
		const entry: StreamIndexEntry = {
			id: 1,
			sender: "ST1",
			recipient: "ST2",
			tokenContract: "ST3.token",
			depositAmount: 1000n,
			ratePerBlock: 5n,
			startBlock: 10,
			endBlock: 210,
			claimedAmount: 0n,
			pausedAtBlock: null,
			cancelledAtBlock: null,
			isPaused: false,
			isCancelled: false,
			createdAt: 1234567,
		};
		(indexer as any).streams.set(1, entry);

		await (indexer as any).saveState();

		// Create new indexer instance pointing to same file
		const indexer2 = new StreamIndexer(
			stacksServiceMock as StacksService,
			CONTRACT_CORE,
			tempStateFile
		);

		await (indexer2 as any).loadState();

		expect(indexer2.getCursor()).toBe(50);
		expect(indexer2.getStream(1)).toEqual(entry);
		expect(indexer2.getSenderStreams("ST1")).toEqual([entry]);
		expect(indexer2.getRecipientStreams("ST2")).toEqual([entry]);
	});

	it("processes stream-created events correctly", async () => {
		const mockOnChainStream = {
			sender: "ST_SENDER",
			recipient: "ST_RECIPIENT",
			tokenContract: "ST_TOKEN",
			depositAmount: 5000n,
			ratePerBlock: 10n,
			startBlock: 20,
			endBlock: 520,
			claimedAmount: 0n,
			isPaused: false,
			isCancelled: false,
			createdAt: 99999,
		};

		stacksServiceMock.getStreamById.mockResolvedValue(mockOnChainStream);

		const event: StreamEvent = {
			eventType: "stream-created",
			txId: "tx01",
			eventIndex: 0,
			blockHeight: 30,
			streamId: 1,
			depositAmount: 5000n,
			feeAmount: 100n,
		};

		await (indexer as any).dispatchEvent(event);

		const indexed = indexer.getStream(1);
		expect(indexed).toBeDefined();
		expect(indexed?.sender).toBe("ST_SENDER");
		expect(indexed?.depositAmount).toBe(5000n);

		// Check lookups
		expect(indexer.getSenderStreams("ST_SENDER")).toHaveLength(1);
		expect(indexer.getRecipientStreams("ST_RECIPIENT")).toHaveLength(1);
	});

	it("processes stream-claimed, paused, resumed, and cancelled events", async () => {
		const entry: StreamIndexEntry = {
			id: 2,
			sender: "ST_SENDER",
			recipient: "ST_RECIPIENT",
			tokenContract: "ST_TOKEN",
			depositAmount: 1000n,
			ratePerBlock: 5n,
			startBlock: 10,
			endBlock: 210,
			claimedAmount: 0n,
			pausedAtBlock: null,
			cancelledAtBlock: null,
			isPaused: false,
			isCancelled: false,
			createdAt: 1234567,
		};
		(indexer as any).streams.set(2, entry);
		(indexer as any).addStreamToSenderRecipientMaps(entry);

		// Claim event
		const claimEvent: StreamEvent = {
			eventType: "stream-claimed",
			txId: "tx02",
			eventIndex: 0,
			blockHeight: 40,
			streamId: 2,
			claimedAmount: 150n,
		};
		await (indexer as any).dispatchEvent(claimEvent);
		expect(indexer.getStream(2)?.claimedAmount).toBe(150n);

		// Pause event
		const pauseEvent: StreamEvent = {
			eventType: "stream-paused",
			txId: "tx03",
			eventIndex: 1,
			blockHeight: 45,
			streamId: 2,
		};
		await (indexer as any).dispatchEvent(pauseEvent);
		expect(indexer.getStream(2)?.isPaused).toBe(true);
		expect(indexer.getStream(2)?.pausedAtBlock).toBe(45);

		// Resume event
		const resumeEvent: StreamEvent = {
			eventType: "stream-resumed",
			txId: "tx04",
			eventIndex: 0,
			blockHeight: 50,
			streamId: 2,
		};
		await (indexer as any).dispatchEvent(resumeEvent);
		expect(indexer.getStream(2)?.isPaused).toBe(false);
		expect(indexer.getStream(2)?.pausedAtBlock).toBeNull();

		// Cancel event
		const cancelEvent: StreamEvent = {
			eventType: "stream-cancelled",
			txId: "tx05",
			eventIndex: 2,
			blockHeight: 60,
			streamId: 2,
		};
		await (indexer as any).dispatchEvent(cancelEvent);
		expect(indexer.getStream(2)?.isCancelled).toBe(true);
		expect(indexer.getStream(2)?.cancelledAtBlock).toBe(60);

		// Active lists should no longer return it
		expect(indexer.getSenderStreams("ST_SENDER")).toHaveLength(0);
	});

	it("computes correct health status status based on block lag", async () => {
		(indexer as any).cursor = 100;

		// 1. lag <= 20
		stacksServiceMock.getCurrentBlockHeight.mockResolvedValue(115);
		let health = await indexer.getHealth();
		expect(health.status).toBe("ok");
		expect(health.lag).toBe(15);

		// 2. lag > 20 but <= 100
		stacksServiceMock.getCurrentBlockHeight.mockResolvedValue(150);
		health = await indexer.getHealth();
		expect(health.status).toBe("warn");
		expect(health.lag).toBe(50);

		// 3. lag > 100
		stacksServiceMock.getCurrentBlockHeight.mockResolvedValue(300);
		health = await indexer.getHealth();
		expect(health.status).toBe("error");
		expect(health.lag).toBe(200);
	});
});

describe("WebSocketServerManager Integration Tests", () => {
	let httpServer: any;
	let wsManager: WebSocketServerManager;
	let port = 0;

	beforeAll(async () => {
		httpServer = createServer();
		wsManager = new WebSocketServerManager(httpServer);
		wsManager.start();

		port = await new Promise<number>((resolve) => {
			httpServer.listen(0, () => {
				const address = httpServer.address();
				resolve((address as any).port);
			});
		});
	});

	afterAll(async () => {
		wsManager.stop();
		await new Promise<void>((resolve) => httpServer.close(() => resolve()));
	});

	it("handles client connection, subscription, and broadcasting", async () => {
		const client = new WebSocket(`ws://127.0.0.1:${port}`);

		await new Promise<void>((resolve) => client.once("open", resolve));

		const receivedMessages: any[] = [];
		client.on("message", (data) => {
			receivedMessages.push(JSON.parse(data.toString()));
		});

		// Subscribe to stream 42
		client.send(JSON.stringify({ type: "subscribe", streamId: 42 }));
		// Wait a bit to process subscription
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Broadcast a stream update
		const updateEvent = {
			eventType: "stream-claimed",
			streamId: 42,
			claimedAmount: 200n.toString(), // JSON compatible
		};
		wsManager.broadcastStreamUpdate(42, updateEvent);

		// Wait for message
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(receivedMessages).toHaveLength(1);
		expect(receivedMessages[0]).toEqual({
			type: "stream-update",
			streamId: 42,
			event: updateEvent,
		});

		// Unsubscribe
		client.send(JSON.stringify({ type: "unsubscribe", streamId: 42 }));
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Broadcast again
		wsManager.broadcastStreamUpdate(42, { ...updateEvent, claimedAmount: "300" });
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Should not receive another message
		expect(receivedMessages).toHaveLength(1);

		client.close();
	});
});
