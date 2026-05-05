'use client'

import { useState, useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Plane,
  Shield,
  Bell,
  Clock,
  MessageCircle,
  ArrowRight,
} from 'lucide-react'
import { AuthInput } from '@/components/ui/AuthInput'
import { AuthButton } from '@/components/ui/AuthButton'
import { loginPartner } from '@/app/actions/auth'

// ─── Floating notification card data ──────────────────────────────────────

const notificationCards = [
  {
    emoji: '✈️',
    text: 'Vol AF-722 retardé — Porte B42',
    indicator: 'bg-sky-500',
    icon: Clock,
  },
  {
    emoji: '🧳',
    text: 'Bagages livrés — Carrousel 3',
    indicator: 'bg-emerald-500',
    icon: Bell,
  },
  {
    emoji: '🛎️',
    text: 'Salon VIP réservé — 14:30',
    indicator: 'bg-amber-500',
    icon: MessageCircle,
  },
]

// ─── Animation helpers ────────────────────────────────────────────────────

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1]

function getVariants(shouldReduceMotion: boolean) {
  if (shouldReduceMotion) {
    return {
      fadeInUp: {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.2 } },
      },
      staggerContainer: {
        hidden: {},
        visible: { transition: { staggerChildren: 0 } },
      },
      staggerItem: {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.2 } },
      },
      float: {
        animate: { y: 0, transition: { duration: 0 } },
      },
      pulsePlane: {
        animate: { scale: 1, opacity: 1, transition: { duration: 0 } },
      },
      slideInLeft: {
        hidden: { opacity: 0, x: 0 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
      },
    }
  }

  return {
    fadeInUp: {
      hidden: { opacity: 0, y: 24 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease },
      },
    },
    staggerContainer: {
      hidden: {},
      visible: {
        transition: {
          staggerChildren: 0.15,
          delayChildren: 0.3,
        },
      },
    },
    staggerItem: {
      hidden: { opacity: 0, y: 20, scale: 0.95 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.5, ease },
      },
    },
    float: {
      animate: {
        y: [0, -8, 0],
        transition: {
          duration: 3.5,
          repeat: Infinity,
          ease: 'easeInOut' as const,
        },
      },
    },
    pulsePlane: {
      animate: {
        scale: [1, 1.08, 1],
        opacity: [0.9, 1, 0.9],
        transition: {
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut' as const,
        },
      },
    },
    slideInLeft: {
      hidden: { opacity: 0, x: -30 },
      visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.6, ease },
      },
    },
  }
}

// ─── Component ────────────────────────────────────────────────────────────

