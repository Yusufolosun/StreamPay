export type StreamBalanceInput = {
	startBlock: number;
	currentBlock: number;
	ratePerBlock: bigint;
};

export const calculateClaimableBalance = (_input: StreamBalanceInput): bigint => {
	return 0n;
};