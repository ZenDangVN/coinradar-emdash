// Data access for blog posts — the one query behind the /blog/ listing, the home Latest Posts grid,
// the detail route, and the RSS feed, so their filter + sort can't drift. Posts live in the EmDash
// `posts` collection (Cloudflare D1) and are fetched at request time via the live content API; the
// entries are adapted here into the flat `PostEntry` shape the theme components render, so the rest
// of the theme never touches raw EmDash entries.
import type { PortableTextBlock } from "emdash";
import { getEmDashCollection, getEmDashEntry, getEntryTerms, getTermsForEntries } from "emdash";

import { type ImageSource, toImageSource } from "./images";

/** The flat post shape the theme components render (mirrors the old frontmatter field names). */
export interface PostData {
  title: string;
  /** card excerpt + SEO meta description (the EmDash `excerpt` field). */
  description: string;
  pubDate: Date;
  updatedDate?: Date;
  heroImage: ImageSource;
  heroImageAlt: string;
  /** primary category term label — drives the retro card/article badge (see postCards.categoryMeta). */
  category: string;
  /** tag term labels — the article footer hashtags. */
  tags: string[];
  /** primary byline, when the entry has one. */
  authorName?: string;
  /** the byline's public URL — becomes the JSON-LD Article author.url. */
  authorUrl?: string;
  /** the Portable Text body, rendered with `<PortableText />` from "emdash/ui". */
  body: PortableTextBlock[];
}

export interface PostEntry {
  /** the slug (used in URLs). */
  id: string;
  /** the database ULID (used for taxonomy/API calls). */
  dbId: string;
  data: PostData;
}

/** A cache hint as returned by the EmDash query APIs — pass to `Astro.cache.set()`. */
export type CacheHint = Awaited<ReturnType<typeof getEmDashCollection>>["cacheHint"];

interface RawPostData {
  id: string;
  title: string;
  excerpt?: string;
  featured_image?: { id: string; src?: string; alt?: string; width?: number; height?: number };
  content?: PortableTextBlock[];
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  byline?: { displayName: string; websiteUrl: string | null } | null;
}

function mapPost(
  entry: { id: string; data: RawPostData },
  category: string,
  tags: string[] = [],
): PostEntry {
  const d = entry.data;
  const heroImage = toImageSource(d.featured_image);
  return {
    id: entry.id,
    dbId: d.id,
    data: {
      title: d.title,
      description: d.excerpt ?? "",
      pubDate: d.publishedAt ?? d.createdAt,
      updatedDate: d.updatedAt,
      heroImage,
      heroImageAlt: heroImage.alt ?? d.title,
      category,
      tags,
      authorName: d.byline?.displayName,
      authorUrl: d.byline?.websiteUrl ?? undefined,
      body: d.content ?? [],
    },
  };
}

/**
 * Published posts, newest first (by publish date), with each post's primary category resolved
 * (one batched taxonomy query — no N+1).
 *
 * @returns the adapted posts in listing order plus the query's `cacheHint`
 */
export async function getSortedPosts(): Promise<{ posts: PostEntry[]; cacheHint: CacheHint }> {
  const { entries, cacheHint } = await getEmDashCollection("posts", {
    status: "published",
    orderBy: { published_at: "desc" },
  });

  const categoriesByEntry = await getTermsForEntries(
    "posts",
    entries.map((e) => e.data.id),
    "category",
  );

  const posts = entries.map((entry) =>
    mapPost(entry, categoriesByEntry.get(entry.data.id)?.[0]?.label ?? "Post"),
  );
  posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
  return { posts, cacheHint };
}

/**
 * A single post by slug, with category, tags, and byline resolved — the detail-route query
 * (supports admin draft preview via `getEmDashEntry`). Returns `post: null` when the slug
 * doesn't resolve, so the route can 404.
 */
export async function getPost(
  slug: string,
): Promise<{ post: PostEntry | null; cacheHint: CacheHint }> {
  const { entry, cacheHint } = await getEmDashEntry("posts", slug);
  if (!entry) return { post: null, cacheHint };

  const [categories, tags] = await Promise.all([
    getEntryTerms("posts", entry.data.id, "category"),
    getEntryTerms("posts", entry.data.id, "tag"),
  ]);

  return {
    post: mapPost(
      entry,
      categories[0]?.label ?? "Post",
      tags.map((t) => t.label),
    ),
    cacheHint,
  };
}

/**
 * Plain-text projection of a Portable Text body — feeds the word count behind the
 * "N MIN READ" byline (see @js/readingTime).
 */
export function portableTextToPlain(blocks: PortableTextBlock[] | undefined): string {
  if (!blocks) return "";
  return blocks
    .map((block) => {
      const children = (block as { children?: { text?: string }[] }).children;
      return children?.map((span) => span.text ?? "").join("") ?? "";
    })
    .join("\n");
}
