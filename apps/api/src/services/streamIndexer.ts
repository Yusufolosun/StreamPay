export type StreamIndexerRecord = {
	id: string;
	status: string;
};

export class StreamIndexer {
	public async listStreams(): Promise<StreamIndexerRecord[]> {
		return [];
	}
}