import { calculateStreamBalance, type StreamBalanceInput, type StreamBalanceSnapshot } from "./balanceCalculator.js";

export type StreamLifecycleStatus = "active" | "paused" | "cancelled" | "completed";

export type IndexedStreamRecord = StreamBalanceInput & {
	id: string;
	sender: string;
	recipient: string;
	tokenContract: string;
};

export type IndexedStreamView = IndexedStreamRecord & {
	status: StreamLifecycleStatus;
	balance: StreamBalanceSnapshot;
};

const resolveStatus = (record: IndexedStreamRecord, balance: StreamBalanceSnapshot): StreamLifecycleStatus => {
	if (record.cancelledAtBlock != null) {
		return "cancelled";
	}

	if (record.pausedAtBlock != null) {
		return "paused";
	}

	if (balance.claimableAmount === 0n && balance.remainingAmount === 0n) {
		return "completed";
	}

	return "active";
};

export const summarizeStream = (record: IndexedStreamRecord): IndexedStreamView => {
	const balance = calculateStreamBalance(record);

	return {
		...record,
		status: resolveStatus(record, balance),
		balance,
	};
};

export class StreamIndexer {
	public summarizeStream(record: IndexedStreamRecord): IndexedStreamView {
		return summarizeStream(record);
	}

	public summarizeStreams(records: IndexedStreamRecord[]): IndexedStreamView[] {
		return records.map((record) => summarizeStream(record));
	}
}