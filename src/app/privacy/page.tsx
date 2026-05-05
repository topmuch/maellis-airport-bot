import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/seo'
import { PrivacyContent } from '@/components/privacy/PrivacyContent'

// ─── SEO Metadata ──────────────────────────────────────────────────────────

export const metadata: Metadata = createPageMetadata({
  title: 'Politique de Confidentialité',
  description:
    'Politique de confidentialité RGPD conforme de Smartly Assistant. Découvrez comment nous collectons, utilisons et protégeons vos données personnelles.',
  path: '/privacy',
  noIndex: false,
  keywords: [
    'RGPD',
    'confidentialité',
    'données personnelles',
    'protection des données',
    'privacy policy',
    'Smartly Assistant',
    'aéroport',
    'Dakar',
  ],
})

// ─── Page ──────────────────────────────────────────────────────────────────

export default function PrivacyPage() {
  return <PrivacyContent />
}
