'use client'

import { motion, useReducedMotion } from 'framer-motion'
import {
  Brain,
  PlaneTakeoff,
  Luggage,
  ShoppingBag,
  Headset,
  BarChart3,
  Siren,
  Users,
  Receipt,
  type LucideIcon,
} from 'lucide-react'

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1]

// ─── Feature Data ────────────────────────────────────────────────────────

interface Feature {
  title: string
  description: string
  icon: LucideIcon
}

const features: Feature[] = [
  {
    icon: Brain,
    title: 'IA Conversationnelle Avancée',
    description:
      "Moteur NLP multilingue entraîné sur le domaine aéroportuaire. Comprend le wolof, le français, l'anglais et l'arabe.",
  },
  {
    icon: PlaneTakeoff,
    title: 'Suivi de Vols Temps Réel',
    description:
      'Intégration aviation en temps réel. Notifications push automatiques, portes, retards, et correspondances.',
  },
  {
    icon: Luggage,
    title: 'Bagages Intelligents & QR Tracking',
    description:
      'Suivi bagages par QR code, déclaration PIR automatisée, notifications de livraison en temps réel.',
  },
  {
    icon: ShoppingBag,
    title: 'Marketplace Intégrée',
    description:
      'Salons VIP, taxis, duty-free, hôtels — réservation et paiement directement dans WhatsApp via CinetPay.',
  },
  {
    icon: Headset,
    title: 'Conciergerie Hybride Bot + Humain',
    description:
      'Le bot gère 94% des demandes. Escalade intelligente vers un agent humain quand nécessaire.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard Superadmin & Analytics',
    description:
      'Vue d\'ensemble en temps réel de toutes les opérations. KPIs, rapports, et alertes configurables.',
  },
  {
    icon: Siren,
    title: 'Gestion de Crise & Broadcast',
    description:
      'Diffusion ciblée en cas de perturbation. Alertes multicanal et gestion des situations d\'urgence.',
  },
  {
    icon: Users,
    title: 'Mode Famille & Assistance PMR',
    description:
      'Accompagnement dédié pour les passagers à mobilité réduite et les voyageurs avec enfants.',
  },
  {
    icon: Receipt,
    title: 'Facturation Automatique & OHADA',
    description:
      'Génération automatique de factures conformes OHADA. Suivi paiements et relances programmées.',
  },
]

// ─── Component ───────────────────────────────────────────────────────────

export function FeaturesGrid() {
  const prefersReducedMotion = useReducedMotion()

  const hoverAnimation = prefersReducedMotion ? {} : { y: -4 }

  return (
    <section
      id="features"
      className="py-20 lg:py-32 bg-gradient-to-b from-slate-950 via-slate-900/50 to-slate-950"
      style={{ scrollMarginTop: '4.5rem' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Heading ────────────────────────────────────────────────── */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease }}
        >
          <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight text-white text-center">
            Tout ce dont votre aéroport a besoin, dans WhatsApp
          </h2>
          <p className="text-lg text-slate-400 text-center mt-4 max-w-2xl mx-auto">
            9 modules puissants pour transformer l&apos;expérience passager et
            optimiser vos opérations.
          </p>
        </motion.div>

        {/* ── Grid ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                whileHover={{ ...hoverAnimation, transition: { duration: 0.3 } }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{
                  duration: 0.5,
                  ease,
                  delay: prefersReducedMotion ? 0 : index * 0.06,
                }}
                className="rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-sm p-8 hover:border-amber-500/20 hover:bg-white/[0.06] transition-all duration-300 group cursor-default"
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-5 group-hover:bg-amber-500/20 transition-colors">
                  <Icon className="w-6 h-6 text-amber-400" />
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-white">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-slate-400 mt-2 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
