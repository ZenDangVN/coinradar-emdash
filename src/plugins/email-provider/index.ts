/**
 * EmDash Email Provider Plugin
 *
 * Implements the exclusive "email:deliver" hook so EmDash CMS can dispatch
 * transactional emails (invitations, magic links, password resets).
 *
 * Conforms to Cloudflare Workers Send Email API:
 * https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
 */

import { getBinding, getEnvVar } from "@js/cfEnv";
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
					
					// Resolve sender address from Cloudflare runtime env
					const contactFromEnv = await getEnvVar("CONTACT_FROM_EMAIL");
					const from =
						message.from ||
						options.defaultFrom ||
						contactFromEnv ||
						"noreply@coin-radar.com";

					console.log(
						`[emdash-email-provider] Processing email (${source}) to: ${recipients.join(", ")} | From: ${from} | Subject: "${message.subject}"`,
					);

					// 1. Resolve Cloudflare Workers Send Email binding (SEND_EMAIL or EMAIL)
					const cfSendEmail = (await getBinding("SEND_EMAIL")) || (await getBinding("EMAIL"));

					if (cfSendEmail && typeof cfSendEmail.send === "function") {
						try {
							// Cloudflare send() accepts structured EmailMessageBuilder
							const response = await cfSendEmail.send({
								to: recipients,
								from: from,
								subject: message.subject,
								html: message.html ?? (message.text ? `<p>${message.text}</p>` : undefined),
								text: message.text,
								replyTo: message.replyTo,
							});
							console.log(
								`[emdash-email-provider] Successfully dispatched via Cloudflare Send Email (ID: ${response?.messageId ?? "ok"}) to ${recipients.join(", ")}`,
							);
							return;
						} catch (cfErr: any) {
							console.error(
								`[emdash-email-provider] Cloudflare Send Email failed | Code: ${cfErr?.code} | Message: ${cfErr?.message}`,
							);
						}
					}

					// 2. Fallback to Resend API if RESEND_API_KEY is configured in Cloudflare runtime env
					const apiKey = await getEnvVar("RESEND_API_KEY");

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

					// 3. Notice when binding is not resolved
					console.warn(
						`[emdash-email-provider] ⚠️ Notice: Cloudflare Send Email binding was not reachable.\n` +
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
