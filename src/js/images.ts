/**
 * * Image helpers for EmDash media fields.
 *
 * EmDash image fields are objects (`{ id, src?, alt?, width?, height? }`), not strings and not
 * Astro `ImageMetadata`. The theme's cards/articles render plain `<img>` tags off `src/width/height`,
 * so this narrow shape is all they need. `toImageSource` normalizes an EmDash media object into that
 * shape, falling back to the bundled OG image so a post without a featured image still renders a card.
 */

/** The minimal image shape the theme's `<img>`-based components render. */
export interface ImageSource {
  src: string;
  width?: number;
  height?: number;
  alt?: string;
}

/** An EmDash `image` field value as returned by the content APIs. */
export interface EmDashImage {
  id?: string;
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
}

/** Site-wide fallback (the OG banner in /public) for entries without a featured image. */
export const FALLBACK_IMAGE: ImageSource = { src: "/og.jpg", width: 1200, height: 630 };

/**
 * Normalize an EmDash image field into an `ImageSource`, or the fallback when the field is unset
 * (or has no resolved `src`).
 */
export function toImageSource(
  image: EmDashImage | null | undefined,
  fallback: ImageSource = FALLBACK_IMAGE,
): ImageSource {
  if (!image?.src) return fallback;
  return { src: image.src, alt: image.alt, width: image.width, height: image.height };
}
