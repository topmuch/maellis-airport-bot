'use client'

import { motion } from 'framer-motion'
import { X, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import {
  fadeInUp,
  staggerContainer,
  staggerItem,
  viewportOnce,
} from '@/lib/animations'

const problems = [
  'Files d\'attente interminables aux comptoirs',
  'Passagers perdus, stressés, insatisfaits',
  'Revenus annexes non exploités',
  'Support client coûteux et limité',
]

const solutions = [
  '-40% de demandes au comptoir physique',
  'Assistance 24h/24, 7j/7, multilingue',
  '+15% de revenus sur services annexes',
  'ROI atteint en moins de 2 mois',
]

export function ProblemSolution() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        {/* Heading */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="text-center mb-14"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-3xl md:text-4xl font-bold tracking-tight"
          >
            Le problème que les aéroports africains connaissent
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-muted-foreground text-lg mt-3"
          >
            Et comment Smartly Assistant le résout
          </motion.p>
        </motion.div>

        {/* Two-Column Grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {/* ─── Without Smartly ──────────────────────────────────────────── */}
          <motion.div variants={staggerItem}>
            <Card className="border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/40">
                    <X className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-red-700 dark:text-red-400">
                    Sans Smartly
                  </h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {problems.map((problem, i) => (
                  <motion.div
                    key={i}
                    variants={staggerItem}
                    className="flex items-start gap-3"
                  >
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                      <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                      {problem}
                    </p>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* ─── With Smartly ────────────────────────────────────────────── */}
          <motion.div variants={staggerItem}>
            <Card className="border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                    Avec Smartly
                  </h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {solutions.map((solution, i) => (
                  <motion.div
                    key={i}
                    variants={staggerItem}
                    className="flex items-start gap-3"
                  >
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                      {solution}
                    </p>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
