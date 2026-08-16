/**
 * EmDash Email Provider Plugin
 *
 * Implements the exclusive "email:deliver" hook so EmDash CMS can dispatch
 * transactional emails (invitations, magic links, password resets).
 *
 * Transport Priority:
 * 1. Cloudflare Workers Send Email (SEND_EMAIL binding in production runtime)
 * 2. Resend API (via ctx.http if RESEND_API_KEY is configured in environment)
 * 3. Local Dev fallback (logs full email payload + action link to console)
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
						`[emdash-email-provider] Processing email (${source}) to: ${recipients.join(", ")} | Subject: "${message.subject}"`,
					);

					// 1. Check for Cloudflare Workers SEND_EMAIL binding (on Cloudflare runtime)
					const cfSendEmail =
						(globalThis as any).SEND_EMAIL ||
						(globalThis as any).env?.SEND_EMAIL ||
						(process.env as any).SEND_EMAIL;

					if (cfSendEmail && typeof cfSendEmail.send === "function") {
						try {
							for (const recipient of recipients) {
								await cfSendEmail.send({
									to: [{ email: recipient }],
									from: { email: from },
									subject: message.subject,
									html: message.html ?? message.text,
									text: message.text,
									replyTo: message.replyTo,
								});
							}
							console.log(
								`[emdash-email-provider] Successfully delivered email via Cloudflare Send Email binding to ${recipients.join(", ")}`,
							);
							return;
						} catch (cfErr) {
							console.error(
								`[emdash-email-provider] Cloudflare Send Email binding failed:`,
								cfErr,
							);
						}
					}

					// 2. Fallback to Resend API if RESEND_API_KEY is configured
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
								console.error(
									`[emdash-email-provider] Resend delivery failed (${res.status}):`,
									detail,
								);
							} else {
								console.log(
									`[emdash-email-provider] Successfully delivered email via Resend API to ${recipients.join(", ")}`,
								);
								return;
							}
						} catch (err) {
							console.error("[emdash-email-provider] Network error delivering email via Resend:", err);
						}
					}

					// 3. In local development without live credentials
					console.warn(
						`[emdash-email-provider] ⚠️ Dev Mode Notice: No live email service (Cloudflare SEND_EMAIL binding or RESEND_API_KEY) was reachable in this environment.\n` +
							`Message details:\n` +
							`  From: ${from}\n` +
							`  To: ${recipients.join(", ")}\n` +
							`  Subject: ${message.subject}\n` +
							`  Text content:\n${message.text ?? "(HTML only)"}`,
					);
				},
			},
		},
	});
}

export default createPlugin;
