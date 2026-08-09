import { type PortfolioDataProps } from "./types/configDataTypes";

// Buyer-facing portfolio copy + values — the facts you're expected to make your own: identity,
// biography, the experience/stat numbers, the home intro, and the contact prompt. Presentational
// labels (SYS_SPECS captions, "Role:" / "Yrs:", scoreboard colours) stay in their components; this
// file holds only what a buyer edits. The voice is first-person singular throughout (one developer's
// portfolio) — keep it consistent if you rewrite.
const portfolioData = {
  profile: {
    tagline: "Dev 01",
    heading: "The Full-Stack Dev",
    role: "Full-Stack",
    years: "8+",
    bio: [
      "Welcome to the mainframe. I'm a full-stack developer with 8+ years of experience building scalable web applications, APIs, and tools. This profile serves as a chronological log of my projects, open-source contributions, and the systems I've shipped.",
      "I'm passionate about clean code, automated testing, and shipping fast. I write about modern frontend patterns, backend architecture, and the tools that keep my workflow efficient.",
    ],
    shortBio:
      "I'm a developer who builds things with pixels, code, and a healthy dose of nostalgia. I write about the tech I use, the tools I love, and the retro systems that still inspire me.",
    meta: {
      location: "The Internet",
      role: "Full Stack Dev",
      favorite: "8-Bit Chiptunes",
    },
    skills: [
      { label: "Frontend", pct: 95 },
      { label: "Backend", pct: 90 },
    ],
  },

  stats: {
    home: ["Posts: 42", "Years: 03", "Coffee: 9000+"],
    profile: ["Class: Full-Stack Dev", "Lvl: 8+", "XP: 8.5K", "Stars: 2.1K"],
  },

  home: {
    tagline: "Player 1",
    heading: "Welcome, Player One",
    intro:
      "Level up your knowledge with my latest dev logs, tutorials, and retro tech explorations. Press start to begin your journey.",
  },

  contact: {
    prompt: "Want to chat about a project, a retro build, or just share a favorite game?",
  },
} satisfies PortfolioDataProps;

export default portfolioData;
