/**
 * Cloudflare Worker Environment Resolution Helper
 *
 * Safely resolves bindings, environment variables, and secrets across:
 * 1. Cloudflare Workers native `cloudflare:workers` (env export)
 * 2. Astro Context (`locals.cfContext` in @astrojs/cloudflare v14+)
 * 3. Cloudflare Worker runtime global (`globalThis.env` or `globalThis`)
 * 4. Node.js `process.env` (Local Dev / Build)
 */

export interface WorkerEnv {
	SEND_EMAIL?: any;
	EMAIL?: any;
	DB?: any;
	MEDIA?: any;
	SESSION?: any;
	SITE_URL?: string;
	CONTACT_FROM_EMAIL?: string;
	CONTACT_TO_EMAIL?: string;
	RESEND_API_KEY?: string;
	LOKI_PUSH_URL?: string;
	LOKI_ENABLED?: string | boolean;
	LOKI_APP?: string;
	LOKI_ENV?: string;
	[key: string]: any;
}

/**
 * Resolves an environment variable value for Cloudflare Workers.
 */
export async function getEnvVar(key: string, locals?: any): Promise<string | undefined> {
	// 1. Try native cloudflare:workers dynamic import (workerd runtime)
	try {
		const cf = await import("cloudflare:workers");
		if (cf?.env?.[key] !== undefined && cf.env[key] !== null) {
			return String(cf.env[key]);
		}
	} catch {}

	// 2. From Astro locals.cfContext (Astro v6+ Cloudflare adapter)
	try {
		if (locals?.cfContext?.env?.[key] !== undefined && locals.cfContext.env[key] !== null) {
			return String(locals.cfContext.env[key]);
		}
	} catch {}

	// 3. From globalThis or globalThis.env
	try {
		const globalEnv = (globalThis as any).env || (globalThis as any);
		if (globalEnv?.[key] !== undefined && globalEnv[key] !== null) {
			return String(globalEnv[key]);
		}
	} catch {}

	// 4. From Node.js process.env
	if (typeof process !== "undefined" && process.env?.[key]) {
		return process.env[key];
	}

	return undefined;
}

/**
 * Resolves a Cloudflare Worker binding (e.g. SEND_EMAIL, DB, MEDIA, SESSION).
 */
export async function getBinding<T = any>(name: string, locals?: any): Promise<T | undefined> {
	// 1. Try native cloudflare:workers dynamic import (workerd runtime)
	try {
		const cf = await import("cloudflare:workers");
		if (cf?.env?.[name]) {
			return cf.env[name] as T;
		}
	} catch {}

	// 2. From Astro locals.cfContext (Astro v6+ Cloudflare adapter)
	try {
		if (locals?.cfContext?.env?.[name]) {
			return locals.cfContext.env[name] as T;
		}
	} catch {}

	// 3. From globalThis or globalThis.env
	try {
		const globalScope = globalThis as any;
		if (globalScope?.[name]) return globalScope[name] as T;
		if (globalScope?.env?.[name]) return globalScope.env[name] as T;
	} catch {}

	// 4. From process.env fallback
	if (typeof process !== "undefined" && (process.env as any)?.[name]) {
		return (process.env as any)[name] as T;
	}

	return undefined;
}
