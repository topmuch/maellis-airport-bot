'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Lightbulb,
  Shield,
  Zap,
  Globe,
  Users,
  Building2,
  CheckCircle,
  Languages,
  ArrowRight,
  Rocket,
} from 'lucide-react'
import { JsonLdScript } from '@/components/JsonLdScript'

const aboutJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'À Propos - Smartly Assistant',
  url: 'https://smartly.aero/about',
  description:
    'Découvrez la mission, les valeurs et l\'équipe de Smartly Assistant, l\'IA qui transforme l\'expérience aéroportuaire en Afrique.',
}

// ─── Animation Helpers ─────────────────────────────────────────────────────

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1]

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease },
  },
}

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease },
  },
}

// ─── Count-Up Hook ─────────────────────────────────────────────────────────

function useCountUp(target: number, duration: number = 2000) {
  const prefersReducedMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [displayValue, setDisplayValue] = useState(0)
  const hasAnimated = useRef(false)

  const animate = useCallback(() => {
    if (hasAnimated.current || prefersReducedMotion) {
      setDisplayValue(target)
      return
    }

    hasAnimated.current = true
    const startTime = performance.now()

    function step(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(eased * target)
      setDisplayValue(current)

      if (progress < 1) {
        requestAnimationFrame(step)
      }
    }

    requestAnimationFrame(step)
  }, [target, duration, prefersReducedMotion])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animate()
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [animate])

  return { ref, displayValue }
}

// ─── Format Number with Spaces ─────────────────────────────────────────────

function formatWithSpaces(n: number): string {
  return n.toLocaleString('fr-FR').replace(/\s/g, ' ')
}

// ─── Data ──────────────────────────────────────────────────────────────────

interface ValueCard {
  icon: LucideIcon
  title: string
  description: string
}

const values: ValueCard[] = [
  {
    icon: Lightbulb,
    title: 'Innovation Inclusive',
    description:
      "IA accessible à tous les aéroports africains, du hub régional à l'aérodrome local. Nous pensons que la technologie doit servir chacun, sans exception. Notre solution s'adapte aux réalités locales, du multilinguisme aux systèmes de paiement.",
  },
  {
    icon: Shield,
    title: 'Sécurité des Données',
    description:
      "Protection RGPD de bout en bout, hébergement sécurisé, chiffrement TLS 1.3. La confidentialité n'est pas une option, c'est un engagement. Chaque interaction est protégée.",
  },
  {
    icon: Zap,
    title: 'Excellence Opérationnelle',
    description:
      "SLA 99.9%, support 24/7, déploiement en 7 jours. Nous mesurons notre succès à celui de nos partenaires. Chaque minute gagnée pour un passager est une victoire.",
  },
  {
    icon: Globe,
    title: 'Impact Local',
    description:
      "Création d'emplois, formation locale, écosystème partenaires sénégalais. Smartly est fièrement made in Dakar, avec une ambition panafricaine.",
  },
]

interface StatItem {
  icon: LucideIcon
  target: number
  suffix: string
  label: string
}

const stats: StatItem[] = [
  { icon: Users, target: 50000, suffix: '+', label: 'Passagers assistés' },
  { icon: Building2, target: 12, suffix: '', label: 'Aéroports partenaires' },
  { icon: CheckCircle, target: 97, suffix: '%', label: 'Taux de résolution' },
  { icon: Languages, target: 8, suffix: '', label: 'Langues supportées' },
]

// ─── Stat Counter Component ────────────────────────────────────────────────

function StatCounter({ icon: Icon, target, suffix, label }: StatItem) {
  const { ref, displayValue } = useCountUp(target)

  return (
    <div ref={ref} className="text-center group">
      <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors duration-300">
        <Icon className="w-7 h-7 text-amber-400" />
      </div>
      <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tabular-nums">
        {formatWithSpaces(displayValue)}
        {suffix}
      </p>
      <p className="mt-2 text-sm sm:text-base text-slate-400">{label}</p>
    </div>
  )
}

// ─── Value Card Component ──────────────────────────────────────────────────

function ValueCard({ icon: Icon, title, description }: ValueCard) {
  return (
    <motion.div
      variants={staggerItem}
      className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-6 sm:p-8 hover:border-amber-500/20 hover:bg-white/[0.06] transition-all duration-300"
    >
      {/* Icon */}
      <div className="mb-5 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
        <Icon className="w-6 h-6 text-white" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-white">{title}</h3>

      {/* Description */}
      <p className="mt-3 text-slate-400 leading-relaxed text-[15px]">
        {description}
      </p>
    </motion.div>
  )
}

// ─── About Page ────────────────────────────────────────────────────────────

