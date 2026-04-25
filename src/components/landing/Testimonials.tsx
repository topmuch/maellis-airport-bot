'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Star } from 'lucide-react'
import { fadeInUp, staggerContainer, staggerItem, viewportOnce } from '@/lib/animations'

/* ─── Animated Counter Hook ──────────────────────────────────────────── */
function useAnimatedCounter(
  target: number,
  duration = 2000,
  inView: boolean,
  decimal = false,
) {
  const [count, setCount] = useState(0)
  const rafRef = useRef<number | null>(null)
  const prefersReduced = useRef(false)

  useEffect(() => {
    prefersReduced.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
  }, [])

  useEffect(() => {
    if (!inView) return

    if (prefersReduced.current) {
      // Defer setState to avoid synchronous cascading render
      const raf = requestAnimationFrame(() => setCount(target))
      return () => cancelAnimationFrame(raf)
    }

    const startTime = performance.now()

    function step(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)

      if (decimal) {
        setCount(parseFloat((eased * target).toFixed(1)))
      } else {
        setCount(Math.round(eased * target))
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      }
    }

    rafRef.current = requestAnimationFrame(step)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration, inView, decimal])

  return count
}

/* ─── Format Metric Display ──────────────────────────────────────────── */
function formatMetric(value: number, decimal: boolean): string {
  if (decimal) return value.toFixed(1)
  return value.toLocaleString('fr-FR')
}

/* ─── Metrics Data ───────────────────────────────────────────────────── */
const metrics = [
  {
    target: 1674,
    suffix: '+',
    label: 'Passagers assistés ce mois',
    prefix: '',
    decimal: false,
  },
  {
    target: 418,
    suffix: 'K+',
    label: 'FCFA revenus générés / mois',
    prefix: '',
    decimal: false,
  },
  {
    target: 0.8,
    suffix: 's',
    label: 'Temps de réponse moyen',
    prefix: '',
    decimal: true,
  },
  {
    target: 94,
    suffix: '%',
    label: 'Taux de résolution automatique',
    prefix: '',
    decimal: false,
  },
]

/* ─── Metric Card ────────────────────────────────────────────────────── */
function MetricCard({
  target,
  suffix,
  label,
  decimal,
}: {
  target: number
  suffix: string
  label: string
  decimal: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const count = useAnimatedCounter(target, 2000, inView, decimal)

  return (
    <div
      ref={ref}
      className="rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-sm p-6 text-center"
    >
      <div className="text-3xl lg:text-4xl font-bold text-white">
        {formatMetric(count, decimal)}
        {suffix}
      </div>
      <div className="text-sm text-slate-400 mt-2">{label}</div>
    </div>
  )
}

/* ─── Testimonials Data ──────────────────────────────────────────────── */
const testimonials = [
  {
    initials: 'AD',
    name: 'Amadou Diallo',
    title: 'Directeur Opérations',
    airport: 'Aéroport DSS — Dakar',
    avatarGradient: 'from-amber-500 to-orange-600',
    quote:
      'Smartly a réduit nos files d\'attente de 40%. Nos passagers sont ravis et notre équipe se concentre sur les cas complexes.',
  },
  {
    initials: 'FK',
    name: 'Fatou Koné',
    title: 'Responsable Commerciale',
    airport: 'AIBD — Abidjan',
    avatarGradient: 'from-cyan-500 to-blue-600',
    quote:
      'Le ROI a été atteint en 6 semaines. La marketplace génère des revenus que nous n\'avions jamais exploités auparavant.',
  },
  {
    initials: 'MS',
    name: 'Moussa Sow',
    title: 'Chef de Service Passagers',
    airport: 'Aéroport DSS — Dakar',
    avatarGradient: 'from-emerald-500 to-teal-600',
    quote:
      'L\'assistance multilingue est un game changer. Nos passagers internationaux sont impressionnés par la fluidité du service.',
  },
]

/* ─── Star Rating ────────────────────────────────────────────────────── */
function StarRating() {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="w-4 h-4 text-amber-400"
          fill="currentColor"
        />
      ))}
    </div>
  )
}

/* ─── Testimonials Component ─────────────────────────────────────────── */
export function Testimonials() {
  return (
    <section
      id="testimonials"
      className="py-20 lg:py-32 bg-slate-950"
      style={{ scrollMarginTop: '4.5rem' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ─── Part 1: Animated Metrics ─────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {metrics.map((m) => (
            <MetricCard
              key={m.label}
              target={m.target}
              suffix={m.suffix}
              label={m.label}
              decimal={m.decimal}
            />
          ))}
        </div>

        {/* ─── Part 2: Section Title ───────────────────────────────── */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="text-center"
        >
          <motion.h2
            className="text-3xl lg:text-4xl font-semibold tracking-tight text-white"
            variants={fadeInUp}
          >
            Ils ont transformé leur aéroport avec Smartly
          </motion.h2>
          <motion.p
            className="text-lg text-slate-400 mt-4"
            variants={fadeInUp}
          >
            Découvrez les retours d&apos;expérience de nos partenaires.
          </motion.p>
        </motion.div>

        {/* ─── Part 3: Testimonial Cards ───────────────────────────── */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.initials}
              className="rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-sm p-8 hover:border-amber-500/20 transition-all duration-300"
              variants={staggerItem}
              whileInView="visible"
              viewport={viewportOnce}
            >
              {/* Stars */}
              <StarRating />

              {/* Quote */}
              <p className="text-slate-300 leading-relaxed mt-6 text-[15px]">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Avatar + Info */}
              <div className="flex items-center gap-3 mt-6">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm bg-gradient-to-br ${t.avatarGradient}`}
                >
                  {t.initials}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{t.name}</p>
                  <p className="text-slate-500 text-xs">{t.title}</p>
                  <p className="text-slate-600 text-xs mt-0.5">{t.airport}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
