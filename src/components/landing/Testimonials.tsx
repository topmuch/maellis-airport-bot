'use client'

import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { fadeInUp, staggerContainer, staggerItem, viewportOnce } from '@/lib/animations'

/* ─── Counter Hook ────────────────────────────────────────────────────── */
function useAnimatedCounter(target: number, duration = 2000, isActive: boolean) {
  const [count, setCount] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isActive) return

    const startTime = performance.now()

    function step(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      }
    }

    rafRef.current = requestAnimationFrame(step)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration, isActive])

  return count
}

/* ─── Data ────────────────────────────────────────────────────────────── */
const testimonials = [
  {
    initials: 'MD',
    name: 'Mamadou Diallo',
    role: 'Directeur Aéroport Ziguinchor',
    quote:
      "Smartly a réduit nos appels de 60% en 3 mois. Le ROI a été atteint en 6 semaines. Nos passagers adorent !",
    subtitle: 'Aéroport de Ziguinchor, Sénégal',
    avatarBg: 'bg-blue-100 dark:bg-blue-900/30',
    avatarText: 'text-blue-600',
  },
  {
    initials: 'FN',
    name: 'Fatou Ndiaye',
    role: 'CEO Agence Voyage Dakar',
    quote:
      "Notre chiffre d'affaires a augmenté de 25% grâce aux ventes via WhatsApp. L'IA comprend même le wolof !",
    subtitle: 'Voyages Dakar Express',
    avatarBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    avatarText: 'text-emerald-600',
  },
  {
    initials: 'JK',
    name: 'Jean Kouamé',
    role: 'Manager Lounge Abidjan',
    quote:
      'Les réservations de salons VIP ont doublé. Le système de paiement Wave est parfaitement intégré.',
    subtitle: 'Sky Lounge AIBJ',
    avatarBg: 'bg-violet-100 dark:bg-violet-900/30',
    avatarText: 'text-violet-600',
  },
]

const stats = [
  { emoji: '🎯', target: 10000, suffix: '+', label: 'passagers assistés' },
  { emoji: '💰', target: 2500000, suffix: '+', label: 'FCFA revenus générés', format: true },
  { emoji: '⚡', target: 1.2, suffix: 's', label: 'temps de réponse moyen', decimal: true },
  { emoji: '😊', target: 94, suffix: '%', label: 'taux de satisfaction' },
]

function formatStat(value: number, format?: boolean, decimal?: boolean): string {
  if (decimal) return value.toFixed(1)
  if (format) {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  }
  return value.toLocaleString('fr-FR')
}

/* ─── Stat Item ───────────────────────────────────────────────────────── */
function StatItem({
  emoji,
  target,
  suffix,
  label,
  format,
  decimal,
}: {
  emoji: string
  target: number
  suffix: string
  label: string
  format?: boolean
  decimal?: boolean
}) {
  const [inView, setInView] = useState(false)
  const count = useAnimatedCounter(
    target,
    decimal ? 1200 : 2000,
    inView,
  )

  return (
    <motion.div
      className="text-center"
      onViewportEnter={() => setInView(true)}
      viewport={{ once: true, margin: '-60px' }}
    >
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-3xl font-bold text-orange-500">
        {formatStat(decimal ? count : count, format, decimal)}
        {suffix}
      </div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </motion.div>
  )
}

/* ─── Stars ───────────────────────────────────────────────────────────── */
function Stars() {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="size-4 text-amber-400"
          fill="currentColor"
        />
      ))}
    </div>
  )
}

/* ─── Component ───────────────────────────────────────────────────────── */
export function Testimonials() {
  return (
    <section id="testimonials" className="py-20 bg-slate-50 dark:bg-slate-900/50" style={{ scrollMarginTop: '4.5rem' }}>
      <div className="max-w-6xl mx-auto px-4">
        {/* Heading */}
        <motion.h2
          className="text-3xl font-bold text-center mb-14"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          Ils ont transformé leur aéroport avec Smartly
        </motion.h2>

        {/* Testimonial Cards */}
        <motion.div
          className="grid md:grid-cols-3 gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.initials}
              className="bg-white dark:bg-slate-800 rounded-xl border p-6 shadow-sm"
              variants={staggerItem}
            >
              {/* Avatar + Info */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`flex items-center justify-center size-12 rounded-full text-sm font-bold ${t.avatarBg} ${t.avatarText}`}
                >
                  {t.initials}
                </div>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>

              {/* Quote */}
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 mb-4">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Stars */}
              <Stars />

              {/* Subtitle */}
              <p className="text-xs text-muted-foreground mt-2">{t.subtitle}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto pt-12">
          {stats.map((s) => (
            <StatItem
              key={s.label}
              emoji={s.emoji}
              target={s.target}
              suffix={s.suffix}
              label={s.label}
              format={s.format}
              decimal={s.decimal}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
