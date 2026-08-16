/**
 * Cloudflare Worker Environment Resolution Helper
 *
 * Safely resolves bindings, environment variables, and secrets across:
 * 1. Astro Request Context (`locals.runtime.env`)
 * 2. Cloudflare Worker runtime global (`globalThis.env` or `globalThis`)
 * 3. Node.js `process.env` (Local Dev / Build)
 *
 * NOTE: Do NOT import virtual modules like 'astro:env/server' here because
 * this file is transitively imported by astro.config.mjs during the Astro config load phase.
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
	[key: string]: any;
}

/**
 * Resolves an environment variable value for Cloudflare Workers.
 */
export function getEnvVar(key: string, locals?: any): string | undefined {
	// 1. From Astro Request Context (Cloudflare Adapter)
	if (locals?.runtime?.env?.[key]) {
		return String(locals.runtime.env[key]);
	}

	// 2. From globalThis (Cloudflare Worker runtime global)
	const globalEnv = (globalThis as any).env || (globalThis as any);
	if (globalEnv?.[key] !== undefined && globalEnv[key] !== null) {
		return String(globalEnv[key]);
	}

	// 3. From Node.js process.env (Local Dev / Build)
	if (typeof process !== "undefined" && process.env?.[key]) {
		return process.env[key];
	}

	return undefined;
}

/**
 * Resolves a Cloudflare Worker binding (e.g. SEND_EMAIL, DB, MEDIA, SESSION).
 */
export function getBinding<T = any>(name: string, locals?: any): T | undefined {
	// 1. From Astro locals.runtime.env
	if (locals?.runtime?.env?.[name]) {
		return locals.runtime.env[name] as T;
	}

	// 2. From globalThis or globalThis.env
	const globalScope = globalThis as any;
	if (globalScope?.[name]) return globalScope[name] as T;
	if (globalScope?.env?.[name]) return globalScope.env[name] as T;

	// 3. From process.env fallback
	if (typeof process !== "undefined" && (process.env as any)?.[name]) {
		return (process.env as any)[name] as T;
	}

	return undefined;
}
