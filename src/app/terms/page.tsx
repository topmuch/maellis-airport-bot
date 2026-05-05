import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/seo'
import { JsonLdScript } from '@/components/JsonLdScript'
import { TermsContent } from '@/components/terms/TermsContent'

// ─── SEO Metadata ──────────────────────────────────────────────────────────

export const metadata: Metadata = createPageMetadata({
  title: 'Conditions G\u00e9n\u00e9rales d\'Utilisation',
  description:
    'Conditions g\u00e9n\u00e9rales d\'utilisation de la plateforme Smartly Assistant. D\u00e9couvrez les r\u00e8gles, obligations et droits relatifs \u00e0 l\'utilisation de nos services.',
  path: '/terms',
  noIndex: false,
  keywords: [
    'conditions g\u00e9n\u00e9rales',
    'CGU',
    'conditions d\'utilisation',
    'contrat',
    'Smartly Assistant',
    'a\u00e9roport',
    'Dakar',
    'S\u00e9n\u00e9gal',
  ],
})

// ─── JSON-LD Structured Data ───────────────────────────────────────────────

const termsJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Conditions G\u00e9n\u00e9rales - Smartly Assistant',
  url: 'https://smartly.aero/terms',
  description:
    'Conditions g\u00e9n\u00e9rales d\'utilisation de la plateforme Smartly Assistant.',
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function TermsPage() {
  return (
    <>
      <JsonLdScript data={termsJsonLd} />
      <TermsContent />
    </>
  )
}
