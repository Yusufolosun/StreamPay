import { describe, expect, it } from "vitest";
import {
	blockToTimestamp,
	timestampToBlock,
	blocksToSeconds,
	secondsToBlocks,
	formatDuration,
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
});
