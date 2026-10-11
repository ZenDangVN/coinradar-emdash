/**
 * Astro Middleware - HTTP Access & Error Logging for CoinRadar EmDash
 *
 * Intercepts incoming requests, logs metrics (method, path, status, latency ms, IP)
 * and forwards them to Grafana Loki in the background via ctx.waitUntil (on Cloudflare Workers)
 * or non-blocking async dispatch.
 */

import { defineMiddleware } from "astro:middleware";
import { logger } from "@js/logger";

// File extensions to exclude from access logging so Loki isn't flooded with static assets
const STATIC_EXT_REGEX =
	/\.(ico|png|jpg|jpeg|webp|avif|gif|svg|css|js|mjs|woff|woff2|ttf|eot|map|txt|xml|webmanifest)$/i;

export const onRequest = defineMiddleware(async (context, next) => {
	const { url, request, locals } = context;
	const pathname = url.pathname;

	// Ignore internal Vite/Astro asset requests and static file extensions
	if (
		pathname.startsWith("/_astro/") ||
		pathname.startsWith("/@fs/") ||
		pathname.startsWith("/@vite/") ||
		pathname.startsWith("/node_modules/") ||
		pathname === "/favicon.ico" ||
		pathname === "/robots.txt" ||
		STATIC_EXT_REGEX.test(pathname)
	) {
		return next();
	}

	const startTime = performance.now();
	const method = request.method;
	const userAgent = request.headers.get("user-agent") ?? undefined;
	const referer = request.headers.get("referer") ?? undefined;

	// Resolve client IP (Cloudflare 'cf-connecting-ip' header or Astro.clientAddress)
	let ip: string | undefined = request.headers.get("cf-connecting-ip") ?? undefined;
	if (!ip) {
		try {
			ip = context.clientAddress;
		} catch {}
	}

	let response: Response;
	try {
		response = await next();
		const durationMs = Math.round(performance.now() - startTime);

		// Safe background request logging - never crash user request
		try {
			logger.request(
				{
					method,
					path: pathname + url.search,
					status: response.status,
					durationMs,
					ip,
					userAgent,
					referer,
				},
				{ locals, ctx: locals?.cfContext },
			);
		} catch (logErr) {
			console.warn("[middleware] Failed to dispatch request log:", logErr);
		}

		return response;
	} catch (err: any) {
		const durationMs = Math.round(performance.now() - startTime);

		try {
			logger.request(
				{
					method,
					path: pathname + url.search,
					status: 500,
					durationMs,
					ip,
					userAgent,
					referer,
					error: err?.message || String(err),
				},
				{ locals, ctx: locals?.cfContext },
			);
		} catch {}

		throw err;
	}
});
