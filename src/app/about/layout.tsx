import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/seo'

export const metadata: Metadata = createPageMetadata({
  title: 'À Propos',
  description:
    "Découvrez la mission, les valeurs et l'équipe de Smartly Assistant, l'IA qui transforme l'expérience aéroportuaire en Afrique.",
  path: '/about',
  keywords: [
    'à propos',
    'mission',
    'valeurs',
    'Smartly Assistant',
    'aéroport Afrique',
    'Dakar',
    'IA WhatsApp',
  ],
})

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
