'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import {
  ChevronRight,
  UserCheck,
  Shield,
  CreditCard,
  FileText,
  Clock,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  Scale,
  Globe,
  Server,
  Users,
  Briefcase,
  MessageSquare,
  Lock,
} from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

// ─── TOC Section Configuration ─────────────────────────────────────────────

const tocSections: { id: string; label: string }[] = [
  { id: 'objet', label: 'Objet' },
  { id: 'acceptation', label: 'Acceptation des CGU' },
  { id: 'inscription', label: 'Inscription et comptes' },
  { id: 'services', label: 'Services propos\u00e9s' },
  { id: 'obligations-utilisateur', label: 'Obligations de l\'utilisateur' },
  { id: 'tarification', label: 'Tarification et paiement' },
  { id: 'donnees', label: 'Protection des donn\u00e9es' },
  { id: 'propriete', label: 'Propri\u00e9t\u00e9 intellectuelle' },
  { id: 'responsabilite', label: 'Responsabilit\u00e9' },
  { id: 'resiliation', label: 'R\u00e9siliation' },
  { id: 'modifications', label: 'Modifications des CGU' },
  { id: 'litige', label: 'Litiges' },
  { id: 'contact', label: 'Contact' },
]

// ─── Animated Section Wrapper ──────────────────────────────────────────────

