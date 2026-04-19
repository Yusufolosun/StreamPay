export type AppConfig = {
	port: number;
	nodeEnv: "development" | "test" | "production";
	stacksNetwork: "devnet" | "testnet" | "mainnet";
	hiroApiUrl: string;
	hiroApiKey: string | null;
	contractStreamCore: string;
	contractStreamConditions: string;
	contractStreamNFT: string;
	databaseUrl: string;
	jwtSecret: string;
	corsOrigins: string[];
};

export const loadConfig = (): AppConfig => {
	return {
		port: 3001,
		nodeEnv: "development",
		stacksNetwork: "devnet",
		hiroApiUrl: "http://localhost:3999",
		hiroApiKey: null,
		contractStreamCore: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-core",
		contractStreamConditions: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-conditions",
		contractStreamNFT: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-nft",
		databaseUrl: "postgresql://postgres:password@localhost:5432/streampay?schema=public",
		jwtSecret: "",
		corsOrigins: ["http://localhost:3000"],
	};
};