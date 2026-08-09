This is an EmDash site -- a CMS built on Astro with a full admin UI.

## Commands

```bash
npx emdash dev        # Start dev server (runs migrations, seeds, generates types)
npx emdash types      # Regenerate TypeScript types from schema
```

The admin UI is at `http://localhost:4321/_emdash/admin`.

## Key Files

| File                     | Purpose                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `astro.config.mjs`       | Astro config with `emdash()` integration, database, and storage                    |
| `src/live.config.ts`     | EmDash loader registration (boilerplate -- don't modify)                           |
| `seed/seed.json`         | Schema definition + demo content (collections, fields, taxonomies, menus, widgets) |
| `emdash-env.d.ts`        | Generated types for collections (auto-regenerated on dev server start)             |
| `src/layouts/BaseLayout.astro` | Theme page shell (Header/Footer + BaseHead SEO)                              |
| `src/js/blogData.ts` / `src/js/projectData.ts` | EmDash D1 query layer — adapts entries into the shapes the theme components render |
| `src/config/`            | Static theme config (site identity, nav fallback, portfolio/legal copy)            |
| `src/pages/`             | Astro pages -- all server-rendered                                                 |

## Skills

Agent skills are in `.agents/skills/`. Load them when working on specific tasks:

- **building-emdash-site** -- Querying content, rendering Portable Text, schema design, seed files, site features (menus, widgets, search, SEO, comments, bylines). Start here.
- **creating-plugins** -- Building EmDash plugins with hooks, storage, admin UI, API routes, and Portable Text block types.
- **emdash-cli** -- CLI commands for content management, seeding, type generation, and visual editing flow.

## Documentation

The EmDash docs are available as an MCP server at `https://docs.emdashcms.com/mcp`. When you need to verify an API, hook, config option, field type, or pattern, call `search_docs` against the live documentation rather than relying on training-data recall. The docs reflect current behaviour; assumptions may not.

This template ships with `.mcp.json`, `.cursor/mcp.json`, and `.vscode/mcp.json` so Claude Code, Cursor, and VS Code auto-discover the docs server. Other tools (OpenCode, Windsurf, etc.) need a manual one-time setup -- see [docs.emdashcms.com/docs-mcp](https://docs.emdashcms.com/docs-mcp).

## Rules

- All content pages must be server-rendered (`output: "server"`). No `getStaticPaths()` for CMS content.
- Image fields are objects (`{ src, alt }`), not strings. Use `<Image image={...} />` from `"emdash/ui"`.
- `entry.id` is the slug (for URLs). `entry.data.id` is the database ULID (for API calls like `getEntryTerms`).
- Always call `Astro.cache.set(cacheHint)` on pages that query content.
- Taxonomy names in queries must match the seed's `"name"` field exactly (e.g., `"category"` not `"categories"`).

## This Template

**8-BitQuest** — a retro 8-bit pixel-art developer portfolio (blog + project log + about + contact), originally a static Astro theme, converted to run on EmDash: posts and projects live in the CMS (Cloudflare D1) and render at request time. Press Start 2P headings, Space Mono body, Tailwind v4 token system with a committed dark/light pixel palette.

## Pages

| Page           | Path               | Data source                                                                 |
| -------------- | ------------------ | --------------------------------------------------------------------------- |
| Home           | `/`                | Latest 3 posts + first 3 projects from EmDash; hero/stats/about from config |
| Blog listing   | `/blog`            | `posts` collection, newest first, drafts excluded                            |
| Post detail    | `/blog/[slug]`     | `getEmDashEntry("posts")` + category/tag terms + byline; PortableText body   |
| Project log    | `/projects`        | `projects` collection, sorted by `sort_order` ascending                      |
| Project detail | `/projects/[slug]` | `getEmDashEntry("projects")`; specs/features/challenge/solution JSON fields  |
| CMS pages      | `/pages/[slug]`    | `pages` collection (editor-created pages)                                    |
| About/Contact  | `/about`, `/contact` | Static config (`@config/portfolioData`); contact form posts an Astro action |
| Legal          | `/privacy`, `/terms` | Static config (`@config/legalData`)                                        |
| RSS            | `/rss.xml`         | Same query as `/blog`                                                        |

The header nav comes from the EmDash `primary` menu (fallback: `@config/navData`); the brand wordmark from EmDash site settings `title` (fallback: `@config/siteData`).

## Schema

- `posts`: `title`, `featured_image`, `content` (Portable Text), `excerpt`. Taxonomies `category` + `tag`; bylines drive the article byline.
- `projects`: `title`, `card_title`, `description`, `tagline`, `project_status` (`complete` | `in-progress` — named that way because every collection already has a system `status` column), `module_id`, `sort_order`, `thumbnail`, and JSON fields `tech`, `specs`, `features`, `challenge`, `solution`, plus `content` (Portable Text overview).
- `pages`: `title`, `content`.

The data layer (`src/js/blogData.ts`, `src/js/projectData.ts`) adapts raw EmDash entries into flat `PostEntry` / `ProjectEntry` shapes; components never touch raw entries. Images from EmDash media are `{ src, alt, width, height }` objects rendered with plain `<img>` (see `src/js/images.ts`).

## Gotchas

- The seed (`seed/seed.json`) applies only to an EMPTY database. Demo content and bylines land when the setup wizard completes (dev: hit the "Dev bypass" URL printed on server start). To re-seed local dev, stop the server and delete `.wrangler/state`.
- To add the `projects` collection to an ALREADY-provisioned database (e.g. production D1), create it via the admin UI or `npx emdash schema create/add-field` against the running instance — the seed will not do it.
- Never name a custom field `status` — it collides with the system column and aborts seeding silently.
- Set `SITE_URL` in the production build environment; canonical/OG/JSON-LD/RSS URLs resolve against it (placeholder: `https://example.com`).
- Dev on Windows without a TTY: plain `astro dev` daemonizes with a hard 30s readiness timeout; run `ASTRO_DEV_BACKGROUND=1 pnpm dev` to skip the watchdog on slow machines.

## Customisation

Design tokens live in `src/styles/tailwind-theme.css` (palette) and `src/styles/global.css` (semantic vars, `:root` light / `.dark` dark). Fonts are self-hosted via `@fontsource` (see `src/styles/fonts.css` + preloads in `BaseHead.astro`). Static copy (portfolio stats, gear, legal text, social links) lives in `src/config/*.json.ts`.

## What not to do

- Don't reintroduce `getStaticPaths()` for CMS content — everything is server-rendered against D1.
- Don't render EmDash image fields as strings; they are objects.
- Don't query taxonomy names that don't match the seed exactly (`category`, `tag` — singular).
- Don't forget `Astro.cache.set(cacheHint)` on pages/components that query content.
