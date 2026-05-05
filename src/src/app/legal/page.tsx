import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/seo'
import { JsonLdScript } from '@/components/JsonLdScript'
import { LegalContent } from '@/components/legal/LegalContent'

// ─── SEO Metadata ──────────────────────────────────────────────────────────

export const metadata: Metadata = createPageMetadata({
  title: 'Mentions Légales',
  description:
    'Mentions légales du site Smartly Assistant. Informations sur l\'éditeur, l\'hébergeur, la propriété intellectuelle et les conditions d\'utilisation du site.',
  path: '/legal',
  noIndex: false,
  keywords: [
    'mentions légales',
    'éditeur du site',
    'hébergeur',
    'propriété intellectuelle',
    'Smartly Assistant',
    'Dakar',
    'Sénégal',
  ],
})

// ─── JSON-LD Structured Data ───────────────────────────────────────────────

const legalJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Mentions Légales - Smartly Assistant',
  url: 'https://smartly.aero/legal',
  description:
    'Mentions légales du site Smartly Assistant.',
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function LegalPage() {
  return (
    <>
      <JsonLdScript data={legalJsonLd} />
      <LegalContent />
    </>
  )
}
