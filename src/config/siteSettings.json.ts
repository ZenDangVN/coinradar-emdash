import { type SiteSettingsProps } from "./types/configDataTypes";

export const siteLang = "vi" as const;
export const siteLocale = "vi-VN" as const;

export const siteSettings = {
  useViewTransitions: true,
  useAnimations: true,
} satisfies SiteSettingsProps;
