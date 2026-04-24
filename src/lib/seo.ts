/**
 * SEO Helpers — JSON-LD, metadata factory, canonical URLs
 * Production-ready utilities for MAELLIS SEO
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://maellis.sn'
const SITE_NAME = 'MAELLIS'
const SITE_LOCALE = 'fr_SN'

// ─── Canonical URL ─────────────────────────────────────────────────────────

export function canonicalUrl(path: string = '/'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL.replace(/\/$/, '')}${cleanPath}`
}

// ─── JSON-LD Structured Data Builders ──────────────────────────────────────

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
    description:
      'Plateforme intelligente de gestion aéroportuaire — Assistant WhatsApp IA B2B/B2C pour les aéroports d\'Afrique de l\'Ouest.',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['fr', 'en', 'wo', 'ar'],
    },
    sameAs: [],
  }
}

export function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `${SITE_NAME} Aéroport Dashboard`,
    url: SITE_URL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'XOF',
      description: 'Plan Premium — Accès complet à toutes les fonctionnalités',
    },
    description:
      'Système de gestion intelligente pour aéroports. Recherche de vols, bagages, salons VIP, transport, paiements, conversations WhatsApp IA.',
    screenshot: `${SITE_URL}/og-default.jpg`,
    featureList: [
      'Recherche de vols en temps réel',
      'Assistant WhatsApp IA multilingue',
      'Gestion des bagages QR',
      'Réservation salons VIP',
      'Paiements mobiles CinetPay',
      'Tableau de bord analytique',
      'Gestion des partenaires',
      'Facturation automatisée',
    ],
  }
}

export function faqJsonLd(
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

// ─── Metadata Factory ─────────────────────────────────────────────────────

interface PageMetadataOptions {
  title: string
  description: string
  path?: string
  image?: string
  type?: 'website' | 'article'
  publishedTime?: string
  noIndex?: boolean
  keywords?: string[]
}

export function createPageMetadata({
  title,
  description,
  path = '/',
  image,
  type = 'website',
  publishedTime,
  noIndex = false,
  keywords = [],
}: PageMetadataOptions) {
  const fullTitle = path === '/'
    ? `${SITE_NAME} — Aéroport Dashboard IA`
    : `${title} | ${SITE_NAME}`

  const ogImage = image || `${SITE_URL}/api/og?title=${encodeURIComponent(title)}`
  const url = canonicalUrl(path)

  return {
    title: fullTitle,
    description,
    keywords: [
      'MAELLIS',
      'aéroport',
      'dashboard',
      'WhatsApp',
      'assistant IA',
      'vols',
      'Sénégal',
      'Afrique',
      ...keywords,
    ],
    authors: [{ name: 'MAELLIS Team', url: SITE_URL }],
    alternates: {
      canonical: url,
      languages: {
        'fr-SN': url,
        'en': `${SITE_URL}/en`,
      },
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      type: type === 'article' ? 'article' : 'website',
      ...(type === 'article' && publishedTime
        ? { publishedTime }
        : {}),
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: fullTitle,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: fullTitle,
      description,
      images: [ogImage],
      creator: '@maellis_sn',
      site: '@maellis_sn',
    },
    ...(noIndex
      ? {
          robots: {
            index: false,
            follow: false,
            googleBot: {
              index: false,
              follow: false,
            },
          },
        }
      : {}),
  }
}

// ─── JSON-LD String Helper (for non-JSX contexts) ──────────────────────────

export function jsonLdString(data: Record<string, unknown>): string {
  return JSON.stringify(data)
}
