'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Shield, X, Cookie, BarChart3, Megaphone } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  hasConsented,
  acceptAll,
  rejectNonEssential,
  savePreferences,
  canUseAnalytics,
  canUseMarketing,
} from '@/lib/consent'

type BannerState = 'hidden' | 'banner' | 'customize' | 'dismissed'

// ─── Animation Variants ────────────────────────────────────────────────

const bannerVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 350, damping: 30 },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    transition: { duration: 0.2, ease: 'easeIn' as const },
  },
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 400, damping: 30 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: 0.15 },
  },
}

// ─── Focus Lock Hook ───────────────────────────────────────────────────

function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!active || !containerRef.current) return

    const container = containerRef.current
    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    const focusable = container.querySelectorAll<HTMLElement>(focusableSelector)
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    // Focus the first element
    first.focus()

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [active])

  return containerRef
}

// ─── Toggle Item Component ─────────────────────────────────────────────

function ToggleItem({
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  icon: React.ElementType
  title: string
  description: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-4 transition-colors">
      <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
        <Icon className="size-5 text-amber-400" />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-white">{title}</p>
          <Switch
            checked={checked}
            onCheckedChange={onCheckedChange}
            disabled={disabled}
            aria-label={`${title}: ${checked ? 'activé' : 'désactivé'}`}
          />
        </div>
        <p className="text-xs leading-relaxed text-white/50">{description}</p>
      </div>
    </div>
  )
}

// ─── Main CookieBanner Component ───────────────────────────────────────

export default function CookieBanner() {
  const [state, setState] = useState<BannerState>('hidden')
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const modalRef = useFocusTrap(state === 'customize')

  // Check consent on mount, show banner with delay if no consent
  useEffect(() => {
    const timer = setTimeout(() => {
      setState(hasConsented() ? 'dismissed' : 'banner')
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  // Escape key handler
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && state === 'customize') {
        setState('banner')
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [state])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (state === 'customize') {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [state])

  const handleAcceptAll = useCallback(() => {
    acceptAll()
    setState('dismissed')
  }, [])

  const handleReject = useCallback(() => {
    rejectNonEssential()
    setState('dismissed')
  }, [])

  const handleOpenCustomize = useCallback(() => {
    setAnalytics(canUseAnalytics())
    setMarketing(canUseMarketing())
    setState('customize')
  }, [])

  const handleCloseCustomize = useCallback(() => {
    setState('banner')
  }, [])

  const handleSavePreferences = useCallback(() => {
    savePreferences({ analytics, marketing })
    setState('dismissed')
  }, [analytics, marketing])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        setState('banner')
      }
    },
    []
  )

  const motionProps = prefersReducedMotion
    ? { initial: false, animate: false, exit: false }
    : {}

  return (
    <>
      {/* ── Banner ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {state === 'banner' && (
          <motion.div
            {...motionProps}
            variants={bannerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 max-w-xl w-[calc(100%-2rem)] shadow-2xl shadow-black/20"
            role="dialog"
            aria-label="Consentement aux cookies"
            aria-modal="false"
          >
            <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-5 backdrop-blur-xl sm:p-6">
              {/* Header */}
              <div className="mb-4 flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                  <Shield className="size-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Nous respectons votre vie privée
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-white/60">
                    Nous utilisons des cookies pour améliorer votre expérience,
                    analyser le trafic et personnaliser le contenu. Vous pouvez
                    accepter ou refuser les cookies non essentiels.
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenCustomize}
                  className="border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <Cookie className="size-3.5" />
                  Personnaliser
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReject}
                  className="text-white/50 hover:bg-white/5 hover:text-white/70"
                >
                  Refuser le non-essentiel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAcceptAll}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 hover:from-amber-600 hover:to-orange-600"
                >
                  Accepter tout
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Customization Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {state === 'customize' && (
          <>
            {/* Overlay */}
            <motion.div
              {...motionProps}
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={handleOverlayClick}
              aria-hidden="true"
            />

            {/* Modal */}
            <motion.div
              {...motionProps}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={handleOverlayClick}
            >
              <div
                ref={modalRef}
                role="dialog"
                aria-label="Préférences de cookies"
                aria-modal="true"
                className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl shadow-black/30 backdrop-blur-xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-white/5 px-5 py-4 sm:px-6">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15">
                      <Cookie className="size-4 text-amber-400" />
                    </div>
                    <h2 className="text-base font-semibold text-white">
                      Préférences de cookies
                    </h2>
                  </div>
                  <button
                    onClick={handleCloseCustomize}
                    className="flex size-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
                    aria-label="Fermer"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="space-y-3 px-5 py-5 sm:px-6 sm:py-6">
                  {/* Analytics Toggle */}
                  <ToggleItem
                    icon={BarChart3}
                    title="Cookies analytiques"
                    description="Nous aide à comprendre comment les visiteurs interagissent avec notre site en collectant des informations de manière anonyme."
                    checked={analytics}
                    onCheckedChange={setAnalytics}
                  />

                  {/* Marketing Toggle */}
                  <ToggleItem
                    icon={Megaphone}
                    title="Cookies marketing"
                    description="Utilisés pour suivre les visiteurs sur les sites web afin d'afficher des publicités pertinentes."
                    checked={marketing}
                    onCheckedChange={setMarketing}
                  />

                  {/* Essential note */}
                  <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-3.5">
                    <Shield className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                    <p className="text-xs leading-relaxed text-emerald-300/70">
                      Les cookies essentiels sont toujours activés car ils sont
                      nécessaires au fonctionnement du site.
                    </p>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex flex-col-reverse gap-2 border-t border-white/5 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAcceptAll}
                    className="border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                  >
                    Accepter tout
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSavePreferences}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 hover:from-amber-600 hover:to-orange-600"
                  >
                    Enregistrer mes choix
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
