import { type SiteDataProps } from "./types/configDataTypes";

// Site metadata. Edit with your project's details.
const siteData = {
  name: "8-BitQuest",
  title: "8-BitQuest — retro pixel-art dev portfolio",
  description:
    "A retro 8-bit, pixel-art developer portfolio built on Astro 7 and a CSS-first Tailwind v4 token system.",

  author: {
    name: "Your Name",
    email: "you@example.com",
    // Ships EMPTY on purpose: BaseHead only emits `twitter:creator` when this is set, so an unfilled
    // template omits the tag rather than attributing every page to a handle that doesn't exist.
    twitter: "",
  },

  defaultImage: {
    src: "/og.jpg",
    alt: "8-BitQuest",
  },

  // Social/profile URLs, surfaced as the Organization `sameAs` in JSON-LD (see @js/schema) AND used
  // by @config/socialData to point the footer row, the home contact chips and the contact InfoCards
  // at your real profiles. **Fill this before launch:** while it is empty those links fall back to
  // bare platform home pages (github.com, linkedin.com, discord.gg, …).
  // e.g. ["https://x.com/yourhandle", "https://github.com/yourorg"]
  sameAs: [],
} satisfies SiteDataProps;

export default siteData;
