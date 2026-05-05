import type { MetadataRoute } from 'next'

/**
 * robots.txt — Disallow admin/dashboard/api, allow public pages
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://maellis.sn'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/api/', '/admin/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
