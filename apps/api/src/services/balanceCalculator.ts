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

export const calculateClaimableBalance = (input: StreamBalanceInput): bigint => {
	return calculateStreamBalance(input).claimableAmount;
};

export const calculateRemainingBalance = (input: StreamBalanceInput): bigint => {
	return calculateStreamBalance(input).remainingAmount;
};