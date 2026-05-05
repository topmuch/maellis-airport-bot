'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Play, Plane, TrendingUp, Users } from 'lucide-react'

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1]

// ─── Animation Variants ─────────────────────────────────────────────────

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease },
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

const slideInRight = {
  hidden: { opacity: 0, x: 60, rotateY: -8 },
  visible: {
    opacity: 1,
    x: 0,
    rotateY: 0,
    transition: { duration: 0.8, ease, delay: 0.3 },
  },
}

const slideInCard = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease, delay: 0.6 },
  },
}

// ─── Hero Component ─────────────────────────────────────────────────────

export function Hero() {
  const reducedMotion = useReducedMotion()
  const shouldAnimate = !reducedMotion

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/30"
      style={{ scrollMarginTop: '5rem' }}
    >
      {/* ─── Animated Gradient Mesh (3 blurred orbs) ──────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Orb 1 — Amber, top-right */}
        <div
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-30 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.5) 0%, transparent 70%)',
            animation: shouldAnimate ? 'hero-orb-1 12s ease-in-out infinite' : 'none',
          }}
        />
        {/* Orb 2 — Violet/indigo, bottom-left */}
        <div
          className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
          style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.5) 0%, transparent 70%)',
            animation: shouldAnimate ? 'hero-orb-2 15s ease-in-out infinite' : 'none',
          }}
        />
        {/* Orb 3 — Emerald, center-left */}
        <div
          className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full opacity-15 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.5) 0%, transparent 70%)',
            animation: shouldAnimate ? 'hero-orb-3 10s ease-in-out infinite' : 'none',
          }}
        />
      </div>

      {/* ─── Subtle grid overlay ─────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* ─── Content Grid ────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-28 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* ═══ Left Column: Copy ═════════════════════════════════════ */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-0 text-center lg:text-left"
          >
            {/* ── Eyebrow Badge ────────────────────────────────────── */}
            <motion.div variants={staggerItem} className="mb-6 flex justify-center lg:justify-start">
              <span className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium px-3 py-1 rounded-full">
                <Plane className="w-3 h-3" />
                Propulsé par IA — Déployé en 7 jours
              </span>
            </motion.div>

            {/* ── Headline ─────────────────────────────────────────── */}
            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.1]"
            >
              L&apos;Assistant IA qui Transforme l&apos;Expérience Aéroportuaire en Afrique
            </motion.h1>

            {/* ── Subtitle ─────────────────────────────────────────── */}
            <motion.p
              variants={fadeUp}
              className="text-lg text-slate-400 leading-relaxed mt-6 max-w-xl mx-auto lg:mx-0"
            >
              WhatsApp + Intelligence Artificielle = 40% de coûts support en moins, +15% de
              revenus annexes. Une plateforme unifiée, multilingue et opérationnelle en une semaine.
            </motion.p>

            {/* ── CTA Buttons ──────────────────────────────────────── */}
            <motion.div
              variants={staggerItem}
              className="flex flex-col sm:flex-row gap-4 mt-10 justify-center lg:justify-start"
            >
              {/* Primary CTA */}
              <a
                href="#contact"
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="inline-flex items-center justify-center gap-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl px-8 py-4 text-base transition-all shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0"
              >
                Demander une Démo Privée
                <ArrowRight className="w-5 h-5" />
              </a>

              {/* Secondary CTA */}
              <a
                href="#demo"
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="inline-flex items-center justify-center gap-2.5 border border-white/20 text-white hover:bg-white/5 font-semibold rounded-xl px-8 py-4 text-base transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                <Play className="w-5 h-5" />
                Voir la Plateforme
              </a>
            </motion.div>

            {/* ── Social Proof ─────────────────────────────────────── */}
            <motion.p
              variants={staggerItem}
              className="text-sm text-slate-500 mt-8 flex items-center gap-2 justify-center lg:justify-start"
            >
              <span className="text-amber-400/80">⭐⭐⭐⭐⭐</span>
              Déjà adopté par 3 hubs aéroportuaires en Afrique de l&apos;Ouest
            </motion.p>
          </motion.div>

          {/* ═══ Right Column: iPhone Mockup ══════════════════════════ */}
          <motion.div
            variants={slideInRight}
            initial="hidden"
            animate="visible"
            className="flex justify-center lg:justify-end relative"
          >
            <div className="relative">
              {/* ── Floating Dashboard Card (behind phone) ──────────── */}
              <motion.div
                variants={slideInCard}
                initial="hidden"
                animate="visible"
                className="absolute -top-6 -left-8 sm:-left-12 md:-left-16 z-0 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 shadow-2xl"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white/80">Performance</p>
                    <p className="text-[10px] text-slate-500">Ce mois</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Passagers</span>
                    <span className="text-sm font-semibold text-white">1,674</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Résolution</span>
                    <span className="text-sm font-semibold text-emerald-400">94%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: '94%' }}
                      transition={{ duration: 1.5, delay: 1.2, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </motion.div>

              {/* ── iPhone Frame ───────────────────────────────────── */}
              <motion.div
                animate={
                  shouldAnimate
                    ? { y: [0, -10, 0] }
                    : { y: 0 }
                }
                transition={
                  shouldAnimate
                    ? { duration: 5, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0 }
                }
                className="relative z-10"
              >
                <div className="relative w-[260px] sm:w-[280px] md:w-[300px] lg:w-[310px] rounded-[40px] border-[8px] border-slate-700 bg-slate-900 shadow-2xl shadow-black/40">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-[26px] bg-slate-700 rounded-b-2xl z-20">
                    <div className="absolute top-[8px] left-1/2 -translate-x-1/2 w-16 h-[5px] bg-slate-800 rounded-full" />
                  </div>

                  {/* Screen */}
                  <div className="rounded-[32px] overflow-hidden bg-slate-950 h-[480px] sm:h-[500px] md:h-[520px] flex flex-col">
                    {/* ── WhatsApp Header ───────────────────────── */}
                    <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3 shrink-0">
                      {/* Back arrow */}
                      <svg
                        className="w-5 h-5 text-white/70 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                        <Plane className="w-4 h-4 text-amber-400" />
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
                        <p className="text-white/50 text-xs">En ligne</p>
                      </div>
                      {/* Call / More icons */}
                      <div className="ml-auto flex items-center gap-3">
                        <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                        </svg>
                      </div>
                    </div>

                    {/* ── Chat Body ───────────────────────────────── */}
                    <div className="flex-1 overflow-hidden bg-[#0B141A] px-3 py-4 flex flex-col gap-2.5">
                      {/* Date stamp */}
                      <div className="flex justify-center">
                        <span className="text-[10px] text-slate-500 bg-white/5 rounded-lg px-3 py-1">
                          Aujourd&apos;hui
                        </span>
                      </div>

                      {/* User bubble 1 */}
                      <div className="flex justify-end">
                        <div className="bg-[#005C4B] rounded-lg rounded-tr-sm px-3 py-2 max-w-[85%]">
                          <p className="text-[13px] text-white leading-snug">
                            Bonjour, c&apos;est quoi le statut du vol AF123 ?
                          </p>
                          <p className="text-[10px] text-white/40 text-right mt-1">
                            14:22 ✓✓
                          </p>
                        </div>
                      </div>

                      {/* Bot bubble 1 */}
                      <div className="flex justify-start">
                        <div className="bg-[#1F2C34] rounded-lg rounded-tl-sm px-3 py-2.5 max-w-[85%]">
                          <p className="text-[13px] text-white leading-relaxed whitespace-pre-line">
                            ✈️ Vol AF123 — Paris CDG → Dakar
                            {'\n'}Statut: À l&apos;heure
                            {'\n'}Arrivée prévue: 14h35
                            {'\n'}Porte: B12
                            {'\n'}✅ En vol depuis 4h32
                          </p>
                          <p className="text-[10px] text-white/40 text-right mt-1">
                            14:22 ✓✓
                          </p>
                        </div>
                      </div>

                      {/* User bubble 2 */}
                      <div className="flex justify-end">
                        <div className="bg-[#005C4B] rounded-lg rounded-tr-sm px-3 py-2 max-w-[85%]">
                          <p className="text-[13px] text-white leading-snug">
                            Parfait ! Et pour réserver un salon VIP ?
                          </p>
                          <p className="text-[10px] text-white/40 text-right mt-1">
                            14:23 ✓✓
                          </p>
                        </div>
                      </div>

                      {/* Typing indicator */}
                      <div className="flex justify-start">
                        <div className="bg-[#1F2C34] rounded-lg rounded-tl-sm px-4 py-3">
                          <div className="flex gap-1 items-center">
                            <span
                              className="w-2 h-2 rounded-full bg-slate-400"
                              style={shouldAnimate ? { animation: 'typing-bounce 1.4s ease-in-out infinite', animationDelay: '0ms' } : {}}
                            />
                            <span
                              className="w-2 h-2 rounded-full bg-slate-400"
                              style={shouldAnimate ? { animation: 'typing-bounce 1.4s ease-in-out infinite', animationDelay: '200ms' } : {}}
                            />
                            <span
                              className="w-2 h-2 rounded-full bg-slate-400"
                              style={shouldAnimate ? { animation: 'typing-bounce 1.4s ease-in-out infinite', animationDelay: '400ms' } : {}}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Input Bar ──────────────────────────────── */}
                    <div className="bg-[#1F2C34] px-3 py-2.5 flex items-center gap-2 shrink-0">
                      <div className="flex-1 bg-[#2A3942] rounded-full px-4 py-2.5 flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                        </svg>
                        <span className="text-xs text-slate-500">Écrire un message...</span>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-[#00A884] flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Glow behind phone */}
                <div
                  className="absolute inset-0 rounded-[3rem] -z-10 blur-3xl opacity-40"
                  style={{
                    background:
                      'radial-gradient(ellipse at center, rgba(245, 158, 11, 0.25) 0%, transparent 70%)',
                  }}
                />
              </motion.div>

              {/* ── Secondary Floating Card (bottom-right) ──────────── */}
              <motion.div
                variants={slideInCard}
                initial="hidden"
                animate="visible"
                className="absolute -bottom-4 -right-4 sm:-right-8 md:-right-12 z-0 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-3.5 shadow-2xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">+28%</p>
                    <p className="text-[10px] text-slate-500">Satisfaction client</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ─── Keyframes (injected once) ─────────────────────────────── */}
      <style jsx global>{`
        @keyframes hero-orb-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 30px) scale(1.05); }
          66% { transform: translate(20px, -20px) scale(0.95); }
        }
        @keyframes hero-orb-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -40px) scale(1.08); }
          66% { transform: translate(-25px, 15px) scale(0.92); }
        }
        @keyframes hero-orb-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 25px) scale(1.1); }
        }
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </section>
  )
}
