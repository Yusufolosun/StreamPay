/**
 * ════════════════════════════════════════════════════════════════════════════
 * PRECISION RULE: All amount arithmetic uses bigint. Never convert to Number
 * for arithmetic. Only to string for API responses, only to Number for display percentages.
 * ════════════════════════════════════════════════════════════════════════════
 */

import type { StreamIndexEntry } from "./streamIndexer.js";
import type { OnChainMilestoneStream } from "../types/stacks.js";

export type StreamProgress = {
	percentComplete: number;
	blocksElapsed: number;
	blocksRemaining: number;
	estimatedEndDate: Date;
	totalStreamed: bigint;
	totalClaimed: bigint;
	totalUnclaimed: bigint;
};

export type MilestoneAmounts = {
	label: string;
	basisPoints: number;
	amount: bigint;
	isReleased: boolean;
	releasedAt: number | null;
};

export type StreamBalanceInput = {
	startBlock: number;
	currentBlock: number;
	ratePerBlock: bigint;
	fundedAmount?: bigint;
	withdrawnAmount?: bigint;
	pausedAtBlock?: number | null;
	cancelledAtBlock?: number | null;
};


export type StreamBalanceSnapshot = {
	streamedBlocks: number;
	effectiveBlock: number;
	streamedAmount: bigint;
	cappedAmount: bigint;
	withdrawnAmount: bigint;
	claimableAmount: bigint;
	remainingAmount: bigint;
};

const minBigInt = (left: bigint, right: bigint): bigint => (left < right ? left : right);

const clampBlockHeight = (value: number, lowerBound: number): number => {
	if (!Number.isFinite(value)) {
		return lowerBound;
	}

	return value < lowerBound ? lowerBound : Math.floor(value);
};

const resolveEffectiveBlock = (input: StreamBalanceInput): number => {
	let effectiveBlock = clampBlockHeight(input.currentBlock, input.startBlock);

	if (typeof input.pausedAtBlock === "number") {
		effectiveBlock = Math.min(effectiveBlock, clampBlockHeight(input.pausedAtBlock, input.startBlock));
	}

	if (typeof input.cancelledAtBlock === "number") {
		effectiveBlock = Math.min(effectiveBlock, clampBlockHeight(input.cancelledAtBlock, input.startBlock));
	}

	return effectiveBlock;
};

export const calculateStreamBalance = (input: StreamBalanceInput): StreamBalanceSnapshot => {
	const effectiveBlock = resolveEffectiveBlock(input);
	const streamedBlocks = Math.max(0, effectiveBlock - input.startBlock);
	const streamedAmount = input.ratePerBlock * BigInt(streamedBlocks);
	const cappedAmount = input.fundedAmount == null ? streamedAmount : minBigInt(streamedAmount, input.fundedAmount);
	const withdrawnAmount = input.withdrawnAmount ?? 0n;
	const claimableAmount = cappedAmount > withdrawnAmount ? cappedAmount - withdrawnAmount : 0n;
	const remainingAmount = input.fundedAmount == null ? 0n : input.fundedAmount > cappedAmount ? input.fundedAmount - cappedAmount : 0n;

	return {
		streamedBlocks,
		effectiveBlock,
		streamedAmount,
		cappedAmount,
		withdrawnAmount,
		claimableAmount,
		remainingAmount,
	};
};

export const calculateClaimableBalance = (stream: StreamIndexEntry, currentBlock: number): bigint => {
	if (stream.isPaused || stream.isCancelled || currentBlock >= stream.endBlock) {
		return 0n;
	}

	const lastCheckpointBlock = stream.startBlock + Number(stream.claimedAmount / stream.ratePerBlock);
	const elapsed = BigInt(Math.max(0, currentBlock - lastCheckpointBlock));
	const accrued = elapsed * stream.ratePerBlock;
	const remaining = stream.depositAmount - stream.claimedAmount;

	return accrued < remaining ? accrued : remaining;
};


