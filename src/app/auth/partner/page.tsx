'use client'

import { useState, useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Handshake } from 'lucide-react'
import { AuthInput } from '@/components/ui/AuthInput'
import { AuthButton } from '@/components/ui/AuthButton'
import { loginPartner } from '@/app/actions/auth'

export default function PartnerLoginPage() {
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [state, formAction, isPending] = useActionState(loginPartner, {
    success: false,
  })

  // Redirect on success (handled by server-side redirect in signIn)
  useEffect(() => {
    if (state.success) {
      router.push('/')
    }
  }, [state.success, router])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-black px-4">
      {/* Decorative Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal-500/10 blur-[128px]" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-sky-500/10 blur-[128px]" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-teal-500/5 blur-[96px]" />
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-sky-500 shadow-lg shadow-teal-500/25"
            >
              <Handshake className="h-7 w-7 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white">Espace Partenaire</h1>
            <p className="mt-1 text-sm text-slate-400">
              Agences, Compagnies, Fournisseurs
            </p>
          </div>

          {/* Error message */}
          <AnimatePresence>
            {state.error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-400"
              >
                {state.error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Form */}
          <form action={formAction} className="space-y-5">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
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

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="relative"
            >
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
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
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

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
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

          {/* Switch to admin */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="text-center text-sm text-slate-500"
          >
            Vous êtes administrateur ?{' '}
            <button
              type="button"
              onClick={() => router.push('/auth/admin')}
              className="text-teal-400 hover:text-teal-300 transition-colors font-medium"
            >
              Espace Administration
            </button>
          </motion.p>
        </div>

        {/* Back to home link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-6 text-center"
        >
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à l&apos;accueil
          </button>
        </motion.div>
      </motion.div>
    </div>
  )
}
