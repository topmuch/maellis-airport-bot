'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Download, Mail, Phone } from 'lucide-react'

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1]

export function FinalCTA() {
  const prefersReducedMotion = useReducedMotion()

  const fadeUp = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.7,
        ease,
      },
    },
  }

  const staggerChildren = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.12,
        delayChildren: 0.05,
      },
    },
  }

  return (
    <section className="py-20 lg:py-32 bg-slate-950 relative overflow-hidden">
      {/* ─── Background Gradient Mesh ─────────────────────────────────── */}
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[150px] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[150px] pointer-events-none"
        aria-hidden="true"
      />

      {/* ─── Content ──────────────────────────────────────────────────── */}
      <motion.div
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10"
        variants={staggerChildren}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
      >
        {/* Title */}
        <motion.h2
          className="text-3xl lg:text-5xl font-semibold tracking-tight text-white"
          variants={fadeUp}
        >
          Prêt à moderniser votre aéroport ?
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          className="text-lg text-slate-400 mt-6 max-w-2xl mx-auto leading-relaxed"
          variants={fadeUp}
        >
          Rejoignez les hubs qui font confiance à Smartly Assistant. Déploiement
          en 7 jours, accompagnement dédié, ROI garanti.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
          variants={fadeUp}
        >
          <motion.a
            href="https://wa.me/221784858226"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium px-8 py-4 rounded-xl shadow-lg shadow-amber-500/25 transition-all duration-300 inline-flex items-center gap-2"
            whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
          >
            Contacter l&apos;Équipe Commerciale
            <ArrowRight className="w-4 h-4" />
          </motion.a>

          <motion.a
            href="#"
            className="border border-white/20 text-white hover:bg-white/5 font-medium px-8 py-4 rounded-xl transition-all duration-300 inline-flex items-center gap-2"
            whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
          >
            Télécharger la Brochure Technique
            <Download className="w-4 h-4" />
          </motion.a>
        </motion.div>

        {/* Contact Info */}
        <motion.div
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8"
          variants={fadeUp}
        >
          <a
            href="mailto:contact@smartly.aero"
            className="text-slate-400 text-sm flex items-center gap-2 hover:text-white transition-colors"
          >
            <Mail className="w-4 h-4" />
            contact@smartly.aero
          </a>
          <a
            href="tel:+221338696969"
            className="text-slate-400 text-sm flex items-center gap-2 hover:text-white transition-colors"
          >
            <Phone className="w-4 h-4" />
            +221 33 869 69 69
          </a>
        </motion.div>
      </motion.div>
    </section>
  )
}
