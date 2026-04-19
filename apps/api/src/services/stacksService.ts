export type StacksHealth = {
	reachable: boolean;
	blockHeight: number;
};

type StacksStatusPayload = Record<string, unknown>;

const extractBlockHeight = (payload: StacksStatusPayload): number => {
	const candidates = [payload.stacks_tip_height, payload.burn_block_height, payload.block_height, payload.height];

	for (const candidate of candidates) {
		if (typeof candidate === "number" && Number.isFinite(candidate) && candidate >= 0) {
			return candidate;
		}

		if (typeof candidate === "string") {
			const parsed = Number(candidate);
			if (Number.isFinite(parsed) && parsed >= 0) {
				return parsed;
			}
		}
	}

	return 0;
};

export class StacksService {
	public constructor(
		private readonly baseUrl: string,
		private readonly apiKey: string | null = null,
	) {}

	private async fetchStatus(): Promise<StacksStatusPayload> {
		const statusUrl = new URL("/extended/v1/status", this.baseUrl);
		const response = await fetch(statusUrl, {
			headers: this.apiKey == null ? undefined : { "x-api-key": this.apiKey },
			signal: AbortSignal.timeout(2_000),
		});

		if (!response.ok) {
			throw new Error(`Stacks API responded with ${response.status}`);
		}

		return (await response.json()) as StacksStatusPayload;
	}

	public async getHealth(): Promise<StacksHealth> {
		try {
			const status = await this.fetchStatus();

			return {
				reachable: true,
				blockHeight: extractBlockHeight(status),
			};
		} catch {
			return {
				reachable: false,
				blockHeight: 0,
			};
		}
	}
}