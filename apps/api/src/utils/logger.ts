type LoggerMeta = Record<string, unknown>;

type LogLevel = "debug" | "info" | "warn" | "error";

export type SerializedError = {
	name: string;
	message: string;
	stack?: string;
	cause?: unknown;
};

export type Logger = {
	child(context: LoggerMeta): Logger;
	debug(message: string, meta?: LoggerMeta): void;
	info(message: string, meta?: LoggerMeta): void;
	warn(message: string, meta?: LoggerMeta): void;
	error(message: string, meta?: LoggerMeta & { error?: unknown }): void;
};

const serializeError = (error: unknown): SerializedError | undefined => {
	if (error == null) {
		return undefined;
	}

	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack,
			cause: error.cause,
		};
	}

	if (typeof error === "object") {
		return {
			name: "Error",
			message: "Non-error value thrown",
			cause: error,
		};
	}

	return {
		name: "Error",
		message: String(error),
	};
};

const writeLog = (level: LogLevel, message: string, meta: LoggerMeta): void => {
	const entry = {
		level,
		message,
		timestamp: Date.now(),
		...meta,
	};

	const output = `${JSON.stringify(entry)}\n`;

	if (level === "error") {
		process.stderr.write(output);
		return;
	}

	process.stdout.write(output);
};

const createBaseLogger = (defaultMeta: LoggerMeta = {}): Logger => ({
	child(context: LoggerMeta): Logger {
		return createBaseLogger({ ...defaultMeta, ...context });
	},
	debug(message: string, meta: LoggerMeta = {}): void {
		writeLog("debug", message, { ...defaultMeta, ...meta });
	},
	info(message: string, meta: LoggerMeta = {}): void {
		writeLog("info", message, { ...defaultMeta, ...meta });
	},
	warn(message: string, meta: LoggerMeta = {}): void {
		writeLog("warn", message, { ...defaultMeta, ...meta });
	},
	error(message: string, meta: LoggerMeta & { error?: unknown } = {}): void {
		const { error, ...rest } = meta;
		const serializedError = serializeError(error);

		writeLog("error", message, {
			...defaultMeta,
			...rest,
			...(serializedError == null ? {} : { error: serializedError }),
		});
	},
});

export const createLogger = (defaultMeta: LoggerMeta = {}): Logger => createBaseLogger(defaultMeta);

export const logger = createLogger();

export { serializeError };

export const logger = {
	info(message: string, meta?: LoggerMeta): void {
		write("info", message, meta);
	},
	warn(message: string, meta?: LoggerMeta): void {
		write("warn", message, meta);
	},
	error(message: string, meta?: LoggerMeta): void {
		process.stderr.write(`${JSON.stringify({ level: "error", message, ...meta, timestamp: Date.now() })}\n`);
	},
};