export default function PartnerLoginPage() {
  const router = useRouter()
  const shouldReduceMotion = useReducedMotion()

  const [showPassword, setShowPassword] = useState(false)
  const [state, formAction, isPending] = useActionState(loginPartner, {
    success: false,
  })

  const variants = getVariants(!!shouldReduceMotion)

  // Redirect on success
  useEffect(() => {
    if (state.success) {
      router.push('/?showLanding=false&activeModule=partners')
    }
  }, [state.success, router])

  return (
    <div className="lg:grid lg:grid-cols-2 lg:min-h-screen">
      {/* ═══════════════════════════════════════════════════════════════════
          LEFT SIDE — Airport Visual (Desktop only)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex relative items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950">
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40" />

        {/* Decorative ambient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-sky-500/8 blur-[100px]" />
          <div className="absolute -right-24 bottom-1/4 h-72 w-72 rounded-full bg-amber-500/8 blur-[100px]" />
        </div>

        {/* Grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        {/* Content container */}
        <div className="relative z-10 flex flex-col items-center justify-center px-12 py-16 text-center">
          {/* Animated Plane Icon */}
          <motion.div
            variants={variants.pulsePlane}
            initial="hidden"
            animate="animate"
            className="mb-12"
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 backdrop-blur-sm ring-1 ring-amber-400/20">
              <Plane className="h-12 w-12 text-amber-400" />
            </div>
          </motion.div>

          {/* Floating Notification Cards */}
          <motion.div
            variants={variants.staggerContainer}
            initial="hidden"
            animate="visible"
            className="mb-14 flex flex-col gap-4 w-full max-w-sm"
          >
            {notificationCards.map((card, idx) => (
              <motion.div
                key={idx}
                variants={variants.staggerItem}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md"
              >
                <div className="relative shrink-0">
                  <div
                    className={`absolute -left-1 -top-1 h-2 w-2 rounded-full ${card.indicator}`}
                  />
                  <span className="text-lg">{card.emoji}</span>
                </div>
                <span className="text-sm text-slate-300 font-medium">
                  {card.text}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* Text Overlay */}
          <motion.div
            variants={variants.fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.6, duration: 0.6, ease }}
            className="space-y-4 max-w-md"
          >
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-white">
              Ne laissez plus vos clients dans l&apos;attente.
            </h2>
            <p className="text-base text-slate-400 leading-relaxed">
              Smartly Assistant Aéroport les avertit en temps réel.
            </p>
            <p className="text-sm text-slate-500">
              Retards, portes, bagages, services — tout est automatisé.
            </p>
          </motion.div>

          {/* Shield Badge */}
          <motion.div
            variants={variants.fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.9, duration: 0.5, ease }}
            className="mt-10"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-medium text-slate-400">
                Espace Partenaire Sécurisé
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          RIGHT SIDE — Login Form (Full on mobile, right column on desktop)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-black px-4 py-8 lg:min-h-screen lg:py-0">
        {/* Decorative Orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-amber-500/8 blur-[128px]" />
          <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-sky-500/8 blur-[128px]" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={variants.staggerContainer}
          className="relative z-10 w-full max-w-md"
        >
          {/* ── Mobile-only tagline header ── */}
          <div className="mb-6 text-center lg:hidden">
            <motion.div
              variants={variants.fadeInUp}
              className="mb-3 inline-flex items-center gap-2"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25">
                <Plane className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Smartly</span>
            </motion.div>
            <motion.p
              variants={variants.fadeInUp}
              className="text-sm text-slate-400"
            >
              L&apos;assistant aéroport intelligent
            </motion.p>
          </div>

          {/* ── Glassmorphism Card ── */}
          <motion.div
            variants={variants.fadeInUp}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl sm:p-10"
          >
            {/* Logo (Desktop) */}
            <div className="mb-8 flex flex-col items-center">
              <motion.div
                variants={variants.staggerItem}
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25"
              >
                <Plane className="h-7 w-7 text-white" />
              </motion.div>
              <motion.h1
                variants={variants.staggerItem}
                className="text-2xl font-bold text-white"
              >
                Connexion Partenaire
              </motion.h1>
              <motion.p
                variants={variants.staggerItem}
                className="mt-1 text-sm text-slate-400"
              >
                Agences, Compagnies, Fournisseurs
              </motion.p>
            </div>

            {/* Error message */}
            <AnimatePresence>
              {state.error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 overflow-hidden rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-400"
                >
                  {state.error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Form */}
            <form action={formAction} className="space-y-5">
              <motion.div variants={variants.staggerItem}>
                <AuthInput
                  name="email"
                  type="email"
                  label="Email"
                  placeholder="vous@agence.com"
                  icon={Mail}
                  autoComplete="email"
                  required
                />
              </motion.div>

              <motion.div variants={variants.staggerItem} className="relative">
                <AuthInput
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  label="Mot de passe"
                  placeholder="••••••••"
                  icon={Lock}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-slate-400 transition-colors hover:text-slate-300"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </motion.div>

              <motion.div variants={variants.staggerItem}>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    className="text-xs text-slate-500 transition-colors hover:text-slate-400"
                    tabIndex={-1}
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              </motion.div>

              <motion.div variants={variants.staggerItem}>
                <AuthButton
                  type="submit"
                  loading={isPending}
                  className="w-full"
                  variant="primary"
                >
                  Se connecter
                </AuthButton>
              </motion.div>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-xs text-slate-600">ou</span>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            {/* Become a partner link */}
            <motion.div
              variants={variants.staggerItem}
              className="text-center"
            >
              <button
                type="button"
                onClick={() => router.push('/contact')}
                className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-amber-400"
              >
                Devenir partenaire
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          </motion.div>

          {/* Back to home link */}
          <motion.div
            variants={variants.fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.6, duration: 0.4, ease }}
            className="mt-6 text-center"
          >
            <button
              type="button"
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour à l&apos;accueil
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
