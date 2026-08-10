// Dependency-free RSS 2.0 feed for the blog (a feed ships with the blog route; hand-rolled like
// everything else in <head>, no @astrojs/rss). Server-rendered off the EmDash `posts` collection —
// the same query behind /blog/ — so the feed and the listing can never drift; absolute URLs resolve
// against `site`. The escaping + document shape live in @js/rss (pure); this endpoint only supplies
// the posts and the `site` URL.
import { siteLocale } from "@config/siteSettings.json";
import { getSortedPosts } from "@js/blogData";
import { renderRssFeed } from "@js/rss";
import { getSiteIdentity } from "@js/siteIdentity";
import type { APIContext } from "astro";

export async function GET({ site }: APIContext): Promise<Response> {
  if (!site) {
    throw new Error("`site` must be set in astro.config.mjs for the RSS feed to resolve URLs.");
  }

  const [{ posts }, identity] = await Promise.all([getSortedPosts(), getSiteIdentity()]);
  const xml = renderRssFeed(
    {
      title: identity.name,
      link: new URL("/blog/", site).href,
      description: identity.description,
      language: siteLocale,
    },
    posts.map((post) => ({
      title: post.data.title,
      url: new URL(`/blog/${post.id}/`, site).href,
      description: post.data.description,
      pubDate: post.data.pubDate,
    })),
  );

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
