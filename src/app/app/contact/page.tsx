import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/seo'
import { JsonLdScript } from '@/components/JsonLdScript'
import { ContactContent } from '@/components/contact/ContactContent'

// ─── SEO Metadata ──────────────────────────────────────────────────────────

export const metadata: Metadata = createPageMetadata({
  title: 'Contact',
  description:
    'Contactez l\'équipe Smartly Assistant pour toute question sur notre solution IA aéroportuaire. Support, partenariats, demandes commerciales.',
  path: '/contact',
  keywords: [
    'contact Smartly',
    'support aéroport',
    'partenariat IA',
    'WhatsApp aéroport Sénégal',
  ],
})

// ─── JSON-LD Structured Data ───────────────────────────────────────────────

const contactJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contact - Smartly Assistant',
  url: 'https://smartly.aero/contact',
  description:
    'Contactez l\'équipe Smartly Assistant pour toute question sur notre solution IA aéroportuaire.',
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ContactPage() {
  return (
    <>
      <JsonLdScript data={contactJsonLd} />
      <ContactContent />
    </>
  )
}
