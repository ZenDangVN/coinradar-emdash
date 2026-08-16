/**
 * Cloudflare Workers Send Email Helper.
 * Uses the native SEND_EMAIL binding according to Cloudflare Workers API docs:
 * https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
 */
import type { ContactEmail } from "@js/contact";

export interface CloudflareEmailConfig {
  to: string;
  from: string;
}

export type SendResult =
  | { ok: true; messageId?: string }
  | { ok: false; reason: string; code?: string };

/**
 * Sends a contact email via Cloudflare's native send_email binding.
 * 
 * @param email   the subject, html body, text, and optional replyTo address
 * @param config  destination (to) and sender (from) addresses
 * @param binding the Cloudflare Workers SEND_EMAIL binding
 */
export async function sendContactEmailViaCloudflare(
  email: ContactEmail,
  config: CloudflareEmailConfig,
  binding: { send: (msg: any) => Promise<{ messageId?: string }> }
): Promise<SendResult> {
  try {
    // Cloudflare SendEmail.send() accepts structured EmailMessageBuilder
    const response = await binding.send({
      to: config.to,
      from: config.from,
      subject: email.subject,
      html: email.html,
      replyTo: email.replyTo,
    });
    return { ok: true, messageId: response?.messageId };
  } catch (e: any) {
    const code = e?.code;
    const message = e?.message ?? String(e);
    console.error(`[Cloudflare SendEmail Error] Code: ${code} | Message: ${message}`);
    return { ok: false, reason: message, code };
  }
}
