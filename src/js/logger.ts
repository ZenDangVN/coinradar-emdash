/**
 * Unified Logger for CoinRadar EmDash
 *
 * Formats log messages for local terminal and pushes structured log
 * entries to Grafana Loki (https://loki.open.org.vn/loki/api/v1/push).
 */

import { pushToLoki, type LokiEntry, type LokiLogLevel, type LokiPushOptions } from "./loki";

export interface LogOptions extends LokiPushOptions {
	type?: string;
	labels?: Record<string, string>;
}

export interface HttpRequestLogMeta {
	method: string;
	path: string;
	status: number;
	durationMs: number;
	ip?: string;
	userAgent?: string;
	referer?: string;
	error?: string;
	[key: string]: any;
}

class Logger {
	/**
	 * Log general informational message
	 */
	info(message: string, meta?: Record<string, any>, options?: LogOptions): void {
		this.log("info", message, meta, options);
	}

	/**
	 * Log warning message
	 */
	warn(message: string, meta?: Record<string, any>, options?: LogOptions): void {
		this.log("warn", message, meta, options);
	}

	/**
	 * Log error message with optional Error object or metadata
	 */
	error(
		message: string,
		errOrMeta?: Error | Record<string, any> | unknown,
		options?: LogOptions,
	): void {
		let meta: Record<string, any> = {};
		if (errOrMeta instanceof Error) {
			meta = {
				error_name: errOrMeta.name,
				error_message: errOrMeta.message,
				stack: errOrMeta.stack,
			};
		} else if (typeof errOrMeta === "object" && errOrMeta !== null) {
			meta = { ...errOrMeta };
		} else if (errOrMeta !== undefined) {
			meta = { error_detail: String(errOrMeta) };
		}

		this.log("error", message, meta, options);
	}

	/**
	 * Log debug message
	 */
	debug(message: string, meta?: Record<string, any>, options?: LogOptions): void {
		this.log("debug", message, meta, options);
	}

	/**
	 * Log HTTP request (called by Astro middleware)
	 */
	request(meta: HttpRequestLogMeta, options?: LogOptions): void {
		const level: LokiLogLevel =
			meta.status >= 500 ? "error" : meta.status >= 400 ? "warn" : "info";

		const logType = "http_request";
		const summary = `${meta.method} ${meta.path} ${meta.status} - ${meta.durationMs}ms`;

		// Format console line
		const prefix = `[HTTP] ${meta.method} ${meta.path} => ${meta.status} (${meta.durationMs}ms)`;
		if (level === "error") {
			console.error(prefix, meta.error ?? "");
		} else if (level === "warn") {
			console.warn(prefix);
		} else {
			console.log(prefix);
		}

		const entry: LokiEntry = {
			timestamp: Date.now(),
			message: {
				message: summary,
				...meta,
			},
			labels: {
				level,
				type: logType,
				method: meta.method,
				status: String(meta.status),
				...options?.labels,
			},
		};

		pushToLoki(entry, {
			ctx: options?.ctx,
			locals: options?.locals,
			pushUrl: options?.pushUrl,
		});
	}

	private log(
		level: LokiLogLevel,
		message: string,
		meta?: Record<string, any>,
		options?: LogOptions,
	): void {
		const type = options?.type || "app";

		// 1. Output to local console
		const consoleMsg = `[${level.toUpperCase()}] [${type}] ${message}`;
		if (level === "error") {
			console.error(consoleMsg, meta && Object.keys(meta).length ? meta : "");
		} else if (level === "warn") {
			console.warn(consoleMsg, meta && Object.keys(meta).length ? meta : "");
		} else if (level === "debug") {
			console.debug(consoleMsg, meta && Object.keys(meta).length ? meta : "");
		} else {
			console.log(consoleMsg, meta && Object.keys(meta).length ? meta : "");
		}

		// 2. Prepare payload for Loki
		const entry: LokiEntry = {
			timestamp: Date.now(),
			message: {
				message,
				...(meta || {}),
			},
			labels: {
				level,
				type,
				...options?.labels,
			},
		};

		// 3. Dispatch to Loki
		pushToLoki(entry, {
			ctx: options?.ctx,
			locals: options?.locals,
			pushUrl: options?.pushUrl,
		});
	}
}

export const logger = new Logger();
export default logger;
