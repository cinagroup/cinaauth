import type { Metadata } from "next/types";

export function createMetadata(override: Metadata): Metadata {
  return {
    ...override,
    openGraph: {
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      url: "https://accounts.cinaseek.ai",
      images: "https://accounts.cinaseek.ai/og.png",
      siteName: "CinaAuth",
      ...override.openGraph,
    },
    twitter: {
      card: "summary_large_image",
      creator: "@cinagroup",
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      images: "https://accounts.cinaseek.ai/og.png",
      ...override.twitter,
    },
  };
}

// Support Cloudflare Pages environment
export const baseUrl =
  process.env.NODE_ENV === "development"
    ? new URL("http://localhost:3000")
    : (() => { try { return new URL(process.env.NEXT_PUBLIC_CINAAUTH_API_URL || "https://accounts.cinaseek.ai"); } catch { return new URL("https://accounts.cinaseek.ai"); } })();