function AnimatedSection({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  const prefersReduced = useReducedMotion()

  if (prefersReduced) {
    return <div ref={ref} className={className}>{children}</div>
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Table of Contents ─────────────────────────────────────────────────────

function TableOfContents({ activeSection }: { activeSection: string }) {
  return (
    <nav aria-label="Table des mati\u00e8res">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Sommaire
      </p>
      <ul className="space-y-1">
        {tocSections.map((section) => {
          const isActive = activeSection === section.id
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-400 font-medium'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <ChevronRight
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                    isActive ? 'text-amber-500 rotate-90' : 'text-slate-600'
                  }`}
                />
                <span>{section.label}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// ─── Info Card Component ───────────────────────────────────────────────────

type AccentColor = 'amber' | 'emerald' | 'sky' | 'rose'

const accentStyles: Record<AccentColor, { iconBg: string; iconText: string; border: string }> = {
  amber: { iconBg: 'bg-amber-500/10', iconText: 'text-amber-400', border: 'border-amber-500/20' },
  emerald: { iconBg: 'bg-emerald-500/10', iconText: 'text-emerald-400', border: 'border-emerald-500/20' },
  sky: { iconBg: 'bg-sky-500/10', iconText: 'text-sky-400', border: 'border-sky-500/20' },
  rose: { iconBg: 'bg-rose-500/10', iconText: 'text-rose-400', border: 'border-rose-500/20' },
}

function InfoCard({
  icon: Icon,
  title,
  children,
  accent = 'amber',
}: {
  icon: React.ElementType
  title: string
  children: ReactNode
  accent?: AccentColor
}) {
  const styles = accentStyles[accent]
  return (
    <div
      className={`rounded-xl border ${styles.border} bg-slate-900/40 p-5 backdrop-blur-sm transition-colors hover:bg-slate-900/60`}
    >
      <div className="mb-3 flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.iconBg}`}>
          <Icon className={`h-4.5 w-4.5 ${styles.iconText}`} />
        </div>
        <h4 className="text-sm font-semibold text-white">{title}</h4>
      </div>
      <div className="text-sm leading-relaxed text-slate-400">{children}</div>
    </div>
  )
}

// ─── Section Wrapper ───────────────────────────────────────────────────────

function ArticleSection({
  id,
  number,
  title,
  children,
}: {
  id: string
  number: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <AnimatedSection>
        <div className="mb-1 flex items-center gap-3">
          <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400">Art. {number}</Badge>
          <h2 className="text-xl font-bold text-white sm:text-2xl">{title}</h2>
        </div>
        <div className="mt-6">{children}</div>
      </AnimatedSection>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── Main TermsContent Component ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

export function TermsContent() {
  const [activeSection, setActiveSection] = useState<string>('objet')

  useEffect(() => {
    const sectionIds = tocSections.map((s) => s.id)
    const observers: IntersectionObserver[] = []

    sectionIds.forEach((id) => {
      const el = document.getElementById(id)
      if (!el) return

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(id)
            }
          })
        },
        { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
      )

      observer.observe(el)
      observers.push(observer)
    })

    return () => {
      observers.forEach((obs) => obs.disconnect())
    }
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a[href^="#"]')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href) return

      const el = document.querySelector(href)
      if (el) {
        e.preventDefault()
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return (
    <section className="relative min-h-screen overflow-hidden bg-slate-950">
      {/* Decorative top gradient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-sky-500/6 to-transparent" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        {/* Back to home */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour &agrave; l&apos;accueil
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 text-center"
        >
          <Badge className="mb-5 border-sky-500/30 bg-sky-500/10 text-sky-400">
            Document Contractuel
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Conditions G&eacute;n&eacute;rales{' '}
            <span className="bg-gradient-to-r from-sky-400 via-cyan-400 to-sky-500 bg-clip-text text-transparent">
              d&apos;Utilisation
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-400 sm:text-lg">
            R&egrave;gles, obligations et droits r&eacute;gissant l&apos;utilisation de la
            plateforme Smartly Assistant et de ses services associ&eacute;s.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Version 1.0 &mdash; Derni&egrave;re mise &agrave; jour : 26 avril 2026
          </p>
        </motion.div>

        {/* Mobile inline TOC */}
        <div className="mb-12 lg:hidden">
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
            <TableOfContents activeSection={activeSection} />
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-12">
          {/* Desktop sticky sidebar TOC */}
          <aside className="hidden lg:block lg:w-64 shrink-0">
            <div className="sticky top-28">
              <div className="rounded-xl border border-white/10 bg-slate-900/40 p-5">
                <TableOfContents activeSection={activeSection} />
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1 space-y-16">
            {/* Art. 1 — Objet */}
            <ArticleSection id="objet" number="1" title="Objet">
              <p className="mb-4 text-sm leading-relaxed text-slate-400">
                Les pr&eacute;sentes Conditions G&eacute;n&eacute;rales d&apos;Utilisation (ci-apr&egrave;s
                d&eacute;nomm&eacute;es &laquo; CGU &raquo;) ont pour objet de d&eacute;finir les conditions
                et modalit&eacute;s d&apos;utilisation de la plateforme Smartly Assistant, ses services
                et fonctionnalit&eacute;s accessibles via le site web smartly.aero, l&apos;application
                mobile et l&apos;interface WhatsApp Business.
              </p>
              <p className="mb-4 text-sm leading-relaxed text-slate-400">
                Smartly Assistant est une plateforme d&apos;intelligence artificielle conversationnelle
                d&eacute;di&eacute;e au secteur a&eacute;roportuaire en Afrique. Elle propose des services
                d&apos;assistance aux voyageurs, de suivi de vols, de gestion de bagages, de marketplace
                a&eacute;roportuaire, de conciergerie hybride et de dashboard d&apos;administration.
              </p>
              <p className="text-sm leading-relaxed text-slate-400">
                Toute utilisation de la plateforme implique l&apos;acceptation pleine et enti&egrave;re
                des pr&eacute;sentes CGU. Si vous n&apos;acceptez pas ces conditions, vous devez cesser
                imm&eacute;diatement toute utilisation de la plateforme.
              </p>
            </ArticleSection>

            {/* Art. 2 — Acceptation */}
            <ArticleSection id="acceptation" number="2" title="Acceptation des CGU">
              <p className="mb-4 text-sm leading-relaxed text-slate-400">
                L&apos;utilisation de la plateforme Smartly Assistant est subordonn&eacute;e &agrave;
                l&apos;acceptation pr&eacute;alable des pr&eacute;sentes CGU. L&apos;utilisateur reconna&icirc;t
                avoir pris connaissance de l&apos;int&eacute;gralit&eacute; des conditions et les accepter
                sans r&eacute;serve.
              </p>
              <div className="space-y-4 mb-6">
                <InfoCard icon={CheckCircle2} title="Clic de validation" accent="emerald">
                  <p>
                    L&apos;acceptation des CGU se manifeste par le clic sur le bouton &laquo; J&apos;accepte
                    les conditions &raquo; lors de la cr&eacute;ation du compte ou lors de la premi&egrave;re
                    connexion au tableau de bord. Ce clic vaut signature &eacute;lectronique et a la m&ecirc;me
                    valeur juridique qu&apos;une signature manuscrite.
                  </p>
                </InfoCard>
                <InfoCard icon={Clock} title="Versions successives" accent="sky">
                  <p>
                    Les CGU peuvent &ecirc;tre modifi&eacute;es &agrave; tout moment par Smartly Assistant.
                    L&apos;utilisateur sera notifi&eacute; de toute modification par email et/ou par notification
                    dans le tableau de bord. La poursuite de l&apos;utilisation de la plateforme apr&egrave;s
                    modification vaut acceptation des nouvelles conditions.
                  </p>
                </InfoCard>
              </div>
            </ArticleSection>

            {/* Art. 3 — Inscription */}
            <ArticleSection id="inscription" number="3" title="Inscription et comptes">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                L&apos;acc&egrave;s &agrave; certaines fonctionnalit&eacute;s de la plateforme n&eacute;cessite
                la cr&eacute;ation d&apos;un compte. L&apos;inscription est ouverte aux personnes majeures
                capacit&eacute;es, aux repr&eacute;sentants l&eacute;gaux de personnes morales et aux
                administrations a&eacute;roportuaires.
              </p>

              <div className="space-y-4 mb-6">
                <InfoCard icon={UserCheck} title="Informations d&apos;inscription" accent="amber">
                  <p>
                    L&apos;utilisateur s&apos;engage &agrave; fournir des informations exactes, compl&egrave;tes
                    et &agrave; jour lors de son inscription. Toute information erron&eacute;e peut entra&icirc;ner
                    la suspension ou la suppression du compte. L&apos;utilisateur est seul responsable de la
                    confidentialit&eacute; de ses identifiants de connexion.
                  </p>
                </InfoCard>

                <InfoCard icon={Shield} title="S&eacute;curit&eacute; du compte" accent="emerald">
                  <p>
                    L&apos;utilisateur s&apos;engage &agrave; ne pas communiquer ses identifiants de connexion
                    &agrave; des tiers, &agrave; utiliser un mot de passe robuste et &agrave; activer
                    l&apos;authentification multifacteur (MFA) lorsque cette option est disponible. En cas
                    de compromission suspect&eacute;e, l&apos;utilisateur doit imm&eacute;diatement notifier
                    Smartly Assistant &agrave; l&apos;adresse contact@smartly.aero.
                  </p>
                </InfoCard>

                <InfoCard icon={Users} title="R&ocirc;les et permissions" accent="sky">
                  <p>
                    La plateforme propose diff&eacute;rents r&ocirc;les (SUPERADMIN, AIRPORT_ADMIN, AGENT, VIEWER)
                    avec des niveaux d&apos;acc&egrave;s sp&eacute;cifiques. L&apos;attribution des r&ocirc;les
                    est effectu&eacute;e par l&apos;administrateur principal de chaque a&eacute;roport partenaire.
                    Toute tentative d&apos;acc&egrave;s non autoris&eacute; &agrave; des fonctionnalit&eacute;s
                    hors de son p&eacute;rim&egrave;tre constitue une violation des CGU.
                  </p>
                </InfoCard>
              </div>
            </ArticleSection>

            {/* Art. 4 — Services */}
            <ArticleSection id="services" number="4" title="Services propos\u00e9s">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                Smartly Assistant propose une gamme de services con&ccedil;us pour am&eacute;liorer
                l&apos;exp&eacute;rience a&eacute;roportuaire. Les services peuvent &eacute;voluer et
                de nouvelles fonctionnalit&eacute;s peuvent &ecirc;tre ajout&eacute;es sans notification
                pr&eacute;alable.
              </p>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
                <div className="rounded-lg border border-white/5 bg-slate-900/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-amber-400" />
                    <p className="text-sm font-semibold text-white">IA Conversationnelle</p>
                  </div>
                  <p className="text-xs text-slate-400">Assistant intelligent via WhatsApp en 8 langues, disponible 24h/24.</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-slate-900/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-4 w-4 text-sky-400" />
                    <p className="text-sm font-semibold text-white">Suivi de Vols</p>
                  </div>
                  <p className="text-xs text-slate-400">Informations en temps r&eacute;el sur les d&eacute;parts, arriv&eacute;es et retards.</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-slate-900/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-4 w-4 text-emerald-400" />
                    <p className="text-sm font-semibold text-white">Marketplace</p>
                  </div>
                  <p className="text-xs text-slate-400">R&eacute;servation d&apos;h&ocirc;tels, salons VIP, pharmacies et services a&eacute;roport.</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-slate-900/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Server className="h-4 w-4 text-amber-400" />
                    <p className="text-sm font-semibold text-white">Dashboard Analytics</p>
                  </div>
                  <p className="text-xs text-slate-400">Tableau de bord en temps r&eacute;el avec statistiques et indicateurs cl&eacute;s.</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-slate-900/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                    <p className="text-sm font-semibold text-white">Gestion de Crise</p>
                  </div>
                  <p className="text-xs text-slate-400">Syst&egrave;me d&apos;alerte et de diffusion d&apos;informations d&apos;urgence.</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-slate-900/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-sky-400" />
                    <p className="text-sm font-semibold text-white">Facturation</p>
                  </div>
                  <p className="text-xs text-slate-400">Gestion automatis&eacute;e de la facturation conforme aux normes OHADA.</p>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-400 mb-1">Disponibilit&eacute; des services</p>
                    <p className="text-sm leading-relaxed text-slate-400">
                      Smartly Assistant s&apos;efforce de maintenir la disponibilit&eacute; continue de ses
                      services. Toutefois, des interruptions temporaires peuvent survenir pour la maintenance,
                      les mises &agrave; jour ou des raisons techniques. L&apos;utilisateur sera inform&eacute;
                      des interruptions planifi&eacute;es dans la mesure du possible.
                    </p>
                  </div>
                </div>
              </div>
            </ArticleSection>

            {/* Art. 5 — Obligations de l'utilisateur */}
            <ArticleSection id="obligations-utilisateur" number="5" title="Obligations de l&apos;utilisateur">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                L&apos;utilisateur s&apos;engage &agrave; respecter les obligations suivantes lors de
                l&apos;utilisation de la plateforme Smartly Assistant.
              </p>

              <div className="space-y-4 mb-6">
                <InfoCard icon={Scale} title="Respect des lois" accent="amber">
                  <p>
                    L&apos;utilisateur s&apos;engage &agrave; utiliser la plateforme conform&eacute;ment
                    aux lois et r&egrave;glementations en vigueur, notamment la loi s&eacute;n&eacute;galaise,
                    le RGPD europ&eacute;en et les r&egrave;glementations a&eacute;ronautiques applicables.
                  </p>
                </InfoCard>

                <InfoCard icon={Ban} title="Utilisations interdites" accent="rose">
                  <p className="mb-2">
                    Sont strictement interdits les comportements suivants :
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-400">
                    <li>Toute utilisation frauduleuse ou abusive de la plateforme</li>
                    <li>La tentative d&apos;acc&egrave;s non autoris&eacute; aux syst&egrave;mes d&apos;information</li>
                    <li>La transmission de contenus illicites, diffamatoires ou contraires &agrave; l&apos;ordre public</li>
                    <li>La perturbation du bon fonctionnement de la plateforme (spam, DDoS, etc.)</li>
                    <li>L&apos;utilisation de la plateforme &agrave; des fins de concurrence d&eacute;loyale</li>
                    <li>La reproduction ou la revente non autoris&eacute;e des services propos&eacute;s</li>
                  </ul>
                </InfoCard>

                <InfoCard icon={Shield} title="Signalement" accent="emerald">
                  <p>
                    L&apos;utilisateur s&apos;engage &agrave; signaler imm&eacute;diatement &agrave;
                    Smartly Assistant toute utilisation abusive ou tout comportement suspect dont il
                    aurait connaissance, en &eacute;crivant &agrave; contact@smartly.aero.
                  </p>
                </InfoCard>
              </div>
            </ArticleSection>

            {/* Art. 6 — Tarification */}
            <ArticleSection id="tarification" number="6" title="Tarification et paiement">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                Les conditions tarifaires applicables d&eacute;pendent du plan souscrit par
                l&apos;a&eacute;roport partenaire. Les prix sont exprim&eacute;s en euros ou en
                francs CFA (XOF) et sont ceux en vigueur au moment de la souscription.
              </p>

              <div className="space-y-4 mb-6">
                <InfoCard icon={CreditCard} title="Plans tarifaires" accent="amber">
                  <p className="mb-2">
                    Smartly Assistant propose trois plans : Starter, Pro et Enterprise. Chaque plan
                    inclut un ensemble d&eacute;fini de fonctionnalit&eacute;s, un volume d&apos;utilisation
                    et un niveau de support. Les d&eacute;tails des plans sont disponibles sur la
                    page Tarification du site ou sur demande.
                  </p>
                </InfoCard>

                <InfoCard icon={FileText} title="Facturation OHADA" accent="sky">
                  <p>
                    Les factures sont &eacute;mises conform&eacute;ment au SYSCOHADA (Syst&egrave;me
                    Comptable Ouest Africain). Les paiements sont effectu&eacute;s via CinetPay ou
                    par virement bancaire. Les d&eacute;lais de paiement sont de 30 jours &agrave;
                    compter de la date d&apos;&eacute;mission de la facture, sauf accord contraire.
                  </p>
                </InfoCard>

                <InfoCard icon={AlertTriangle} title="Retard de paiement" accent="rose">
                  <p>
                    En cas de retard de paiement, Smartly Assistant se r&eacute;serve le droit de
                    suspendre l&apos;acc&egrave;s aux services apr&egrave;s un pr&eacute;avis de 15 jours.
                    Des p&eacute;nalit&eacute;s de retard au taux de 10% par an seront appliqu&eacute;es
                    conform&eacute;ment &agrave; l&apos;acte uniforme portant organisation des proc&eacute;dures
                    simplifi&eacute;es de recouvrement et des voies d&apos;ex&eacute;cution (UPSRVE).
                  </p>
                </InfoCard>
              </div>
            </ArticleSection>

            {/* Art. 7 — Données personnelles */}
            <ArticleSection id="donnees" number="7" title="Protection des donn\u00e9es">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                Smartly Assistant s&apos;engage &agrave; prot&eacute;ger les donn&eacute;es personnelles
                de ses utilisateurs conform&eacute;ment au RGPD et &agrave; la loi s&eacute;n&eacute;galaise
                n&deg;2008-12. Pour en savoir plus sur nos pratiques en mati&egrave;re de protection des
                donn&eacute;es, veuillez consulter notre{' '}
                <Link
                  href="/privacy"
                  className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
                >
                  Politique de Confidentialit&eacute;
                </Link>.
              </p>

              <div className="space-y-4">
                <InfoCard icon={Shield} title="Collecte et traitement" accent="amber">
                  <p>
                    Les donn&eacute;es personnelles sont collect&eacute;es dans un but d&eacute;fini et
                    l&eacute;gitime. Le traitement repose sur les bases l&eacute;gales pr&eacute;vues par
                    le RGPD (consentement, ex&eacute;cution contractuelle, int&eacute;r&ecirc;t l&eacute;gitime).
                    Seules les donn&eacute;es n&eacute;cessaires au fonctionnement des services sont collect&eacute;es.
                  </p>
                </InfoCard>

                <InfoCard icon={Lock} title="S\u00e9curit\u00e9" accent="emerald">
                  <p>
                    Toutes les donn&eacute;es sont chiffr&eacute;es en transit (TLS 1.3) et au repos (AES-256).
                    L&apos;acc&egrave;s aux donn&eacute;es est strictement limit&eacute; et trac&eacute;.
                    Les donn&eacute;es de paiement sont trait&eacute;es exclusivement par CinetPay, agr&eacute;&eacute;
                    par la BCEAO, sans stockage sur nos serveurs.
                  </p>
                </InfoCard>
              </div>
            </ArticleSection>

            {/* Art. 8 — Propriété intellectuelle */}
            <ArticleSection id="propriete" number="8" title="Propri\u00e9t\u00e9 intellectuelle">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                L&apos;ensemble des &eacute;l&eacute;ments de la plateforme (logiciels, interfaces, marques,
                contenus, bases de donn&eacute;es) demeure la propri&eacute;t&eacute; exclusive de Smartly
                Assistant ou de ses partenaires. L&apos;utilisation de la plateforme ne conf&egrave;re
                aucun droit de propri&eacute;t&eacute; intellectuelle &agrave; l&apos;utilisateur.
              </p>

              <div className="space-y-4">
                <InfoCard icon={Shield} title="Marques et logos" accent="amber">
                  <p>
                    &laquo; Smartly Assistant &raquo;, le logo Smartly et tous les &eacute;l&eacute;ments
                    visuels associ&eacute;s sont des marques d&eacute;pos&eacute;es. Toute reproduction,
                    repr&eacute;sentation ou utilisation non autoris&eacute;e est strictement interdite.
                  </p>
                </InfoCard>

                <InfoCard icon={FileText} title="Code source" accent="sky">
                  <p>
                    Le code source de la plateforme est confidentiel et constitue un secret d&apos;affaires.
                    Toute d&eacute;compilation, ing&eacute;nierie inverse ou tentative d&apos;extraction du
                    code source est interdite et pourra faire l&apos;objet de poursuites judiciaires.
                  </p>
                </InfoCard>
              </div>
            </ArticleSection>

            {/* Art. 9 — Responsabilité */}
            <ArticleSection id="responsabilite" number="9" title="Responsabilit\u00e9">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                La responsabilit&eacute; de Smartly Assistant est limit&eacute;e aux obligations de moyens
                d&eacute;crites dans les pr&eacute;sentes CGU. La plateforme ne saurait &ecirc;tre tenue
                pour responsable des dommages indirects.
              </p>

              <div className="space-y-4">
                <InfoCard icon={AlertTriangle} title="Limitation de responsabilit\u00e9" accent="rose">
                  <p>
                    Smartly Assistant ne pourra &ecirc;tre tenu responsable des interruptions de service,
                    des erreurs dans les donn&eacute;es de vols (issues de sources tierces), des pertes
                    de donn&eacute;es caus&eacute;es par un cas de force majeure, ou de tout dommage
                    indirect r&eacute;sultant de l&apos;utilisation de la plateforme. La responsabilit&eacute;
                    totale de Smartly Assistant est plafonn&eacute;e au montant des redevances vers&eacute;es
                    par l&apos;utilisateur au cours des 12 derniers mois.
                  </p>
                </InfoCard>

                <InfoCard icon={Globe} title="Force majeure" accent="sky">
                  <p>
                    Smartly Assistant ne sera pas responsable des d&eacute;faillances li&eacute;es &agrave;
                    un cas de force majeure, incluant mais non limit&eacute; aux catastrophes naturelles,
                    pannes de r&eacute;seau, actes de cyberattaques, d&eacute;cisions gouvernementales ou
                    gr&egrave;ves g&eacute;n&eacute;rales.
                  </p>
                </InfoCard>
              </div>
            </ArticleSection>

            {/* Art. 10 — Résiliation */}
            <ArticleSection id="resiliation" number="10" title="R\u00e9siliation">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                La r&eacute;siliation du contrat peut intervenir dans les conditions d&eacute;crites
                ci-dessous.
              </p>

              <div className="space-y-4">
                <InfoCard icon={Clock} title="R\u00e9siliation par l&apos;utilisateur" accent="amber">
                  <p>
                    L&apos;utilisateur peut r&eacute;silier son abonnement &agrave; tout moment en
                    adressant une demande &eacute;crite &agrave; contact@smartly.aero avec un pr&eacute;avis
                    de 30 jours. Les sommes vers&eacute;es ne sont pas remboursables au prorata. L&apos;utilisateur
                    dispose d&apos;un d&eacute;lai de 30 jours apr&egrave;s la r&eacute;siliation pour
                    t&eacute;l&eacute;charger ses donn&eacute;es.
                  </p>
                </InfoCard>

                <InfoCard icon={Ban} title="R\u00e9siliation par Smartly Assistant" accent="rose">
                  <p>
                    Smartly Assistant se r&eacute;serve le droit de r&eacute;silier imm&eacute;diatement
                    et sans pr&eacute;avis en cas de violation grave des CGU, de non-paiement, d&apos;utilisation
                    frauduleuse ou de toute autre faute lourde de l&apos;utilisateur. Un pr&eacute;avis de
                    30 jours sera notifi&eacute; pour tout autre motif de r&eacute;siliation.
                  </p>
                </InfoCard>

                <InfoCard icon={CheckCircle2} title="Effacement des donn\u00e9es" accent="emerald">
                  <p>
                    Apr&egrave;s r&eacute;siliation, les donn&eacute;es de l&apos;utilisateur seront
                    conserv&eacute;es pendant 90 jours puis supprim&eacute;es, sauf obligation l&eacute;gale
                    de conservation (donn&eacute;es comptables, preuves de transactions). Sur demande de
                    l&apos;utilisateur, les donn&eacute;es pourront &ecirc;tre export&eacute;es au format
                    structur&eacute; avant suppression.
                  </p>
                </InfoCard>
              </div>
            </ArticleSection>

            {/* Art. 11 — Modifications */}
            <ArticleSection id="modifications" number="11" title="Modifications des CGU">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                Smartly Assistant se r&eacute;serve le droit de modifier les pr&eacute;sentes CGU &agrave;
                tout moment. Les modifications entreront en vigueur 15 jours apr&egrave;s leur notification
                par email ou via le tableau de bord.
              </p>

              <div className="space-y-4">
                <InfoCard icon={Clock} title="Pr\u00e9avis de modification" accent="amber">
                  <p>
                    Les utilisateurs seront inform&eacute;s de toute modification substantielle des CGU
                    par email et par notification dans le tableau de bord. L&apos;utilisateur dispose
                    d&apos;un d&eacute;lai de 15 jours pour s&apos;y opposer. Pass&eacute; ce d&eacute;lai,
                    la poursuite de l&apos;utilisation vaut acceptation tacite des nouvelles conditions.
                  </p>
                </InfoCard>

                <InfoCard icon={Scale} title="Droit d&apos;opposition" accent="sky">
                  <p>
                    Si l&apos;utilisateur n&apos;accepte pas les modifications, il peut r&eacute;silier
                    son abonnement sans p&eacute;nalit&eacute; dans les 15 jours suivant la notification,
                    en adressant sa demande &agrave; contact@smartly.aero.
                  </p>
                </InfoCard>
              </div>
            </ArticleSection>

            {/* Art. 12 — Litiges */}
            <ArticleSection id="litige" number="12" title="Litiges">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                En cas de litige relatif &agrave; l&apos;interpr&eacute;tation ou &agrave; l&apos;ex&eacute;cution
                des pr&eacute;sentes CGU, les parties s&apos;engagent &agrave; rechercher une solution
                amiable.
              </p>

              <div className="space-y-4">
                <InfoCard icon={Scale} title="M\u00e9diation" accent="amber">
                  <p>
                    Avant toute action en justice, les parties conviennent de tenter une m&eacute;diation.
                    Le m&eacute;diateur sera d&eacute;sign&eacute; d&apos;un commun accord entre les parties.
                    Les frais de m&eacute;diation seront partag&eacute;s &agrave; parts &eacute;gales.
                  </p>
                </InfoCard>

                <InfoCard icon={Globe} title="Droit applicable" accent="sky">
                  <p>
                    Les pr&eacute;sentes CGU sont soumises au droit s&eacute;n&eacute;galais. En cas
                    d&apos;&eacute;chec de la m&eacute;diation, le Tribunal R&eacute;gional de Dakar sera
                    seul comp&eacute;tent pour conna&icirc;tre du litige, nonobstant pluralit&eacute; de
                    d&eacute;fendeurs ou appel en garantie.
                  </p>
                </InfoCard>
              </div>
            </ArticleSection>

            {/* Art. 13 — Contact */}
            <ArticleSection id="contact" number="13" title="Contact">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                Pour toute question relative aux pr&eacute;sentes CGU ou pour exercer vos droits,
                vous pouvez nous contacter par les moyens suivants.
              </p>

              <div className="rounded-xl border border-white/10 bg-slate-900/40 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10">
                    <Mail className="h-5 w-5 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Service Juridique</h3>
                    <p className="text-xs text-slate-500">Pour toute question contractuelle</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <a href="mailto:contact@smartly.aero" className="rounded-lg border border-white/5 bg-slate-900/60 p-4 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="h-3.5 w-3.5 text-sky-400" />
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Email</p>
                    </div>
                    <p className="text-sm text-slate-200">contact@smartly.aero</p>
                  </a>
                  <a href="tel:+221338696970" className="rounded-lg border border-white/5 bg-slate-900/60 p-4 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Phone className="h-3.5 w-3.5 text-sky-400" />
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">T\u00e9l\u00e9phone</p>
                    </div>
                    <p className="text-sm text-slate-200">+221 33 869 69 70</p>
                  </a>
                  <div className="rounded-lg border border-white/5 bg-slate-900/60 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-3.5 w-3.5 text-sky-400" />
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Adresse</p>
                    </div>
                    <p className="text-sm text-slate-200">AIBD, Dakar, S\u00e9n\u00e9gal</p>
                  </div>
                  <a href="mailto:dpo@smartly.aero" className="rounded-lg border border-white/5 bg-slate-900/60 p-4 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="h-3.5 w-3.5 text-sky-400" />
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">DPO</p>
                    </div>
                    <p className="text-sm text-slate-200">dpo@smartly.aero</p>
                  </a>
                </div>
              </div>
            </ArticleSection>
          </main>
        </div>
      </div>
    </section>
  )
}
