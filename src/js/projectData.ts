// Data access for the `projects` collection — the one query behind the /projects/ listing, the
// home Featured Projects grid, and the detail route, so their filter + sort can't drift. Projects
// live in the EmDash `projects` collection (Cloudflare D1); the structured detail-page slots
// (specs, features, challenge/solution) are stored as JSON fields and validated loosely here.
import type { PortableTextBlock } from "emdash";
import { getEmDashCollection, getEmDashEntry } from "emdash";

import { type ImageSource, toImageSource } from "./images";
import type { ProjectStatus } from "./projectCards";

export interface ProjectSpec {
  label: string;
  value: string;
}

export interface ProjectFeature {
  lead: string;
  text: string;
}

export interface ProjectCase {
  title: string;
  body: string;
}

/** The flat project shape the theme components render (mirrors the old frontmatter field names). */
export interface ProjectData {
  title: string;
  /** listing card title (falls back to `title`). */
  cardTitle?: string;
  description: string;
  tagline: string;
  status: ProjectStatus;
  moduleId: string;
  /** listing sort key (ascending). */
  sortOrder: number;
  thumbnail: ImageSource;
  thumbnailAlt: string;
  tech: string[];
  specs: ProjectSpec[];
  features: ProjectFeature[];
  archCaption: string;
  challenge: ProjectCase;
  solution: ProjectCase;
  /** the Portable Text overview, rendered with `<PortableText />` from "emdash/ui". */
  body: PortableTextBlock[];
}

export interface ProjectEntry {
  /** the slug (used in URLs). */
  id: string;
  /** the database ULID (used for API calls). */
  dbId: string;
  data: ProjectData;
}

/** A cache hint as returned by the EmDash query APIs — pass to `Astro.cache.set()`. */
export type CacheHint = Awaited<ReturnType<typeof getEmDashCollection>>["cacheHint"];

interface RawProjectData {
  id: string;
  title: string;
  card_title?: string;
  description?: string;
  tagline?: string;
  /** the theme's complete/in-progress flag — `project_status` in the DB, because every EmDash
   * collection already has a system `status` column (draft/published). */
  project_status?: string;
  module_id?: string;
  sort_order?: number;
  thumbnail?: { id: string; src?: string; alt?: string; width?: number; height?: number };
  tech?: unknown;
  specs?: unknown;
  features?: unknown;
  arch_caption?: string;
  challenge?: unknown;
  solution?: unknown;
  content?: PortableTextBlock[];
}

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

const asObjectArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const asCase = (value: unknown): ProjectCase => {
  const v = (value ?? {}) as Partial<ProjectCase>;
  return { title: v.title ?? "", body: v.body ?? "" };
};

function mapProject(entry: { id: string; data: RawProjectData }): ProjectEntry {
  const d = entry.data;
  const thumbnail = toImageSource(d.thumbnail);
  return {
    id: entry.id,
    dbId: d.id,
    data: {
      title: d.title,
      cardTitle: d.card_title || undefined,
      description: d.description ?? "",
      tagline: d.tagline ?? "",
      status: d.project_status === "in-progress" ? "in-progress" : "complete",
      moduleId: d.module_id ?? "",
      sortOrder: d.sort_order ?? 0,
      thumbnail,
      thumbnailAlt: thumbnail.alt ?? d.title,
      tech: asStringArray(d.tech),
      specs: asObjectArray<ProjectSpec>(d.specs),
      features: asObjectArray<ProjectFeature>(d.features),
      archCaption: d.arch_caption ?? "",
      challenge: asCase(d.challenge),
      solution: asCase(d.solution),
      body: d.content ?? [],
    },
  };
}

/**
 * Published projects, sorted by `sort_order` ascending.
 *
 * @returns the adapted project entries in listing order plus the query's `cacheHint`
 */
export async function getSortedProjects(): Promise<{
  projects: ProjectEntry[];
  cacheHint: CacheHint;
}> {
  const { entries, cacheHint } = await getEmDashCollection("projects", {
    status: "published",
    orderBy: { sort_order: "asc" },
  });
  const projects = entries.map(mapProject);
  projects.sort((a, b) => a.data.sortOrder - b.data.sortOrder);
  return { projects, cacheHint };
}

/**
 * A single project by slug (supports admin draft preview via `getEmDashEntry`). Returns
 * `project: null` when the slug doesn't resolve, so the route can 404.
 */
export async function getProject(
  slug: string,
): Promise<{ project: ProjectEntry | null; cacheHint: CacheHint }> {
  const { entry, cacheHint } = await getEmDashEntry("projects", slug);
  if (!entry) return { project: null, cacheHint };
  return { project: mapProject(entry), cacheHint };
}
