import { z } from "zod";

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

export class ConfigError extends Error {
	public constructor(public readonly problems: string[]) {
		super(`Invalid API environment configuration:\n${problems.map((problem) => `- ${problem}`).join("\n")}`);
		this.name = "ConfigError";
	}
}

const contractAddressSchema = z
	.string()
	.trim()
	.regex(/^S[PT][0-9A-Z]{20,}\.[a-z0-9-]+$/i, "must be a valid Stacks contract principal");

const corsOriginsSchema = z
	.string()
	.trim()
	.transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean))
	.refine((origins) => origins.length > 0, "must contain at least one origin");

const envSchema = z.object({
	PORT: z.coerce.number().int().min(1).max(65_535),
	NODE_ENV: z.enum(["development", "test", "production"]),
	STACKS_NETWORK: z.enum(["devnet", "testnet", "mainnet"]),
	HIRO_API_URL: z.string().trim().url(),
	HIRO_API_KEY: z.string().trim().min(1).optional(),
	CONTRACT_STREAM_CORE: contractAddressSchema,
	CONTRACT_STREAM_CONDITIONS: contractAddressSchema,
	CONTRACT_STREAM_NFT: contractAddressSchema,
	DATABASE_URL: z.string().trim().refine((value) => value.startsWith("postgresql://"), {
		message: "must use the postgresql:// scheme",
	}),
	JWT_SECRET: z.string().trim().min(32),
	CORS_ORIGINS: corsOriginsSchema,
});

const readValue = (value: string | undefined): string | undefined => {
	if (value == null) {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};

const rawEnv = (): Record<string, string | undefined> => ({
	PORT: readValue(process.env.PORT),
	NODE_ENV: readValue(process.env.NODE_ENV),
	STACKS_NETWORK: readValue(process.env.STACKS_NETWORK),
	HIRO_API_URL: readValue(process.env.HIRO_API_URL),
	HIRO_API_KEY: readValue(process.env.HIRO_API_KEY),
	CONTRACT_STREAM_CORE: readValue(process.env.CONTRACT_STREAM_CORE),
	CONTRACT_STREAM_CONDITIONS: readValue(process.env.CONTRACT_STREAM_CONDITIONS),
	CONTRACT_STREAM_NFT: readValue(process.env.CONTRACT_STREAM_NFT),
	DATABASE_URL: readValue(process.env.DATABASE_URL),
	JWT_SECRET: readValue(process.env.JWT_SECRET),
	CORS_ORIGINS: readValue(process.env.CORS_ORIGINS),
});

const requiredVariables = [
	"PORT",
	"NODE_ENV",
	"STACKS_NETWORK",
	"HIRO_API_URL",
	"CONTRACT_STREAM_CORE",
	"CONTRACT_STREAM_CONDITIONS",
	"CONTRACT_STREAM_NFT",
	"DATABASE_URL",
	"JWT_SECRET",
	"CORS_ORIGINS",
] as const;

const collectMissingVariables = (env: Record<string, string | undefined>): string[] => {
	const missing = requiredVariables.filter((name) => env[name] == null);

	if (env.NODE_ENV === "production" && env.HIRO_API_KEY == null) {
		missing.push("HIRO_API_KEY");
	}

	return missing;
};

const collectMalformedVariables = (issues: z.ZodIssue[]): string[] => {
	const malformed = new Set<string>();

	for (const issue of issues) {
		const key = issue.path[0];
		if (typeof key === "string") {
			malformed.add(key);
		}
	}

	return [...malformed];
};

export const loadConfig = (): AppConfig => {
	const env = rawEnv();
	const missingVariables = collectMissingVariables(env);
	const parsed = envSchema.safeParse(env);
	const malformedVariables = parsed.success ? [] : collectMalformedVariables(parsed.error.issues).filter((name) => !missingVariables.includes(name));

	if (missingVariables.length > 0 || malformedVariables.length > 0) {
		const problems: string[] = [];

		if (missingVariables.length > 0) {
			problems.push(`Missing variables: ${missingVariables.join(", ")}`);
		}

		if (malformedVariables.length > 0) {
			problems.push(`Malformed variables: ${malformedVariables.join(", ")}`);
		}

		throw new ConfigError(problems);
	}

	const config = parsed.success ? parsed.data : null;

	if (config == null) {
		throw new ConfigError(["Unable to parse API environment configuration."]);
	}

	return {
		port: config.PORT,
		nodeEnv: config.NODE_ENV,
		stacksNetwork: config.STACKS_NETWORK,
		hiroApiUrl: config.HIRO_API_URL,
		hiroApiKey: config.HIRO_API_KEY ?? null,
		contractStreamCore: config.CONTRACT_STREAM_CORE,
		contractStreamConditions: config.CONTRACT_STREAM_CONDITIONS,
		contractStreamNFT: config.CONTRACT_STREAM_NFT,
		databaseUrl: config.DATABASE_URL,
		jwtSecret: config.JWT_SECRET,
		corsOrigins: config.CORS_ORIGINS,
	};
};