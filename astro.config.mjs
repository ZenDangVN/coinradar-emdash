import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2, sandbox } from "@emdash-cms/cloudflare";
import { formsPlugin } from "@emdash-cms/plugin-forms";
import webhookNotifier from "@emdash-cms/plugin-webhook-notifier";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";
import emdash from "emdash/astro";

// The production domain — feeds canonical URLs, OG tags, JSON-LD, robots.txt, RSS and llms.txt.
// Set SITE_URL in the build environment before deploying to production.
const site = process.env.SITE_URL ?? "https://example.com";

export default defineConfig({
	site,
	output: "server",
	adapter: cloudflare(),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto" }),
			storage: r2({ binding: "MEDIA" }),
			plugins: [formsPlugin()],
			sandboxed: [webhookNotifier],
			sandboxRunner: sandbox(),
			marketplace: "https://marketplace.emdashcms.com",
		}),
	],
	// The contact action's mail keys, declared through `astro:env` so they resolve at REQUEST time
	// on Cloudflare Workers (secrets exist only in the runtime env, which import.meta.env never sees).
	env: {
		schema: {
			RESEND_API_KEY: envField.string({ context: "server", access: "secret", optional: true }),
			CONTACT_TO_EMAIL: envField.string({ context: "server", access: "secret", optional: true }),
			CONTACT_FROM_EMAIL: envField.string({ context: "server", access: "secret", optional: true }),
		},
	},
	vite: {
		plugins: [tailwindcss()],
		// Stop inlining short scripts so they don't break under <ClientRouter /> view transitions.
		build: {
			assetsInlineLimit: 0,
		},
	},
	devToolbar: { enabled: false },
});
