/**
 * Cloudflare Worker Environment Resolution Helper
 *
 * Safely resolves bindings, environment variables, and secrets across:
 * 1. Cloudflare Workers native runtime `env` (from `cloudflare:workers` or request context)
 * 2. Astro's `locals.runtime.env`
 * 3. Astro's `astro:env/server`
 * 4. Node.js `process.env` (local dev fallback)
 */

import { CONTACT_FROM_EMAIL, CONTACT_TO_EMAIL, RESEND_API_KEY } from "astro:env/server";

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

	// 2. From astro:env/server schema
	if (key === "CONTACT_FROM_EMAIL" && CONTACT_FROM_EMAIL) return CONTACT_FROM_EMAIL;
	if (key === "CONTACT_TO_EMAIL" && CONTACT_TO_EMAIL) return CONTACT_TO_EMAIL;
	if (key === "RESEND_API_KEY" && RESEND_API_KEY) return RESEND_API_KEY;

	// 3. From globalThis (Cloudflare Worker runtime global)
	const globalEnv = (globalThis as any).env || (globalThis as any);
	if (globalEnv?.[key]) {
		return String(globalEnv[key]);
	}

	// 4. From Node.js process.env (Local Dev)
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
