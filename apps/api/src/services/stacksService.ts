export type StacksHealth = {
	reachable: boolean;
	blockHeight: number;
};

export class StacksService {
	public constructor(private readonly _baseUrl: string) {}

	public async getHealth(): Promise<StacksHealth> {
		return {
			reachable: false,
			blockHeight: 0,
		};
	}
}