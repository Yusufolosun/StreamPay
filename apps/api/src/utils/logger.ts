type LoggerMeta = Record<string, unknown>;

const write = (level: string, message: string, meta: LoggerMeta = {}): void => {
	process.stdout.write(`${JSON.stringify({ level, message, ...meta, timestamp: Date.now() })}\n`);
};

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