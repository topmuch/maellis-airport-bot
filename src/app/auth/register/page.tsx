'use client'

import { useState, useEffect, useActionState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Eye, EyeOff, Plane, Shield, AlertCircle, CheckCircle2 } from 'lucide-react'
import { AuthInput } from '@/components/ui/AuthInput'
import { AuthButton } from '@/components/ui/AuthButton'
import { registerUser, validateInvitationToken } from '@/app/actions/auth'

interface TokenValidation {
  valid: boolean
  email?: string
  role?: string
  airportCode?: string
  error?: string
}

function RegisterContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''

  const initialValidation: TokenValidation = token
    ? { valid: false } // Will be validated in effect
    : { valid: false, error: "Token d'invitation manquant" }
  const [tokenValidation, setTokenValidation] = useState<TokenValidation>(initialValidation)
  const [isValidating, setIsValidating] = useState(!!token)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [state, formAction, isPending] = useActionState(registerUser, {
    success: false,
  })

  // Validate token on mount (only when token exists)
  useEffect(() => {
    if (!token) return

    async function validate() {
      const result = await validateInvitationToken(token)
      setTokenValidation(result)
      setIsValidating(false)
    }
    validate()
  }, [token])

  // Redirect on success
  useEffect(() => {
    if (state.success) {
      router.push('/auth/login?registered=true')
    }
  }, [state.success, router])

  // Loading state while validating token
  if (isValidating) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-black px-4">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-orange-500/10 blur-[128px]" />
          <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-teal-500/10 blur-[128px]" />
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 flex flex-col items-center gap-4"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Vérification de l&apos;invitation...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-black px-4">
      {/* Decorative Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-orange-500/10 blur-[128px]" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-teal-500/10 blur-[128px]" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-orange-500/5 blur-[96px]" />
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
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25"
            >
              <Plane className="h-7 w-7 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white">Créer un compte</h1>
            <p className="mt-1 text-sm text-slate-400">
              Complétez votre inscription
            </p>
          </div>

          {/* Invalid Token State */}
          {!tokenValidation?.valid ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
                <AlertCircle className="h-7 w-7 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Invitation invalide
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  {tokenValidation?.error || 'Le lien d\'invitation est invalide ou a expiré.'}
                </p>
              </div>
              <AuthButton
                variant="outline"
                onClick={() => router.push('/auth/login')}
                className="mt-4"
              >
                Retour à la connexion
              </AuthButton>
            </motion.div>
          ) : (
            <>
              {/* Token info banner */}
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <div className="text-left">
                  <p className="text-sm font-medium text-emerald-400">
                    Invitation confirmée
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-400/70">
                    Créez votre compte pour{' '}
                    <span className="font-medium">{tokenValidation.email}</span>
                    {tokenValidation.role && (
                      <span className="ml-1">
                        ({tokenValidation.role.replace('_', ' ')})
                      </span>
                    )}
                    {tokenValidation.airportCode && (
                      <span className="ml-1">
                        — Aéroport {tokenValidation.airportCode}
                      </span>
                    )}
                  </p>
                </div>
              </motion.div>

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

              {/* Register Form */}
              <form action={formAction} className="space-y-5">
                <input type="hidden" name="token" value={token} />

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                >
                  <AuthInput
                    name="name"
                    type="text"
                    label="Nom complet"
                    placeholder="Jean Dupont"
                    autoComplete="name"
                    required
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                  className="relative"
                >
                  <AuthInput
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    label="Mot de passe"
                    placeholder="Minimum 8 caractères"
                    icon={Lock}
                    autoComplete="new-password"
                    required
                    helperText="Min. 8 caractères, 1 majuscule, 1 chiffre"
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
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="relative"
                >
                  <AuthInput
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    label="Confirmer le mot de passe"
                    placeholder="Répétez le mot de passe"
                    icon={Shield}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-[38px] text-slate-400 transition-colors hover:text-slate-300"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
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
                  <AuthButton
                    type="submit"
                    loading={isPending}
                    className="w-full"
                  >
                    Créer mon compte
                  </AuthButton>
                </motion.div>
              </form>
            </>
          )}
        </div>

        {/* Back to login link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-6 text-center"
        >
          <button
            onClick={() => router.push('/auth/login')}
            className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-300"
          >
            <Shield className="h-3.5 w-3.5" />
            Déjà un compte ? Se connecter
          </button>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-black">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  )
}
