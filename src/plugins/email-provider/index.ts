/**
 * EmDash Email Provider Plugin
 *
 * Implements the exclusive "email:deliver" hook so EmDash CMS can dispatch
 * transactional emails (invitations, magic links, password resets).
 */

import type { EmailDeliverEvent, PluginContext, PluginDescriptor, ResolvedPlugin } from "emdash";
import { definePlugin } from "emdash";

export interface EmailProviderOptions {
	defaultFrom?: string;
}

/**
 * Descriptor factory for astro.config.mjs
 */
export function emailProviderPlugin(
	options: EmailProviderOptions = {},
): PluginDescriptor<EmailProviderOptions> {
	return {
		id: "emdash-email-provider",
		version: "1.0.0",
		format: "native",
		entrypoint: "@/plugins/email-provider/index.ts",
		capabilities: ["hooks.email-transport:register", "network:request"],
		allowedHosts: ["*"],
		options,
	};
}

/**
 * Plugin definition with the exclusive email:deliver hook handler
 */
export function createPlugin(options: EmailProviderOptions = {}): ResolvedPlugin {
	return definePlugin({
		id: "emdash-email-provider",
		version: "1.0.0",
		capabilities: ["hooks.email-transport:register", "network:request"],
		allowedHosts: ["*"],

		hooks: {
			"email:deliver": {
				exclusive: true,
				handler: async (event: EmailDeliverEvent, ctx: PluginContext) => {
					const { message, source } = event;
					const recipients = Array.isArray(message.to) ? message.to : [message.to];
					const from =
						message.from ||
						options.defaultFrom ||
						process.env.CONTACT_FROM_EMAIL ||
						"admin@coinradar.dev";

					console.log(
						`[emdash-email-provider] Delivering email (${source}) to ${recipients.join(", ")} | Subject: ${message.subject}`,
					);

					// If Resend API key is present in environment, dispatch via HTTP
					const apiKey = process.env.RESEND_API_KEY;
					if (apiKey && ctx.http) {
						try {
							const res = await ctx.http.fetch("https://api.resend.com/emails", {
								method: "POST",
								headers: {
									Authorization: `Bearer ${apiKey}`,
									"Content-Type": "application/json",
								},
								body: JSON.stringify({
									from,
									to: recipients,
									subject: message.subject,
									html: message.html ?? `<p>${message.text ?? ""}</p>`,
									text: message.text,
								}),
							});
							if (!res.ok) {
								const detail = await res.text().catch(() => "");
								console.error(`[emdash-email-provider] Delivery failed (${res.status}):`, detail);
							} else {
								console.log(`[emdash-email-provider] Successfully delivered email via Resend.`);
							}
						} catch (err) {
							console.error("[emdash-email-provider] Network error delivering email:", err);
						}
					}
				},
			},
		},
	});
}

export default createPlugin;
