import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  typescript: {
    ignoreBuildErrors: true,
  },

  reactStrictMode: false,

  // ─── Cross-Origin Sandbox Support ─────────────────────────────────────
  // Allow preview panel (z.ai sandbox) to use Server Actions and load _next/* resources.
  // Wildcard patterns are supported (e.g. '*.space.z.ai' matches any subdomain).
  experimental: {
    serverActions: {
      allowedOrigins: ['*.space.z.ai'],
    },
  },
  allowedDevOrigins: ['*.space.z.ai'],

  // ─── Image Optimization ────────────────────────────────────────────────
  images: {
    // Modern formats — AVIF preferred, WebP fallback
    formats: ['image/avif', 'image/webp'],

    // Cache optimized images for 1 year (CDN-friendly)
    minimumCacheTTL: 31_536_000,

    // Remote image patterns — whitelisted domains only
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'z-cdn.chatglm.cn',
        pathname: '/z-ai/static/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.maelis.aero',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
    ],

    // Content security for unoptimized images
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // ─── Headers ───────────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
