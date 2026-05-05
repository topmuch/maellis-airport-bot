/**
 * SEO Helpers — JSON-LD, metadata factory, canonical URLs
 * Production-ready utilities for MAELLIS SEO
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://smartly.aero'
const SITE_NAME = 'Smartly Assistant'
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
      'Smartly Assistant — L\'IA WhatsApp qui transforme l\'expérience aéroportuaire en Afrique. Déployé en 7 jours, ROI garanti.',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      telephone: '+221-33-869-69-69',
      email: 'contact@smartly.aero',
      availableLanguage: ['fr', 'en', 'wo', 'ar'],
    },
    sameAs: [],
  }
}

export function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Smartly Assistant',
    url: SITE_URL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'XOF',
      description: 'Démo privée gratuite — Déploiement en 7 jours',
    },
    description:
      'L\'assistant IA WhatsApp qui transforme l\'expérience aéroportuaire en Afrique. 40% de coûts support en moins, +15% de revenus annexes. 9 modules intégrés.',
    screenshot: `${SITE_URL}/og-default.jpg`,
    featureList: [
      'IA Conversationnelle Avancée',
      'Suivi de Vols Temps Réel',
      'Bagages Intelligents & QR Tracking',
      'Marketplace Intégrée',
      'Conciergerie Hybride Bot + Humain',
      'Dashboard Superadmin & Analytics',
      'Gestion de Crise & Broadcast',
      'Mode Famille & Assistance PMR',
      'Facturation Automatique & OHADA',
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
