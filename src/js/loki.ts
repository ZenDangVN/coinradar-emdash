/**
 * Grafana Loki Push Client for CoinRadar EmDash
 *
 * Implements HTTP Push API:
 * POST /loki/api/v1/push
 * Standard: https://grafana.com/docs/loki/latest/reference/api/#push-log-entries-to-loki
 */

import { getEnvVar } from "@js/cfEnv";

export type LokiLogLevel = "info" | "warn" | "error" | "debug";

export interface LokiStreamLabels {
	app?: string;
	env?: string;
	level?: LokiLogLevel;
	type?: string;
	[key: string]: string | undefined;
}

export interface LokiEntry {
	/** Unix timestamp in ms or nanoseconds string. Defaults to Date.now() */
	timestamp?: number | bigint | string;
	/** Log message string or structured metadata object */
	message: string | Record<string, any>;
	/** Labels for the stream (e.g. app, level, env, type) */
	labels?: LokiStreamLabels;
}

export interface LokiPushOptions {
	/** Cloudflare Worker ExecutionContext or Astro locals with runtime context */
	ctx?: { waitUntil?: (promise: Promise<any>) => void } | any;
	locals?: any;
	pushUrl?: string;
	app?: string;
	env?: string;
}

const DEFAULT_LOKI_URL = "https://loki.open.org.vn/loki/api/v1/push";
const DEFAULT_APP = "coinradar-emdash";

// Counter to ensure strictly increasing nanosecond timestamps when multiple logs occur in same ms
let lastNanoTimestamp = 0n;

function getNanosecondTimestamp(ts?: number | bigint | string): string {
	let nano: bigint;
	if (typeof ts === "string") {
		return ts;
	} else if (typeof ts === "bigint") {
		nano = ts;
	} else if (typeof ts === "number") {
		nano = BigInt(ts) * 1_000_000n;
	} else {
		nano = BigInt(Date.now()) * 1_000_000n;
	}

	if (nano <= lastNanoTimestamp) {
		nano = lastNanoTimestamp + 1n;
	}
	lastNanoTimestamp = nano;
	return nano.toString();
}

/**
 * Normalizes label key-values into valid string values.
 */
function sanitizeLabels(labels: LokiStreamLabels = {}): Record<string, string> {
	const sanitized: Record<string, string> = {};
	for (const [key, val] of Object.entries(labels)) {
		if (val !== undefined && val !== null && val !== "") {
			sanitized[key] = String(val);
		}
	}
	return sanitized;
}

/**
 * Builds standard Loki push payload grouped by stream labels.
 */
export function buildLokiPayload(
	entries: LokiEntry[],
	defaultLabels: LokiStreamLabels = {},
): { streams: Array<{ stream: Record<string, string>; values: Array<[string, string]> }> } {
	const streamMap = new Map<string, { stream: Record<string, string>; values: Array<[string, string]> }>();

	for (const entry of entries) {
		const mergedLabels = sanitizeLabels({
			...defaultLabels,
			...entry.labels,
		});

		// Sort keys to form a stable stream key identifier
		const streamKey = Object.entries(mergedLabels)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([k, v]) => `${k}="${v}"`)
			.join(",");

		const tsStr = getNanosecondTimestamp(entry.timestamp);
		const messageStr =
			typeof entry.message === "string"
				? entry.message
				: JSON.stringify(entry.message);

		if (!streamMap.has(streamKey)) {
			streamMap.set(streamKey, {
				stream: mergedLabels,
				values: [],
			});
		}

		streamMap.get(streamKey)!.values.push([tsStr, messageStr]);
	}

	return {
		streams: Array.from(streamMap.values()),
	};
}

/**
 * Sends one or more log entries to Grafana Loki.
 * Safely handles execution context via ctx.waitUntil on Cloudflare Workers.
 */
export async function pushToLoki(
	entries: LokiEntry | LokiEntry[],
	options: LokiPushOptions = {},
): Promise<boolean> {
	const entryList = Array.isArray(entries) ? entries : [entries];
	if (entryList.length === 0) return true;

	const locals = options.locals;
	const enabledStr = (await getEnvVar("LOKI_ENABLED", locals)) ?? "true";
	if (enabledStr === "false" || enabledStr === "0") {
		return true; // Loki push disabled via env
	}

	const pushUrl =
		options.pushUrl ||
		(await getEnvVar("LOKI_PUSH_URL", locals)) ||
		DEFAULT_LOKI_URL;

	const app =
		options.app ||
		(await getEnvVar("LOKI_APP", locals)) ||
		DEFAULT_APP;

	const env =
		options.env ||
		(await getEnvVar("LOKI_ENV", locals)) ||
		(typeof process !== "undefined" && process.env?.NODE_ENV) ||
		"production";

	const payload = buildLokiPayload(entryList, {
		app,
		env,
		level: "info",
	});

	const sendPromise = (async () => {
		try {
			const headers: Record<string, string> = {
				"Content-Type": "application/json",
			};

			// Optional basic auth or token support
			const authUser = await getEnvVar("LOKI_AUTH_USER", locals);
			const authPass = await getEnvVar("LOKI_AUTH_PASSWORD", locals);
			const authToken = await getEnvVar("LOKI_AUTH_TOKEN", locals);

			if (authUser && authPass) {
				const basic = typeof btoa === "function" ? btoa(`${authUser}:${authPass}`) : Buffer.from(`${authUser}:${authPass}`).toString("base64");
				headers["Authorization"] = `Basic ${basic}`;
			} else if (authToken) {
				headers["Authorization"] = `Bearer ${authToken}`;
			}

			const res = await fetch(pushUrl, {
				method: "POST",
				headers,
				body: JSON.stringify(payload),
				signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined,
			});

			if (!res.ok && res.status !== 204) {
				const errorText = await res.text().catch(() => "");
				console.warn(
					`[Loki] Push failed with HTTP ${res.status}: ${errorText || res.statusText}`,
				);
				return false;
			}
			return true;
		} catch (err: any) {
			// Never let Loki push exceptions bubble up to crash caller
			console.warn(`[Loki] Network error pushing logs to ${pushUrl}:`, err?.message || err);
			return false;
		}
	})();

	// In Cloudflare Workers, use waitUntil if available so response isn't blocked
	const executionContext =
		options.ctx?.waitUntil
			? options.ctx
			: locals?.runtime?.ctx?.waitUntil
				? locals.runtime.ctx
				: null;

	if (executionContext && typeof executionContext.waitUntil === "function") {
		try {
			executionContext.waitUntil(sendPromise);
			return true;
		} catch {
			// fallback to unawaited promise
		}
	}

	// For local dev / non-Worker environments: attach catch handler
	sendPromise.catch(() => {});
	return true;
}
