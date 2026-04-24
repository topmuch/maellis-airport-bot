'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { staggerContainer, staggerItem, fadeInUp, viewportOnce } from '@/lib/animations'

// ─── Types ───────────────────────────────────────────────────────────────

interface PricingFeature {
  text: string
}

interface PricingPlan {
  name: string
  monthlyPrice: number | null
  fcfaPrice: string | null
  subtitle: string
  features: PricingFeature[]
  ctaLabel: string
  ctaVariant: 'filled' | 'outline'
  highlighted: boolean
  badge?: string
}

// ─── Plan Data ───────────────────────────────────────────────────────────

const plans: PricingPlan[] = [
  {
    name: 'STARTER',
    monthlyPrice: 99,
    fcfaPrice: '65 000',
    subtitle: 'Pour les petits a\u00e9roports',
    features: [
      { text: '1 000 conversations/mois' },
      { text: 'Recherche de vols' },
      { text: 'FAQ intelligente' },
      { text: 'Dashboard basique' },
      { text: 'Support email' },
    ],
    ctaLabel: 'Choisir Starter',
    ctaVariant: 'outline',
    highlighted: false,
  },
  {
    name: 'PRO',
    monthlyPrice: 499,
    fcfaPrice: '325 000',
    subtitle: 'Pour les a\u00e9roports moyenne taille',
    features: [
      { text: '10 000 conversations/mois' },
      { text: 'Tous modules inclus' },
      { text: 'Paiements Orange Money / Wave' },
      { text: 'Dashboard complet + Analytics' },
      { text: 'Support prioritaire 24/7' },
      { text: "API d'int\u00e9gration" },
      { text: 'Setup gratuit (3 000\u00a0\u20ac offerts)' },
    ],
    ctaLabel: 'Essai 30 jours gratuit',
    ctaVariant: 'filled',
    highlighted: true,
    badge: 'RECOMMAND\u00c9',
  },
  {
    name: 'ENTERPRISE',
    monthlyPrice: null,
    fcfaPrice: null,
    subtitle: 'Pour les grands hubs a\u00e9roportuaires',
    features: [
      { text: 'Conversations illimit\u00e9es' },
      { text: 'D\u00e9ploiement multi-a\u00e9roports' },
      { text: 'Personnalisation avanc\u00e9e' },
      { text: 'SLA garanti 99.9%' },
      { text: 'Account manager d\u00e9di\u00e9' },
    ],
    ctaLabel: "Contacter l'\u00e9quipe",
    ctaVariant: 'outline',
    highlighted: false,
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────

function getAnnualPrice(monthly: number): number {
  return Math.round(monthly * 0.8)
}

function formatPrice(value: number): string {
  return value.toLocaleString('fr-FR')
}

// ─── Component ───────────────────────────────────────────────────────────

export function PricingTable() {
  const [isAnnual, setIsAnnual] = useState(false)

  return (
    <section id="pricing" className="py-20" style={{ scrollMarginTop: '4.5rem' }}>
      <div className="mx-auto max-w-6xl px-4">
        {/* ── Heading ── */}
        <motion.div
          className="mb-12 text-center"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <h2 className="text-3xl font-bold md:text-4xl">
            Des tarifs simples et <span className="text-orange-500">transparents</span>
          </h2>

          {/* ── Toggle ── */}
          <div className="mt-8 flex items-center justify-center">
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsAnnual(false)}
                className={`px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
                  !isAnnual
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                Mensuel
              </button>
              <button
                type="button"
                onClick={() => setIsAnnual(true)}
                className={`px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isAnnual
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                Annuel
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isAnnual
                      ? 'bg-orange-600 text-white'
                      : 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400'
                  }`}
                >
                  -20%
                </span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Pricing Cards ── */}
        <motion.div
          className="grid gap-8 md:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {plans.map((plan) => {
            const displayPrice =
              plan.monthlyPrice !== null
                ? isAnnual
                  ? getAnnualPrice(plan.monthlyPrice)
                  : plan.monthlyPrice
                : null
            const annualSavings =
              plan.monthlyPrice !== null ? plan.monthlyPrice * 12 - getAnnualPrice(plan.monthlyPrice) * 12 : null

            return (
              <motion.div
                key={plan.name}
                variants={staggerItem}
                className={`relative flex flex-col rounded-2xl bg-white p-8 dark:bg-slate-900 ${
                  plan.highlighted
                    ? 'border-2 border-orange-500 shadow-lg shadow-orange-500/10'
                    : 'border border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* ── Badge ── */}
                {plan.badge && (
                  <div className="absolute -top-3 right-6">
                    <Badge className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full border-none hover:bg-orange-500">
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                {/* ── Plan Name ── */}
                <div className="mb-2">
                  <span
                    className={`text-sm font-bold tracking-wider ${
                      plan.highlighted ? 'text-orange-500' : 'text-muted-foreground'
                    }`}
                  >
                    {plan.name}
                  </span>
                </div>

                {/* ── Price ── */}
                <div className="mb-2">
                  {displayPrice !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold tracking-tight">
                        {formatPrice(displayPrice)}
                      </span>
                      <span className="text-lg font-medium text-muted-foreground">&euro;/mois</span>
                    </div>
                  ) : (
                    <div className="text-4xl font-extrabold tracking-tight">Sur mesure</div>
                  )}
                </div>

                {/* ── FCFA Equivalent ── */}
                {plan.fcfaPrice && (
                  <p className="mb-1 text-sm text-muted-foreground">
                    {plan.fcfaPrice}&nbsp;FCFA
                  </p>
                )}

                {/* ── Annual Savings ── */}
                {isAnnual && annualSavings !== null && (
                  <p className="mb-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    \u2713 &Eacute;conomisez {formatPrice(annualSavings)}&euro;/an
                  </p>
                )}

                {/* ── Subtitle ── */}
                <p className="mb-6 text-sm text-muted-foreground">{plan.subtitle}</p>

                {/* ── CTA Button ── */}
                <div className="mb-8">
                  <Button
                    className={`w-full ${
                      plan.ctaVariant === 'filled'
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : 'border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white'
                    }`}
                    variant={plan.ctaVariant === 'filled' ? 'default' : 'outline'}
                    size="lg"
                  >
                    {plan.ctaLabel}
                  </Button>
                </div>

                {/* ── Divider ── */}
                <div className="mb-6 h-px bg-slate-200 dark:bg-slate-800" />

                {/* ── Features ── */}
                <ul className="flex flex-col gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="text-sm text-muted-foreground">{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )
          })}
        </motion.div>

        {/* ── Trust Badges ── */}
        <motion.div
          className="mt-12 flex flex-wrap items-center justify-center gap-4"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <span className="text-sm text-muted-foreground">
            <span className="mr-1 text-emerald-500">\u2705</span>Sans engagement
          </span>
          <span className="text-sm text-muted-foreground">
            <span className="mr-1 text-emerald-500">\u2705</span>Annulable anytime
          </span>
          <span className="text-sm text-muted-foreground">
            <span className="mr-1 text-emerald-500">\u2705</span>Migration gratuite
          </span>
        </motion.div>
      </div>
    </section>
  )
}
