'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { X, Check } from 'lucide-react'

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1]

const problems = [
  'Files d\'attente interminables aux comptoirs d\'enregistrement',
  'Passagers perdus, stressés et insatisfaits',
  'Revenus annexes totalement non exploités',
  'Support client limité aux horaires d\'ouverture',
]

const solutions = [
  '-40% de demandes au comptoir physique',
  'Assistance 24h/24, 7j/7, multilingue (FR/EN/WO/AR)',
  '+15% de revenus sur services annexes',
  'ROI opérationnel en moins de 2 mois',
]

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      delay,
      ease,
    },
  }),
}

const listItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.45,
      delay: 0.3 + i * 0.08,
      ease,
    },
  }),
}

const prefersReducedMotionVariants = {
  hidden: { opacity: 1, y: 0, x: 0 },
  visible: { opacity: 1, y: 0, x: 0 },
}

export function ProblemSolution() {
  const reducedMotion = useReducedMotion()

  return (
    <section className="py-20 lg:py-32 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight text-white">
            Une équation simple
          </h2>
          <p className="text-lg text-slate-400 text-center mt-4">
            Le choix entre le statu quo et la transformation digitale.
          </p>
        </motion.div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ─── Sans Smartly ─────────────────────────────────────── */}
          <motion.div
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={reducedMotion ? prefersReducedMotionVariants : cardVariants}
          >
            <div className="rounded-2xl border border-red-500/10 bg-red-950/20 backdrop-blur-sm p-8 lg:p-10">
              {/* Card header */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                  <X className="h-5 w-5 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-red-400">
                  Sans Smartly Assistant
                </h3>
              </div>

              {/* Divider */}
              <div className="border-t border-red-500/10 my-6" />

              {/* Problem items */}
              <ul className="space-y-4">
                {problems.map((problem, i) => (
                  <motion.li
                    key={i}
                    custom={i}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={reducedMotion ? prefersReducedMotionVariants : listItemVariants}
                    className="flex items-start gap-3"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                      <X className="h-3.5 w-3.5 text-red-400" />
                    </span>
                    <span className="text-sm font-medium leading-relaxed text-red-300/80">
                      {problem}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* ─── Avec Smartly ─────────────────────────────────────── */}
          <motion.div
            custom={0.15}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={reducedMotion ? prefersReducedMotionVariants : cardVariants}
          >
            <div className="rounded-2xl border border-emerald-500/10 bg-emerald-950/20 backdrop-blur-sm p-8 lg:p-10">
              {/* Card header */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                  <Check className="h-5 w-5 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-emerald-400">
                  Avec Smartly Assistant
                </h3>
              </div>

              {/* Divider */}
              <div className="border-t border-emerald-500/10 my-6" />

              {/* Solution items */}
              <ul className="space-y-4">
                {solutions.map((solution, i) => (
                  <motion.li
                    key={i}
                    custom={i}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={reducedMotion ? prefersReducedMotionVariants : listItemVariants}
                    className="flex items-start gap-3"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    </span>
                    <span className="text-sm font-medium leading-relaxed text-emerald-300/80">
                      {solution}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
