/**
 * One-time schema migration: create the `projects` collection on a RUNNING EmDash instance
 * (deployed Cloudflare Worker or local dev). The seed only applies to an empty database, so an
 * already-provisioned D1 needs this run once against its live URL.
 *
 * The `emdash schema` commands talk to the instance's REST API, so authenticate first:
 *   - interactive:  npx emdash login --url https://your-site.workers.dev
 *   - CI / headless: create an Admin API token (admin → Settings → API Tokens) and set EMDASH_TOKEN
 *
 * Usage:
 *   node scripts/create-projects-schema.mjs https://your-site.workers.dev
 *   EMDASH_TOKEN=... node scripts/create-projects-schema.mjs https://your-site.workers.dev
 *
 * Idempotent: "already exists" responses are logged and skipped, so re-running is safe.
 */
import { execSync } from "node:child_process";

const url = process.argv[2];
if (!url) {
  console.error("Usage: node scripts/create-projects-schema.mjs <instance-url>");
  process.exit(1);
}

const token = process.env.EMDASH_TOKEN ? ` --token ${process.env.EMDASH_TOKEN}` : "";

// Field list mirrors seed/seed.json's `projects` collection — keep the two in sync.
// NOTE: never name a field `status`; it collides with the system status column (see AGENTS.md).
const fields = [
  ["title", "string", "Title", { required: true }],
  ["card_title", "string", "Card Title (listing card, falls back to Title)", {}],
  ["description", "text", "Description (card excerpt + SEO)", {}],
  ["tagline", "text", "Tagline (detail hero intro)", {}],
  ["project_status", "string", "Status (complete | in-progress)", { required: true }],
  ["module_id", "string", "Module ID (e.g. #01_CHAT)", {}],
  ["sort_order", "integer", "Sort Order (ascending)", {}],
  ["thumbnail", "image", "Thumbnail", {}],
  ["tech", "json", "Tech Tags (JSON array of strings)", {}],
  ["specs", "json", "Specs (JSON array of {label, value})", {}],
  ["features", "json", "Features (JSON array of {lead, text})", {}],
  ["arch_caption", "string", "Architecture Caption (e.g. [Packet Switching Engine])", {}],
  ["challenge", "json", "Challenge (JSON {title, body})", {}],
  ["solution", "json", "Solution (JSON {title, body})", {}],
  ["content", "portableText", "Project Overview", {}],
];

function run(command, describe) {
  console.log(`\n→ ${describe}`);
  try {
    execSync(command, { stdio: "inherit" });
  } catch (error) {
    // `schema create`/`add-field` fail when the target already exists — fine for a re-run.
    // Any other failure (auth, network, bad type) should stop the migration loudly.
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}${error.message}`;
    if (/exist/i.test(output)) {
      console.warn("  already exists — skipped");
      return;
    }
    console.error(`  FAILED: ${describe}`);
    process.exit(1);
  }
}

run(
  `npx emdash schema create projects --label Projects --label-singular Project --url ${url}${token}`,
  "create collection `projects`",
);

for (const [slug, type, label, opts] of fields) {
  const required = opts.required ? " --required" : "";
  run(
    `npx emdash schema add-field projects ${slug} --type ${type} --label "${label}"${required} --url ${url}${token}`,
    `add field \`${slug}\` (${type})`,
  );
}

console.log("\nDone. Verify with: npx emdash schema get projects --url " + url);
console.log(
  "Note: enable `search`/`seo` supports for the collection in the admin UI if you want them — the CLI create does not set supports.",
);
