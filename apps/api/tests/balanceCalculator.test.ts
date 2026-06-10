import { describe, expect, it } from "vitest";
import type { StreamIndexEntry } from "../src/services/streamIndexer.js";
import type { OnChainMilestoneStream } from "../src/types/stacks.js";
import {
	blockToTimestamp,
	timestampToBlock,
	blocksToSeconds,
	secondsToBlocks,
	formatDuration,
	calculateClaimableBalance,
	projectBalance,
	calculateMilestoneAmounts,
	getLiveBalanceProjection,
	setStreamIndexerForCalculator,
} from "../src/services/balanceCalculator.js";

describe("balanceCalculator utilities", () => {
	const currentBlock = 1000;
	const currentTimestamp = 1718000000000; // Mock current timestamp

	describe("blockToTimestamp", () => {
		it("returns correct timestamp for future blocks", () => {
			const targetBlock = 1010;
			const ts = blockToTimestamp(targetBlock, currentBlock, currentTimestamp);
			// 10 blocks * 5 seconds = 50 seconds = 50000 ms
			expect(ts).toBe(currentTimestamp + 50000);
		});

		it("returns correct timestamp for past blocks", () => {
			const targetBlock = 990;
			const ts = blockToTimestamp(targetBlock, currentBlock, currentTimestamp);
			expect(ts).toBe(currentTimestamp - 50000);
		});
	});

	describe("timestampToBlock", () => {
		it("returns correct block for future timestamps", () => {
			const targetTimestamp = currentTimestamp + 50000;
			const block = timestampToBlock(targetTimestamp, currentBlock, currentTimestamp);
			expect(block).toBe(1010);
		});

		it("returns correct block for past timestamps", () => {
			const targetTimestamp = currentTimestamp - 50000;
			const block = timestampToBlock(targetTimestamp, currentBlock, currentTimestamp);
			expect(block).toBe(990);
		});
	});

	describe("blocksToSeconds", () => {
		it("converts blocks to seconds", () => {
			expect(blocksToSeconds(10)).toBe(50);
			expect(blocksToSeconds(0)).toBe(0);
		});
	});

	describe("secondsToBlocks", () => {
		it("converts seconds to blocks with ceil", () => {
			expect(secondsToBlocks(5)).toBe(1);
			expect(secondsToBlocks(6)).toBe(2);
			expect(secondsToBlocks(0)).toBe(0);
		});
	});

	describe("formatDuration", () => {
		it("formats short durations", () => {
			expect(formatDuration(0)).toBe("0 seconds");
			expect(formatDuration(-10)).toBe("0 seconds");
			expect(formatDuration(45)).toBe("45 seconds");
			expect(formatDuration(120)).toBe("2 minutes");
		});

		it("formats complex durations", () => {
			// 7 days
			expect(formatDuration(7 * 86400)).toBe("7 days");
			// 3 months, 2 days
			expect(formatDuration(3 * 30 * 86400 + 2 * 86400)).toBe("3 months, 2 days");
		});
	});

	describe("calculateClaimableBalance", () => {
		const mockStream: StreamIndexEntry = {
			id: 1,
			sender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
			recipient: "ST2ST8J2J5370K6KKR0WGPPH8AHRW8XDXW2M5W16B",
			tokenContract: "",
			depositAmount: 1000000n,
			ratePerBlock: 100n,
			startBlock: 100,
			endBlock: 10100,
			claimedAmount: 0n,
			pausedAtBlock: null,
			cancelledAtBlock: null,
			isPaused: false,
			isCancelled: false,
			createdAt: 100,
		};

		it("returns correct accrued balance for active stream", () => {
			const balance = calculateClaimableBalance(mockStream, 200); // 100 blocks elapsed
			expect(balance).toBe(10000n);
		});

		it("returns 0n if stream is paused", () => {
			const pausedStream = { ...mockStream, isPaused: true };
			const balance = calculateClaimableBalance(pausedStream, 200);
			expect(balance).toBe(0n);
		});

		it("returns 0n if stream is cancelled", () => {
			const cancelledStream = { ...mockStream, isCancelled: true };
			const balance = calculateClaimableBalance(cancelledStream, 200);
			expect(balance).toBe(0n);
		});

		it("returns 0n if stream is expired", () => {
			const balance = calculateClaimableBalance(mockStream, 10150); // endBlock is 10100
			expect(balance).toBe(0n);
		});

		it("caps claimable balance to remaining deposit", () => {
			const activeStream = { ...mockStream, endBlock: 20000 };
			const balance = calculateClaimableBalance(activeStream, 15000); // 14900 blocks elapsed -> would be 1.49M, capped at 1M
			expect(balance).toBe(1000000n);
		});
	});

	describe("projectBalance", () => {
		const mockStream: StreamIndexEntry = {
			id: 1,
			sender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
			recipient: "ST2ST8J2J5370K6KKR0WGPPH8AHRW8XDXW2M5W16B",
			tokenContract: "",
			depositAmount: 1000000n,
			ratePerBlock: 100n,
			startBlock: 100,
			endBlock: 10100,
			claimedAmount: 0n,
			pausedAtBlock: null,
			cancelledAtBlock: null,
			isPaused: false,
			isCancelled: false,
			createdAt: 100,
		};

		it("projects correct accrued balance at future block height", () => {
			const balance = projectBalance(mockStream, 200);
			expect(balance).toBe(10000n);
		});

		it("projects correct balance at block height after endBlock (caps at deposit)", () => {
			const balance = projectBalance(mockStream, 15000);
			expect(balance).toBe(1000000n); // unlike calculateClaimableBalance which returns 0 when expired, projectBalance is used for live counter projection, so it should return the capped accrued balance.
		});
	});

	describe("calculateMilestoneAmounts", () => {
		const mockMilestoneStream: OnChainMilestoneStream = {
			sender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
			recipient: "ST2ST8J2J5370K6KKR0WGPPH8AHRW8XDXW2M5W16B",
			arbiter: null,
			totalAmount: 10000n,
			tokenContract: null,
			milestones: [
				{ label: "M1", basisPoints: 3000, isReleased: true, releasedAt: 150 },
				{ label: "M2", basisPoints: 7000, isReleased: false, releasedAt: null },
			],
			isCancelled: false,
			createdAt: 100,
		};

		it("calculates amounts correctly using basis points", () => {
			const amounts = calculateMilestoneAmounts(mockMilestoneStream);
			expect(amounts).toHaveLength(2);
			expect(amounts[0]).toEqual({
				label: "M1",
				basisPoints: 3000,
				amount: 3000n,
				isReleased: true,
				releasedAt: 150,
			});
			expect(amounts[1]).toEqual({
				label: "M2",
				basisPoints: 7000,
				amount: 7000n,
				isReleased: false,
				releasedAt: null,
			});
		});
	});

	describe("getLiveBalanceProjection", () => {
		const mockStream: StreamIndexEntry = {
			id: 42,
			sender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
			recipient: "ST2ST8J2J5370K6KKR0WGPPH8AHRW8XDXW2M5W16B",
			tokenContract: "",
			depositAmount: 1000000n,
			ratePerBlock: 100n,
			startBlock: 100,
			endBlock: 20000,
			claimedAmount: 0n,
			pausedAtBlock: null,
			cancelledAtBlock: null,
			isPaused: false,
			isCancelled: false,
			createdAt: 100,
		};

		it("returns 0n if no indexer set", () => {
			setStreamIndexerForCalculator(null);
			expect(getLiveBalanceProjection(42, 50)).toBe(0n);
		});

		it("projects balance using registered indexer and block time", () => {
			const mockIndexer = {
				getStream: (id: number) => (id === 42 ? mockStream : undefined),
				getCursor: () => 1000,
			};
			setStreamIndexerForCalculator(mockIndexer);
			
			// 50 seconds from now => 10 blocks.
			// targetBlock = 1000 + 10 = 1010.
			// elapsed from startBlock (100) = 910 blocks.
			// balance = 910 * 100 = 91000n.
			const projected = getLiveBalanceProjection(42, 50);
			expect(projected).toBe(91000n);
		});
	});
});
