import type { MetadataRoute } from 'next'

/**
 * Sitemap — Public routes for MAELLIS
 * Dashboard routes are intentionally excluded (private).
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://maellis.sn'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/docs`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ]

  return staticRoutes
}
