// Site identity resolved from EmDash site settings (admin → Settings), falling back to the static
// @config/siteData defaults while the CMS has nothing set. The one derivation every consumer shares
// (page <title> suffixes, og:site_name, JSON-LD, RSS channel, llms.txt, header wordmark), so an
// admin edit to title/tagline changes the whole site at once. Facts the CMS has no field for
// (author, defaultImage, sameAs) stay in @config/siteData.
import siteData from "@config/siteData.json";
import { getSiteSettings } from "emdash";

export interface SiteIdentity {
  /** brand / site name — settings `title`, else siteData.name. */
  name: string;
  /** default meta description — settings `tagline`, else siteData.description. */
  description: string;
  /** full home-page <title> ("name — tagline"), else siteData.title. */
  title: string;
}

export async function getSiteIdentity(): Promise<SiteIdentity> {
  const settings = await getSiteSettings();
  const name = settings.title?.trim() || siteData.name;
  const tagline = settings.tagline?.trim() || "";
  return {
    name,
    description: tagline || siteData.description,
    title: tagline ? `${name} — ${tagline}` : siteData.title,
  };
}
