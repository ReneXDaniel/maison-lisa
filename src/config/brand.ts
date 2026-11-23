/**
 * Central brand configuration. Every UI surface, email, metadata tag and
 * document title reads the brand from here, so a rename is a one-line change
 * (or an environment variable, without touching code).
 */
export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "MAISON LISA",
  /** The creator behind the brand. Used in copy such as "Message Lisa". */
  creatorName: process.env.NEXT_PUBLIC_CREATOR_NAME ?? "Lisa",
  /** Monogram used in compact places (favicon, mobile header, gift box seal). */
  monogram: process.env.NEXT_PUBLIC_BRAND_MONOGRAM ?? "ML",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "concierge@example.com",
  currency: "EUR" as const,
} as const;

export type Brand = typeof brand;
