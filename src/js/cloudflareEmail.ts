/**
 * * Cloudflare Workers Send Email Helper.
 * Uses the native SEND_EMAIL binding to dispatch outbound emails.
 */
import type { ContactEmail } from "@js/contact";

export interface CloudflareEmailConfig {
  to: string;
  from: string;
}

export type SendResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Sends a contact email via Cloudflare's native send_email binding.
 * 
 * @param email   the subject, html body, and replyTo address
 * @param config  destination (to) and sender (from) addresses
 * @param binding the Cloudflare Workers SEND_EMAIL binding
 */
export async function sendContactEmailViaCloudflare(
  email: ContactEmail,
  config: CloudflareEmailConfig,
  binding: { send: (msg: any) => Promise<void> }
): Promise<SendResult> {
  try {
    await binding.send({
      to: [{ email: config.to }],
      from: { email: config.from },
      subject: email.subject,
      html: email.html,
      replyTo: email.replyTo,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}