export const calculateRemainingBalance = (input: StreamBalanceInput): bigint => {
	return calculateStreamBalance(input).remainingAmount;
};

export const blockToTimestamp = (blockHeight: number, currentBlock: number, currentTimestamp = Date.now()): number => {
	return currentTimestamp + (blockHeight - currentBlock) * 5 * 1000;
};

export const timestampToBlock = (timestamp: number, currentBlock: number, currentTimestamp = Date.now()): number => {
	const secondsDiff = Math.round((timestamp - currentTimestamp) / 1000);
	return currentBlock + Math.floor(secondsDiff / 5);
};

export const blocksToSeconds = (blocks: number): number => {
	return blocks * 5;
};

export const secondsToBlocks = (seconds: number): number => {
	return Math.ceil(seconds / 5);
};

export const formatDuration = (seconds: number): string => {
	if (seconds <= 0) return "0 seconds";
	const secondsInMinute = 60;
	const secondsInHour = 3600;
	const secondsInDay = 86400;
	const secondsInMonth = 30 * secondsInDay;
	const secondsInYear = 365 * secondsInDay;

	let remaining = seconds;
	const parts: string[] = [];

	if (remaining >= secondsInYear) {
		const years = Math.floor(remaining / secondsInYear);
		remaining %= secondsInYear;
		parts.push(`${years} year${years > 1 ? "s" : ""}`);
	}
	if (remaining >= secondsInMonth) {
		const months = Math.floor(remaining / secondsInMonth);
		remaining %= secondsInMonth;
		parts.push(`${months} month${months > 1 ? "s" : ""}`);
	}
	if (remaining >= secondsInDay) {
		const days = Math.floor(remaining / secondsInDay);
		remaining %= secondsInDay;
		parts.push(`${days} day${days > 1 ? "s" : ""}`);
	}
	if (remaining >= secondsInHour) {
		const hours = Math.floor(remaining / secondsInHour);
		remaining %= secondsInHour;
		parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
	}
	if (remaining >= secondsInMinute) {
		const minutes = Math.floor(remaining / secondsInMinute);
		remaining %= secondsInMinute;
		parts.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);
	}
	if (remaining > 0 && parts.length === 0) {
		parts.push(`${remaining} second${remaining > 1 ? "s" : ""}`);
	}

	return parts.slice(0, 2).join(", ");
};

export const projectBalance = (stream: StreamIndexEntry, atBlock: number): bigint => {
	const input: StreamBalanceInput = {
		startBlock: stream.startBlock,
		currentBlock: atBlock,
		ratePerBlock: stream.ratePerBlock,
		fundedAmount: stream.depositAmount,
		withdrawnAmount: stream.claimedAmount,
		pausedAtBlock: stream.pausedAtBlock,
		cancelledAtBlock: stream.cancelledAtBlock,
	};
	return calculateStreamBalance(input).claimableAmount;
};

export const calculateMilestoneAmounts = (milestoneStream: OnChainMilestoneStream): MilestoneAmounts[] => {
	return milestoneStream.milestones.map((m) => {
		const amount = (milestoneStream.totalAmount * BigInt(m.basisPoints)) / 10000n;
		return {
			label: m.label,
			basisPoints: m.basisPoints,
			amount,
			isReleased: m.isReleased,
			releasedAt: m.releasedAt,
		};
	});
};

let activeStreamIndexer: any = null;

export const setStreamIndexerForCalculator = (indexer: any): void => {
	activeStreamIndexer = indexer;
};

export const getLiveBalanceProjection = (streamId: number, secondsFromNow: number): bigint => {
	if (!activeStreamIndexer) {
		return 0n;
	}
	const stream = activeStreamIndexer.getStream(streamId);
	if (!stream) {
		return 0n;
	}
	const blocks = secondsToBlocks(secondsFromNow);
	const currentBlock = activeStreamIndexer.getCursor();
	const targetBlock = currentBlock + blocks;
	return projectBalance(stream, targetBlock);
};