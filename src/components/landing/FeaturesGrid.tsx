'use client'

import { motion } from 'framer-motion'
import {
  Brain,
  Plane,
  Luggage,
  Store,
  UserCheck,
  BarChart3,
  ShieldAlert,
  Heart,
  Receipt,
  type LucideIcon,
} from 'lucide-react'
import { staggerContainer, staggerItem, fadeInUp, viewportOnce } from '@/lib/animations'

// ─── Feature Data ────────────────────────────────────────────────────────

interface Feature {
  title: string
  description: string
  icon: LucideIcon
  bgClass: string
  iconClass: string
}

const features: Feature[] = [
  {
    title: 'IA Conversationnelle Avanc\u00e9e',
    description:
      "Comprend le fran\u00e7ais, l'anglais, le wolof et l'arabe. Anticipe les besoins des passagers.",
    icon: Brain,
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    iconClass: 'text-orange-600 dark:text-orange-400',
  },
  {
    title: 'Suivi de Vols Temps R\u00e9el',
    description:
      "Portes d'embarquement, retards, terminaux \u2014 informations actualis\u00e9es toutes les 60 secondes.",
    icon: Plane,
    bgClass: 'bg-sky-100 dark:bg-sky-900/30',
    iconClass: 'text-sky-600 dark:text-sky-400',
  },
  {
    title: 'Bagages Intelligents',
    description:
      'QR code de suivi JWT s\u00e9curis\u00e9. Notifications automatiques. D\u00e9claration de perte en 1 clic.',
    icon: Luggage,
    bgClass: 'bg-violet-100 dark:bg-violet-900/30',
    iconClass: 'text-violet-600 dark:text-violet-400',
  },
  {
    title: 'Marketplace Int\u00e9gr\u00e9e',
    description:
      'Lounges VIP, taxis, restaurants, duty-free. Paiement Orange Money / Wave / Carte.',
    icon: Store,
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    title: 'Conciergerie Hybride',
    description:
      'Bot + Humain. Transfert fluide vers vos \u00e9quipes pour les cas complexes.',
    icon: UserCheck,
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  {
    title: 'Dashboard Superadmin',
    description:
      'Analytics temps r\u00e9el, gestion des modules, rapports PDF automatis\u00e9s.',
    icon: BarChart3,
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    iconClass: 'text-blue-600 dark:text-blue-400',
  },
  {
    title: 'Gestion de Crise',
    description:
      'Broadcast WhatsApp en cas de gr\u00e8ve, annulation, ou urgence. Ciblage intelligent.',
    icon: ShieldAlert,
    bgClass: 'bg-rose-100 dark:bg-rose-900/30',
    iconClass: 'text-rose-600 dark:text-rose-400',
  },
  {
    title: 'Mode Famille & PMR',
    description:
      'Assistance personnalis\u00e9e pour voyageurs avec enfants ou \u00e0 mobilit\u00e9 r\u00e9duite.',
    icon: Heart,
    bgClass: 'bg-pink-100 dark:bg-pink-900/30',
    iconClass: 'text-pink-600 dark:text-pink-400',
  },
  {
    title: 'Facturation Automatique',
    description:
      'Conforme OHADA/UEMOA. Abonnements, commissions, relances automatiques.',
    icon: Receipt,
    bgClass: 'bg-teal-100 dark:bg-teal-900/30',
    iconClass: 'text-teal-600 dark:text-teal-400',
  },
]

// ─── Component ───────────────────────────────────────────────────────────

export function FeaturesGrid() {
  return (
    <section id="features" className="py-20" style={{ scrollMarginTop: '4.5rem' }}>
      <div className="mx-auto max-w-7xl px-4">
        {/* ── Heading ── */}
        <motion.div
          className="mb-16 text-center"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <h2 className="text-3xl font-bold md:text-4xl">
            Tout ce dont votre a\u00e9roport a besoin, dans{' '}
            <span className="text-orange-500">WhatsApp</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            9 modules puissants pour transformer l&apos;exp\u00e9rience passager
          </p>
        </motion.div>

        {/* ── Grid ── */}
        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                variants={staggerItem}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group rounded-xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-orange-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-orange-800"
              >
                {/* Icon */}
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${feature.bgClass}`}
                >
                  <Icon className={`h-6 w-6 ${feature.iconClass}`} />
                </div>

                {/* Title */}
                <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>

                {/* Description */}
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