export default function AboutPage() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <>
      <JsonLdScript data={aboutJsonLd} />

      <main className="min-h-screen bg-slate-950 text-white">
        {/* ─── Back to home ──────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour &agrave; l&apos;accueil
          </Link>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 1 — Hero
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden pt-16 pb-20 sm:pt-20 sm:pb-28 lg:pt-24 lg:pb-36">
          {/* ─── Decorative Orbs ────────────────────────────────────── */}
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            aria-hidden="true"
          >
            <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-orange-500/10 blur-[128px]" />
            <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-teal-500/10 blur-[128px]" />
            <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-500/5 blur-[96px]" />
          </div>

          {/* ─── Grid Pattern Overlay ───────────────────────────────── */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            aria-hidden="true"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />

          {/* ─── Content ────────────────────────────────────────────── */}
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-semibold tracking-tight text-white leading-[1.15]"
            >
              Nous{' '}
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
                réinventons
              </span>{' '}
              l&apos;expérience aéroportuaire en Afrique, une conversation à la fois.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-6 text-lg sm:text-xl text-slate-400 leading-relaxed max-w-3xl mx-auto"
            >
              Smartly Assistant est née d&apos;un constat simple : des millions de passagers
              africains méritent une expérience aéroportuaire moderne, fluide et humaine.
              En combinant intelligence artificielle et WhatsApp, nous créons un pont entre
              les voyageurs, les aéroports et les commerces locaux. Notre mission est de
              transformer chaque terminal en un hub intelligent, accessible et connecté.
            </motion.p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 2 — Mission
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="relative py-20 lg:py-28 bg-gradient-to-b from-slate-950 via-slate-900/50 to-slate-950">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={staggerContainer}
              className="flex flex-col items-center text-center"
            >
              {/* Icon */}
              <motion.div
                variants={staggerItem}
                className="mb-6 w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25"
              >
                <Rocket className="w-8 h-8 text-white" />
              </motion.div>

              {/* Heading */}
              <motion.h2
                variants={fadeUp}
                className="text-3xl lg:text-4xl font-semibold tracking-tight text-white"
              >
                Notre Mission
              </motion.h2>

              {/* Body paragraphs */}
              <motion.div
                variants={staggerItem}
                className="mt-8 space-y-5 max-w-3xl"
              >
                <p className="text-lg text-slate-300 leading-relaxed">
                  Connecter les passagers, les aéroports et les commerces locaux grâce à
                  une IA conversationnelle accessible via WhatsApp. Nous croyons que la
                  technologie la plus puissante est celle qui disparaît derrière
                  l&apos;expérience utilisateur — simple, naturelle et instantanée.
                </p>
                <p className="text-lg text-slate-400 leading-relaxed">
                  Chaque jour, des milliers de voyageurs africains perdent du temps à
                  chercher des informations, à faire la queue ou à naviguer dans des
                  processus complexes. Smartly élimine ces frictions en offrant un
                  assistant intelligent disponible 24h/24, en 8 langues, directement sur
                  l&apos;application qu&apos;ils utilisent déjà.
                </p>
                <p className="text-lg text-slate-400 leading-relaxed">
                  Notre plateforme crée un écosystème gagnant-gagnant : les passagers
                  gagnent du temps et du confort, les aéroports réduisent leurs coûts
                  support, et les commerces locaux accèdent à un nouveau canal de revenus.
                </p>
              </motion.div>

              {/* Highlight Stat */}
              <motion.div
                variants={staggerItem}
                className="mt-10 inline-flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] backdrop-blur-sm px-6 py-4"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl sm:text-3xl font-bold text-amber-400">
                    -40%
                  </span>
                  <span className="text-sm text-slate-400">
                    de coûts support
                  </span>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="flex items-center gap-2">
                  <span className="text-2xl sm:text-3xl font-bold text-emerald-400">
                    +15%
                  </span>
                  <span className="text-sm text-slate-400">
                    de revenus annexes
                  </span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 3 — Values Grid
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="relative py-20 lg:py-28 bg-slate-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Heading */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, ease }}
              className="text-center mb-14"
            >
              <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight text-white">
                Nos Valeurs
              </h2>
              <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
                Les principes qui guident chaque décision, chaque ligne de code et
                chaque partenariat.
              </p>
            </motion.div>

            {/* Grid */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {values.map((value) => (
                <ValueCard key={value.title} {...value} />
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 4 — Animated Stats
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="relative py-20 lg:py-28 bg-gradient-to-b from-slate-950 via-slate-900/50 to-slate-950 overflow-hidden">
          {/* Decorative Orbs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute -right-40 top-1/4 h-80 w-80 rounded-full bg-amber-500/5 blur-[120px]" />
            <div className="absolute -left-40 bottom-1/4 h-80 w-80 rounded-full bg-teal-500/5 blur-[120px]" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Heading */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, ease }}
              className="text-center mb-14"
            >
              <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight text-white">
                Smartly en chiffres
              </h2>
              <p className="mt-4 text-lg text-slate-400">
                Des résultats concrets qui parlent d&apos;eux-mêmes.
              </p>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12"
            >
              {stats.map((stat) => (
                <motion.div key={stat.label} variants={staggerItem}>
                  <StatCounter {...stat} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 5 — CTA
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="relative py-20 lg:py-28 bg-slate-950 overflow-hidden">
          {/* Background Gradient Mesh */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-amber-600/10 blur-[150px]" />
            <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-cyan-600/10 blur-[150px]" />
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerContainer}
            className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          >
            {/* Heading */}
            <motion.h2
              variants={fadeUp}
              className="text-3xl lg:text-4xl sm:text-5xl font-semibold tracking-tight text-white"
            >
              Rejoignez le réseau Smartly
            </motion.h2>

            {/* Subtext */}
            <motion.p
              variants={fadeUp}
              className="mt-6 text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto"
            >
              Transformez votre aéroport avec l&apos;IA conversationnelle. Démo gratuite,
              déploiement en 7 jours.
            </motion.p>

            {/* Buttons */}
            <motion.div
              variants={staggerItem}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
            >
              <Link href="/contact">
                <motion.span
                  className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium px-8 py-4 rounded-xl shadow-lg shadow-amber-500/25 transition-all duration-300"
                  whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -1 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                >
                  Demander une démo
                  <ArrowRight className="w-5 h-5" />
                </motion.span>
              </Link>

              <Link href="/partner/login">
                <motion.span
                  className="inline-flex items-center justify-center gap-2.5 border border-white/20 text-white hover:bg-white/5 font-medium px-8 py-4 rounded-xl transition-all duration-300"
                  whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -1 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                >
                  Devenir partenaire
                  <ArrowRight className="w-5 h-5" />
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>
        </section>
      </main>
    </>
  )
}
