'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plane, Menu, X, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1]

// ─── Navigation Links ───────────────────────────────────────────────────

interface NavLink {
  label: string
  href: string
}

const navLinks: NavLink[] = [
  { label: 'Accueil', href: '#hero' },
  { label: 'Modules', href: '#features' },
  { label: 'Démo', href: '#demo' },
  { label: 'Témoignages', href: '#testimonials' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: '#contact' },
]

// ─── Navbar Component ──────────────────────────────────────────────────

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)

  // ── Scroll detection: shadow on scroll down, clean on scroll up ──
  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY
      setScrolled(currentY > 20 && currentY > lastScrollY)
      setLastScrollY(currentY)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [lastScrollY])

  // ── Lock body scroll when mobile menu is open ──
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  // ── Smooth scroll handler ──
  const scrollTo = useCallback((href: string) => {
    const id = href.replace('#', '')
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
    setMobileOpen(false)
  }, [])

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          'bg-slate-950/80 backdrop-blur-xl border-b border-white/5',
          scrolled && 'shadow-lg shadow-black/20'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* ─── Logo ────────────────────────────────────────────── */}
            <a
              href="#hero"
              onClick={(e) => {
                e.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="flex items-center gap-2.5 shrink-0 group"
              aria-label="Smartly Assistant — Retour en haut"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center group-hover:bg-amber-500/25 transition-colors">
                <Plane className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-lg font-semibold text-white tracking-tight">
                Smartly Assistant
              </span>
            </a>

            {/* ─── Desktop Navigation Links ────────────────────────── */}
            <nav
              className="hidden lg:flex items-center gap-1"
              aria-label="Navigation principale"
            >
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="relative px-3.5 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-lg transition-colors hover:bg-white/5"
                >
                  {link.label}
                </button>
              ))}
            </nav>

            {/* ─── Right Actions ───────────────────────────────────── */}
            <div className="flex items-center gap-3">
              {/* Desktop CTA */}
              <button
                onClick={() => scrollTo('#contact')}
                className="hidden md:inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30"
              >
                Demander une Démo
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Mobile Hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden w-10 h-10 flex items-center justify-center text-white hover:bg-white/5 rounded-xl transition-colors"
                aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Mobile Menu (AnimatePresence) ──────────────────────── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease }}
              className="overflow-hidden lg:hidden border-t border-white/5"
            >
              <nav
                className="bg-slate-950/95 backdrop-blur-xl px-4 py-6 space-y-1"
                aria-label="Navigation mobile"
              >
                {navLinks.map((link, i) => (
                  <motion.button
                    key={link.href}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    onClick={() => scrollTo(link.href)}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-slate-300 hover:text-white rounded-xl transition-colors hover:bg-white/5"
                  >
                    {link.label}
                  </motion.button>
                ))}

                {/* Mobile CTA */}
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: navLinks.length * 0.05, duration: 0.3 }}
                  className="pt-4"
                >
                  <button
                    onClick={() => scrollTo('#contact')}
                    className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-6 py-3.5 rounded-xl transition-colors shadow-lg shadow-amber-500/20"
                  >
                    Demander une Démo
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ─── Spacer ──────────────────────────────────────────────── */}
      <div className="h-16 md:h-20" />
    </>
  )
}
