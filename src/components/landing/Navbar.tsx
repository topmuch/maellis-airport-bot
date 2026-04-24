'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'
import {
  Menu,
  X,
  Sparkles,
  Plane,
  MessageSquareText,
  CreditCard,
  Users,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  Handshake,
} from 'lucide-react'
import Image from 'next/image'

// ─── Nav Links ────────────────────────────────────────────────────────────

interface NavLink {
  label: string
  href: string
  icon: React.ElementType
}

const navLinks: NavLink[] = [
  { label: 'Fonctionnalités', href: '#features', icon: Sparkles },
  { label: 'Tarifs', href: '#pricing', icon: CreditCard },
  { label: 'Témoignages', href: '#testimonials', icon: Users },
  { label: 'FAQ', href: '#faq', icon: HelpCircle },
]

// ─── Navbar Component ─────────────────────────────────────────────────────

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // ── Scroll detection for background blur ──
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ── Active section tracking via IntersectionObserver ──
  useEffect(() => {
    const sectionIds = navLinks.map((l) => l.href.replace('#', ''))
    const observers: IntersectionObserver[] = []

    sectionIds.forEach((id) => {
      const el = document.getElementById(id)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id)
          }
        },
        { threshold: 0.3, rootMargin: '-80px 0px -50% 0px' }
      )
      obs.observe(el)
      observers.push(obs)
    })

    return () => observers.forEach((o) => o.disconnect())
  }, [])

  // ── Smooth scroll handler ──
  const scrollTo = useCallback(
    (href: string) => {
      const id = href.replace('#', '')
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      setMobileOpen(false)
    },
    []
  )

  // ── Keyboard navigation ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, href: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        scrollTo(href)
      }
    },
    [scrollTo]
  )

  return (
    <>
      {/* ─── Desktop / Mobile Navbar ──────────────────────────────────────── */}
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-xl shadow-sm shadow-black/[0.03] dark:shadow-black/20 border-b border-slate-200/50 dark:border-slate-700/30'
            : 'bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-18">
            {/* ─── Logo ──────────────────────────────────────────────────── */}
            <a
              href="#hero"
              onClick={(e) => {
                e.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="flex items-center gap-2.5 shrink-0 group"
              aria-label="Smartly Assistant — Retour en haut"
            >
              <div className="relative w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 shadow-md shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow">
                <Image
                  src="/smartly-logo.png"
                  alt=""
                  width={48}
                  height={48}
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-lg font-bold leading-tight text-foreground">
                  Smartly
                </span>
                <span className="text-xs font-normal leading-tight text-muted-foreground -mt-0.5">
                  Assistant
                </span>
              </div>
            </a>

            {/* ─── Desktop Navigation Links ──────────────────────────────── */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Navigation principale">
              {navLinks.map((link) => {
                const isActive =
                  activeSection === link.href.replace('#', '')
                return (
                  <button
                    key={link.href}
                    onClick={() => scrollTo(link.href)}
                    onKeyDown={(e) => handleKeyDown(e, link.href)}
                    className={cn(
                      'relative px-3.5 py-2 text-sm font-medium rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500',
                      isActive
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-muted-foreground hover:text-foreground hover:bg-slate-100/80 dark:hover:bg-slate-800/50'
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <link.icon className="w-3.5 h-3.5" />
                      {link.label}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute bottom-0 left-2 right-2 h-0.5 bg-orange-500 rounded-full"
                        transition={{
                          type: 'spring',
                          stiffness: 350,
                          damping: 30,
                        }}
                      />
                    )}
                  </button>
                )
              })}
            </nav>

            {/* ─── Right Actions ─────────────────────────────────────────── */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Desktop CTA — Login Buttons */}
              <div className="hidden md:flex items-center gap-2 ml-1">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <a href="/auth/partner" className="flex items-center gap-1.5">
                    <Handshake className="w-3.5 h-3.5" />
                    Partenaire
                  </a>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 py-2 text-sm font-semibold shadow-sm shadow-orange-500/20 hover:shadow-orange-500/40 transition-all"
                >
                  <a href="/auth/admin" className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Connexion Admin
                    <ChevronRight className="w-3 h-3" />
                  </a>
                </Button>
              </div>

              {/* Mobile Hamburger */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    aria-label="Ouvrir le menu"
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[300px] sm:w-[340px] p-0"
                >
                  <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
                  <div className="flex flex-col h-full">
                    {/* Mobile header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600">
                          <Image
                            src="/smartly-logo.png"
                            alt=""
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-base font-bold leading-tight text-foreground">
                            Smartly
                          </span>
                          <span className="text-[11px] font-normal leading-tight text-muted-foreground">
                            Assistant
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setMobileOpen(false)}
                        aria-label="Fermer le menu"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Mobile nav links */}
                    <nav className="flex-1 overflow-y-auto py-4 px-3" aria-label="Navigation mobile">
                      <div className="space-y-1">
                        {navLinks.map((link) => {
                          const isActive =
                            activeSection === link.href.replace('#', '')
                          return (
                            <button
                              key={link.href}
                              onClick={() => scrollTo(link.href)}
                              className={cn(
                                'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors',
                                isActive
                                  ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400'
                                  : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-foreground'
                              )}
                            >
                              <div
                                className={cn(
                                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                                  isActive
                                    ? 'bg-orange-100 dark:bg-orange-500/20'
                                    : 'bg-slate-100 dark:bg-slate-800'
                                )}
                              >
                                <link.icon className="w-4 h-4" />
                              </div>
                              {link.label}
                            </button>
                          )
                        })}
                      </div>
                    </nav>

                    {/* Mobile CTA footer — Login Buttons */}
                    <div className="p-4 border-t border-border space-y-2">
                      <Button
                        asChild
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-3 text-sm font-semibold shadow-sm"
                      >
                        <a href="/auth/admin" className="flex items-center justify-center gap-2">
                          <ShieldCheck className="w-4 h-4" />
                          Connexion Admin
                        </a>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        className="w-full rounded-xl py-3 text-sm font-medium"
                      >
                        <a href="/auth/partner" className="flex items-center justify-center gap-2">
                          <Handshake className="w-4 h-4" />
                          Espace Partenaire
                        </a>
                      </Button>
                      <p className="text-[11px] text-center text-muted-foreground">
                        Déjà adopté par 3 aéroports en Afrique de l&apos;Ouest
                      </p>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Spacer so content isn't hidden behind fixed navbar ─────────── */}
      <div className="h-16 md:h-18" />
    </>
  )
}
