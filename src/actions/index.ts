/**
 * * Astro Actions — the one server mutation in 8-BitQuest: the contact form.
 *
 * `accept: "form"` binds the action to a native `<form method="POST">`, so it works with JavaScript
 * disabled: the browser posts real FormData, Astro runs `contactSchema` first (the handler starts
 * from valid data), and `/contact/` re-renders with the result. Non-validation failures are thrown as
 * `ActionError`s whose message the page surfaces in one `role="alert"`; validation failures surface
 * per-field via `isInputError`. The Resend send itself lives in `@js/resend` (a tested, framework-free
 * boundary); here we translate its result — logging the provider detail server-side (it can name the
 * account, so it never reaches the visitor) and throwing a generic ActionError on any failure.
 */
import siteData from "@config/siteData.json";
import { buildEmail, contactSchema, spamReason } from "@js/contact";
import { sendContactEmailViaCloudflare } from "@js/cloudflareEmail";
import { sendContactEmail } from "@js/resend";
import { ActionError, defineAction } from "astro:actions";
// astro:env, not import.meta.env: on Cloudflare Workers secrets live only in the runtime env,
// which import.meta.env never sees. Declared (all optional) in astro.config.mjs `env.schema`.
import { CONTACT_FROM_EMAIL, CONTACT_TO_EMAIL, RESEND_API_KEY } from "astro:env/server";

export const server = {
  contact: defineAction({
    accept: "form",
    input: contactSchema,
    handler: async (input, context) => {
      // 1. Spam gates (honeypot + time). Server clock — never the visitor's device.
      const reason = spamReason(input);
      if (reason) throw new ActionError({ code: "BAD_REQUEST", message: reason });

      const to = CONTACT_TO_EMAIL;
      if (!to) {
        console.error("[contact] Destination email not configured — set CONTACT_TO_EMAIL (see .env.example).");
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Your message could not be sent. Please email me directly.",
        });
      }

      // Check if Cloudflare's SEND_EMAIL binding is available in locals
      const sendEmailBinding = (context.locals as any)?.runtime?.env?.SEND_EMAIL;

      if (sendEmailBinding) {
        // Cloudflare Email Routing Workers API
        if (!CONTACT_FROM_EMAIL) {
          console.error(
            "[contact] Cloudflare SEND_EMAIL binding found, but CONTACT_FROM_EMAIL is not set. " +
              "Cloudflare requires a verified sender domain email."
          );
          throw new ActionError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Your message could not be sent. Please email me directly.",
          });
        }
        
        const result = await sendContactEmailViaCloudflare(
          buildEmail(input, siteData.name),
          { to, from: CONTACT_FROM_EMAIL },
          sendEmailBinding
        );

        if (!result.ok) {
          console.error("[contact] Cloudflare email send failed:", result.reason);
          throw new ActionError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Your message could not be sent. Please email me directly.",
          });
        }

        return { ok: true as const };
      }

      // 2. Fallback to Resend API
      const apiKey = RESEND_API_KEY;
      if (!apiKey) {
        console.error(
          "[contact] Cloudflare SEND_EMAIL binding not found, and RESEND_API_KEY is not configured (see .env.example)."
        );
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Your message could not be sent. Please email me directly.",
        });
      }
      
      // Defaults to Resend's shared sender, which only delivers to the account owner's address.
      // Verify your own domain in Resend and set CONTACT_FROM_EMAIL to send anywhere.
      const from = CONTACT_FROM_EMAIL ?? "onboarding@resend.dev";

      // 3. Build (escaped) + send via the Resend boundary, then translate the result.
      const result = await sendContactEmail(buildEmail(input, siteData.name), { apiKey, to, from });
      if (!result.ok) {
        // Log the provider's real answer (it can name the account); never show it to the visitor.
        const contextMsg = result.reason === "provider" ? `provider ${result.status}` : result.reason;
        console.error(`[contact] Resend send failed (${contextMsg}):`, result.detail);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Your message could not be sent. Please email me directly.",
        });
      }

      return { ok: true as const };
    },
  }),
};
