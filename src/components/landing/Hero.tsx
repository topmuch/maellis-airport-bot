'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  fadeInUp,
  fadeInRight,
  staggerContainer,
  staggerItem,
  float,
  viewportOnce,
} from '@/lib/animations'

export function Hero() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden" style={{ scrollMarginTop: '4.5rem' }}>
      {/* ─── Animated Gradient Background ──────────────────────────────────── */}
      <div
        className="absolute inset-0 -z-10 animate-hero-gradient"
        aria-hidden="true"
        style={{
          backgroundSize: '300% 300%',
          background:
            'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(14,165,233,0.06) 40%, rgba(16,185,129,0.05) 70%, rgba(249,115,22,0.08) 100%)',
        }}
      />
      {/* Decorative orbs */}
      <div
        className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full opacity-20 dark:opacity-10 -z-10"
        style={{
          background:
            'radial-gradient(circle, rgba(249,115,22,0.4) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full opacity-15 dark:opacity-10 -z-10"
        style={{
          background:
            'radial-gradient(circle, rgba(14,165,233,0.35) 0%, transparent 70%)',
        }}
      />

      {/* ─── Content Grid ──────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* ─── Left Column: Copy ───────────────────────────────────────── */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-6 text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div variants={staggerItem} className="flex justify-center lg:justify-start">
              <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 px-3 py-1 text-sm">
                Propulsé par IA — Llama 3
              </Badge>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeInUp}
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
            >
              L&apos;Assistant IA qui{' '}
              <span className="bg-gradient-to-r from-orange-500 via-orange-400 to-orange-600 bg-clip-text text-transparent">
                Transforme
              </span>{' '}
              l&apos;Expérience Aéroportuaire en Afrique
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={fadeInUp}
              className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0"
            >
              WhatsApp + Intelligence Artificielle = 40% de coûts en moins, 15%
              de revenus en plus. Déployé en 7 jours.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={staggerItem}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Button
                asChild
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-6 py-3 text-base font-semibold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-shadow"
              >
                <a
                  href="https://wa.me/221784858226"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="mr-1">📱</span> Essayer la Démo Gratuite
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-slate-300 dark:border-slate-700 rounded-lg px-6 py-3 text-base font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <a
                  href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="mr-1">🎥</span> Voir la Vidéo (2 min)
                </a>
              </Button>
            </motion.div>

            {/* Login Links */}
            <motion.div
              variants={staggerItem}
              className="flex flex-wrap gap-4 justify-center lg:justify-start mt-2"
            >
              <a
                href="/auth/admin"
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-200 dark:group-hover:bg-orange-500/20 transition-colors">
                  <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <span>Connexion Admin</span>
              </a>
              <a
                href="/auth/partner"
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-teal-600 dark:hover:text-teal-400 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-500/10 flex items-center justify-center group-hover:bg-teal-200 dark:group-hover:bg-teal-500/20 transition-colors">
                  <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <span>Espace Partenaire</span>
              </a>
            </motion.div>

            {/* Social Proof */}
            <motion.p
              variants={fadeInUp}
              className="text-sm text-muted-foreground mt-2 text-center lg:text-left"
            >
              ⭐⭐⭐⭐⭐ Déjà adopté par 3 aéroports en Afrique de l&apos;Ouest
            </motion.p>
          </motion.div>

          {/* ─── Right Column: iPhone Mockup ─────────────────────────────── */}
          <motion.div
            variants={fadeInRight}
            initial="hidden"
            animate="visible"
            viewport={viewportOnce}
            className="flex justify-center lg:justify-end"
          >
            <motion.div
              variants={float}
              animate="animate"
              className="relative"
            >
              {/* Phone frame */}
              <div className="relative w-[280px] sm:w-[300px] md:w-[320px] rounded-[2.5rem] border-[8px] border-slate-800 dark:border-slate-600 bg-white dark:bg-slate-900 p-2 shadow-2xl shadow-slate-900/20 dark:shadow-slate-950/50">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-800 dark:bg-slate-600 rounded-b-2xl z-10" />

                {/* Screen content */}
                <div className="rounded-[2rem] overflow-hidden bg-slate-50 dark:bg-slate-950 h-[480px] sm:h-[500px] md:h-[520px] flex flex-col">
                  {/* WhatsApp Header */}
                  <div className="bg-[#075E54] dark:bg-[#054640] px-4 py-3 flex items-center gap-3">
                    {/* Back arrow */}
                    <svg className="w-5 h-5 text-white/80 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">S</span>
                    </div>
                    {/* Name & status */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-white text-sm font-semibold truncate">
                          Smartly Assistant
                        </p>
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                      </div>
                      <p className="text-white/60 text-xs">En ligne</p>
                    </div>
                  </div>

                  {/* Chat Body */}
                  <div className="flex-1 overflow-hidden bg-[#ECE5DD] dark:bg-slate-900 px-3 py-4 flex flex-col gap-3">
                    {/* User bubble 1 */}
                    <div className="flex justify-end">
                      <div className="bg-[#DCF8C6] dark:bg-emerald-900/60 rounded-lg rounded-tr-none px-3 py-2 max-w-[85%] shadow-sm">
                        <p className="text-sm text-slate-800 dark:text-slate-100">
                          Bonjour, quel est le statut du vol AF123 ?
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 text-right mt-1">
                          14:22
                        </p>
                      </div>
                    </div>

                    {/* Bot bubble 1 */}
                    <div className="flex justify-start">
                      <div className="bg-white dark:bg-slate-800 rounded-lg rounded-tl-none px-3 py-2 max-w-[85%] shadow-sm">
                        <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-line">
                          ✈️ <strong>Vol AF123</strong> — Paris/Dakar
                          {'\n'}🕐 Départ: 14:30 — Porte B12
                          {'\n'}✅ À l&apos;heure — Embarquement à 13:50
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 text-right mt-1">
                          14:22 ✓✓
                        </p>
                      </div>
                    </div>

                    {/* User bubble 2 */}
                    <div className="flex justify-end">
                      <div className="bg-[#DCF8C6] dark:bg-emerald-900/60 rounded-lg rounded-tr-none px-3 py-2 max-w-[85%] shadow-sm">
                        <p className="text-sm text-slate-800 dark:text-slate-100">
                          Génial ! Et pour un taxi ?
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 text-right mt-1">
                          14:23
                        </p>
                      </div>
                    </div>

                    {/* Bot bubble 2 */}
                    <div className="flex justify-start">
                      <div className="bg-white dark:bg-slate-800 rounded-lg rounded-tl-none px-3 py-2 max-w-[85%] shadow-sm">
                        <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed">
                          🚕 Voici 3 options de taxi disponibles...
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 text-right mt-1">
                          14:23 ✓✓
                        </p>
                      </div>
                    </div>

                    {/* Typing indicator */}
                    <div className="flex justify-start">
                      <div className="bg-white dark:bg-slate-800 rounded-lg rounded-tl-none px-4 py-3 shadow-sm">
                        <div className="flex gap-1 items-center">
                          <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Input bar */}
                  <div className="bg-[#F0F0F0] dark:bg-slate-800 px-3 py-2 flex items-center gap-2">
                    <div className="flex-1 bg-white dark:bg-slate-700 rounded-full px-4 py-2">
                      <span className="text-xs text-slate-400">Écrire un message...</span>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-[#075E54] dark:bg-[#054640] flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Glow behind phone */}
              <div
                className="absolute inset-0 rounded-[3rem] -z-10 blur-2xl opacity-30"
                style={{
                  background:
                    'radial-gradient(ellipse at center, rgba(249,115,22,0.3) 0%, transparent 70%)',
                }}
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
