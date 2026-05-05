'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import {
  ChevronRight,
  Shield,
  Database,
  Scale,
  Share2,
  UserCheck,
  Clock,
  Lock,
  Cookie,
  Mail,
  Phone,
  Building2,
  UserCircle,
  MonitorSmartphone,
  Wifi,
  CreditCard,
  Eye,
  Pencil,
  Trash2,
  FolderInput,
  Ban,
  FileCheck,
  Server,
  Fingerprint,
  Globe,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

// ─── TOC Section Configuration ─────────────────────────────────────────────

const tocSections: { id: string; label: string }[] = [
  { id: 'responsable', label: 'Responsable du traitement' },
  { id: 'donnees-collectees', label: 'Données collectées' },
  { id: 'base-legale', label: 'Base légale' },
  { id: 'partage-tiers', label: 'Partage avec des tiers' },
  { id: 'droits', label: 'Vos droits' },
  { id: 'conservation', label: 'Durée de conservation' },
  { id: 'securite', label: 'Sécurité des données' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'contact-dpo', label: 'Contact DPO' },
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

function TableOfContents({
  activeSection,
}: {
  activeSection: string
}) {
  return (
    <nav aria-label="Table des matières">
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
  amber: {
    iconBg: 'bg-amber-500/10',
    iconText: 'text-amber-400',
    border: 'border-amber-500/20',
  },
  emerald: {
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  sky: {
    iconBg: 'bg-sky-500/10',
    iconText: 'text-sky-400',
    border: 'border-sky-500/20',
  },
  rose: {
    iconBg: 'bg-rose-500/10',
    iconText: 'text-rose-400',
    border: 'border-rose-500/20',
  },
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
          <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400">§{number}</Badge>
          <h2 className="text-xl font-bold text-white sm:text-2xl">{title}</h2>
        </div>
        <div className="mt-6">{children}</div>
      </AnimatedSection>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── Main PrivacyContent Component ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

export function PrivacyContent() {
  const [activeSection, setActiveSection] = useState<string>('responsable')

  // ── IntersectionObserver for active TOC tracking ─────────────────────
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

  // ── Smooth scroll handler for TOC links ─────────────────────────────
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

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <section className="relative min-h-screen overflow-hidden bg-slate-950">
      {/* Decorative top radial gradient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-orange-500/8 to-transparent" />
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
            Retour à l&apos;accueil
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 text-center"
        >
          <Badge className="mb-5 border-amber-500/30 bg-amber-500/10 text-amber-400">
            RGPD Conforme
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Politique de{' '}
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
              Confidentialité
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-400 sm:text-lg">
            Nous prenons la protection de vos données personnelles très au sérieux.
            Cette politique décrit comment nous collectons, utilisons et protégeons vos informations.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Dernière mise à jour : 26 avril 2026
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
            {/* ── §1 Responsable du traitement ──────────────────────── */}
            <ArticleSection id="responsable" number="1" title="Responsable du traitement">
              <div className="rounded-xl border border-white/10 bg-slate-900/40 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                    <Building2 className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Informations de l&apos;entreprise</h3>
                    <p className="text-xs text-slate-500">Entité responsable du traitement des données</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/5 bg-slate-900/60 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Dénomination</p>
                    <p className="text-sm text-slate-200">Smartly Assistant</p>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-slate-900/60 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Siège social</p>
                    <p className="text-sm text-slate-200">Aéroport International Blaise Diagne, Dakar, Sénégal</p>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-slate-900/60 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Contact</p>
                    <p className="text-sm text-slate-200">contact@smartly.aero</p>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-slate-900/60 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Délégué à la Protection des Données</p>
                    <p className="text-sm text-slate-200">dpo@smartly.aero</p>
                  </div>
                </div>
              </div>
            </ArticleSection>

            {/* ── §2 Données collectées ────────────────────────────── */}
            <ArticleSection id="donnees-collectees" number="2" title="Données collectées">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                Nous collectons différentes catégories de données personnelles nécessaires au fonctionnement
                de nos services. Chaque catégorie est collectée dans un but spécifique et légitime.
              </p>

              <div className="space-y-4">
                <InfoCard
                  icon={UserCircle}
                  title="Données d'identification"
                  accent="amber"
                >
                  Nom, prénom, adresse email, numéro de téléphone, pièces d&apos;identité
                  (passeport, carte d&apos;identité) pour les services nécessitant une vérification
                  d&apos;identité.
                </InfoCard>

                <InfoCard
                  icon={MonitorSmartphone}
                  title="Données d'utilisation"
                  accent="sky"
                >
                  Historique des conversations avec le chatbot, recherches de vols,
                  commandes passées, préférences de services et interactions avec la plateforme.
                </InfoCard>

                <InfoCard
                  icon={Globe}
                  title="Données techniques"
                  accent="emerald"
                >
                  Adresse IP, type de navigateur, système d&apos;exploitation, résolution d&apos;écran,
                  langue de l&apos;appareil et identifiants de session.
                </InfoCard>

                <InfoCard
                  icon={Wifi}
                  title="Données de navigation"
                  accent="sky"
                >
                  Pages visitées, temps passé sur chaque page, clics, flux de navigation
                  et sources de trafic (référents).
                </InfoCard>

                <InfoCard
                  icon={CreditCard}
                  title="Données de paiement"
                  accent="rose"
                >
                  Coordonnées bancaires traitées exclusivement via notre prestataire de
                  paiement sécurisé CinetPay. Nous ne stockons aucune donnée de carte bancaire
                  sur nos serveurs.
                </InfoCard>
              </div>
            </ArticleSection>

            {/* ── §3 Base légale ───────────────────────────────────── */}
            <ArticleSection id="base-legale" number="3" title="Base légale du traitement">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                Chaque traitement de données personnelles repose sur une base légale conforme au
                Règlement Général sur la Protection des Données (RGPD) et à la Loi
                sénégalaise n°2008-12 relative à la protection des données à caractère personnel.
              </p>

              {/* Legal articles */}
              <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-slate-900/40 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Article 6.1.a</p>
                  <p className="text-sm font-medium text-white mb-1">Consentement</p>
                  <p className="text-xs text-slate-400">L&apos;utilisateur a consenti au traitement pour une ou plusieurs finalités spécifiques.</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-900/40 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Article 6.1.b</p>
                  <p className="text-sm font-medium text-white mb-1">Exécution contractuelle</p>
                  <p className="text-xs text-slate-400">Le traitement est nécessaire à l&apos;exécution d&apos;un contrat auquel l&apos;utilisateur est partie.</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-900/40 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Article 6.1.f</p>
                  <p className="text-sm font-medium text-white mb-1">Intérêt légitime</p>
                  <p className="text-xs text-slate-400">Le traitement est nécessaire aux fins des intérêts légitimes poursuivis par le responsable.</p>
                </div>
              </div>

              {/* Purpose table */}
              <div className="rounded-xl border border-white/10 bg-slate-900/40 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-slate-900/60">
                        <th className="px-4 py-3 text-left font-medium text-slate-300">Finalité</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-300">Base légale</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-300">Données concernées</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-slate-300">Gestion du compte utilisateur</td>
                        <td className="px-4 py-3"><Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400">Art. 6.1.b</Badge></td>
                        <td className="px-4 py-3 text-slate-400">Identification, contact</td>
                      </tr>
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-slate-300">Assistance voyageur (chatbot)</td>
                        <td className="px-4 py-3"><Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400">Art. 6.1.a</Badge></td>
                        <td className="px-4 py-3 text-slate-400">Identification, utilisation</td>
                      </tr>
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-slate-300">Paiement des services</td>
                        <td className="px-4 py-3"><Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400">Art. 6.1.b</Badge></td>
                        <td className="px-4 py-3 text-slate-400">Paiement (via CinetPay)</td>
                      </tr>
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-slate-300">Analyse et amélioration</td>
                        <td className="px-4 py-3"><Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400">Art. 6.1.f</Badge></td>
                        <td className="px-4 py-3 text-slate-400">Navigation, utilisation</td>
                      </tr>
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-slate-300">Communications marketing</td>
                        <td className="px-4 py-3"><Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400">Art. 6.1.a</Badge></td>
                        <td className="px-4 py-3 text-slate-400">Contact, préférences</td>
                      </tr>
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-slate-300">Sécurité et fraude</td>
                        <td className="px-4 py-3"><Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400">Art. 6.1.f</Badge></td>
                        <td className="px-4 py-3 text-slate-400">Techniques, identification</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </ArticleSection>

            {/* ── §4 Partage avec des tiers ─────────────────────────── */}
            <ArticleSection id="partage-tiers" number="4" title="Partage avec des tiers">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                Nous ne vendons pas vos données personnelles. Nous les partageons uniquement avec
                des prestataires de confiance nécessaires au fonctionnement de nos services.
              </p>

              <div className="space-y-4 mb-6">
                <InfoCard
                  icon={MonitorSmartphone}
                  title="Meta (WhatsApp Business API)"
                  accent="sky"
                >
                  <p className="mb-2">
                    Nous utilisons l&apos;API WhatsApp Business de Meta pour la communication avec les
                    voyageurs. Les numéros de téléphone et les messages sont traités via les
                    serveurs de Meta conformément à leurs conditions d&apos;utilisation.
                  </p>
                  <p>
                    <span className="text-xs text-slate-500">Données partagées :</span>{' '}
                    <span className="text-xs text-slate-300">numéro de téléphone, contenu des messages du chatbot</span>
                  </p>
                </InfoCard>

                <InfoCard
                  icon={CreditCard}
                  title="CinetPay (Prestataire de paiement)"
                  accent="amber"
                >
                  <p className="mb-2">
                    Les transactions financières sont sécurisées par CinetPay, notre prestataire de
                    paiement agréé par la BCEAO. Aucune donnée bancaire n&apos;est stockée sur nos serveurs.
                  </p>
                  <p>
                    <span className="text-xs text-slate-500">Données partagées :</span>{' '}
                    <span className="text-xs text-slate-300">montant de la transaction, référence de commande</span>
                  </p>
                </InfoCard>

                <InfoCard
                  icon={Server}
                  title="Hébergeur de données"
                  accent="emerald"
                >
                  <p className="mb-2">
                    Nos données sont hébergées sur des serveurs sécurisés conformes aux normes
                    internationales de sécurité, avec des sauvegardes automatiques et un chiffrement
                    au repos.
                  </p>
                  <p>
                    <span className="text-xs text-slate-500">Localisation :</span>{' '}
                    <span className="text-xs text-slate-300">centres de données certifiés ISO 27001</span>
                  </p>
                </InfoCard>
              </div>

              {/* Commitment box */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-emerald-400 mb-1">Notre engagement</p>
                    <p className="text-sm leading-relaxed text-slate-400">
                      Chaque sous-traitant fait l&apos;objet d&apos;un contrat écrit définissant les finalités,
                      la durée, la nature des données et les obligations en matière de sécurité. Nous
                      procédons à des audits réguliers pour garantir leur conformité.
                    </p>
                  </div>
                </div>
              </div>
            </ArticleSection>

            {/* ── §5 Vos droits ────────────────────────────────────── */}
            <ArticleSection id="droits" number="5" title="Vos droits">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                Conformément au RGPD et à la législation sénégalaise, vous disposez de droits
                fondamentaux sur vos données personnelles.
              </p>

              <div className="space-y-4 mb-6">
                <InfoCard
                  icon={Eye}
                  title="Droit d'accès (Article 15)"
                  accent="amber"
                >
                  Vous pouvez demander une copie de l&apos;ensemble des données personnelles que nous
                  détenons vous concernant. La réponse vous sera adressée dans un format lisible
                  et structuré.
                </InfoCard>

                <InfoCard
                  icon={Pencil}
                  title="Droit de rectification (Article 16)"
                  accent="sky"
                >
                  Vous avez le droit de demander la correction de toute donnée inexacte ou
                  incomplète vous concernant. Les modifications sont appliquées dans les meilleurs délais.
                </InfoCard>

                <InfoCard
                  icon={Trash2}
                  title="Droit à l'effacement (Article 17)"
                  accent="rose"
                >
                  Vous pouvez demander la suppression de vos données personnelles, sous réserve
                  des obligations légales de conservation qui nous incombent.
                </InfoCard>

                <InfoCard
                  icon={FolderInput}
                  title="Droit à la portabilité (Article 20)"
                  accent="emerald"
                >
                  Vous avez le droit de recevoir vos données dans un format structuré, couramment
                  utilisé et lisible par machine, et de les transmettre à un autre responsable de traitement.
                </InfoCard>

                <InfoCard
                  icon={Ban}
                  title="Droit d'opposition (Article 21)"
                  accent="rose"
                >
                  Vous pouvez vous opposer au traitement de vos données pour des raisons tenant
                  à votre situation particulière, ou vous opposer à la prospection commerciale.
                </InfoCard>
              </div>

              {/* How to exercise box */}
              <div className="rounded-xl border border-white/10 bg-slate-900/40 p-5">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white mb-1">Comment exercer vos droits ?</p>
                    <p className="text-sm leading-relaxed text-slate-400 mb-3">
                      Pour exercer l&apos;un de ces droits, envoyez votre demande signée accompagnée d&apos;une
                      copie de votre pièce d&apos;identité à l&apos;adresse suivante :
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-slate-500" />
                        <span className="text-sm text-amber-400">dpo@smartly.aero</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-slate-500" />
                        <span className="text-sm text-slate-300">Smartly Assistant — DPO</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-slate-500" />
                        <span className="text-sm text-slate-400">AIBD, Dakar, Sénégal</span>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      Nous disposons d&apos;un délai maximum d&apos;un mois pour répondre à votre demande,
                      conformément à l&apos;article 12 du RGPD.
                    </p>
                  </div>
                </div>
              </div>
            </ArticleSection>

            {/* ── §6 Durée de conservation ──────────────────────────── */}
            <ArticleSection id="conservation" number="6" title="Durée de conservation">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                Les données personnelles sont conservées uniquement pendant la durée nécessaire
                aux finalités pour lesquelles elles ont été collectées.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <InfoCard
                  icon={UserCheck}
                  title="Données utilisateur actif"
                  accent="amber"
                >
                  <p className="mb-2">
                    Les données des comptes actifs sont conservées pendant toute la durée de
                    la relation contractuelle.
                  </p>
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-400">Durée :</span> jusqu&apos;à la suppression du compte ou 3 ans après le dernier contact
                  </p>
                </InfoCard>

                <InfoCard
                  icon={FileCheck}
                  title="Logs et traces techniques"
                  accent="sky"
                >
                  <p className="mb-2">
                    Les logs de connexion et les traces techniques sont conservés pour assurer
                    la sécurité et le bon fonctionnement des services.
                  </p>
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-400">Durée :</span> 12 mois maximum
                  </p>
                </InfoCard>

                <InfoCard
                  icon={CreditCard}
                  title="Données de paiement"
                  accent="emerald"
                >
                  <p className="mb-2">
                    Les preuves de transactions sont conservées conformément aux obligations
                    légales et réglementaires en vigueur.
                  </p>
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-400">Durée :</span> 5 ans (obligation comptable BCEAO)
                  </p>
                </InfoCard>

                <InfoCard
                  icon={Cookie}
                  title="Cookies et traceurs"
                  accent="rose"
                >
                  <p className="mb-2">
                    Les cookies de session sont supprimés à la fermeture du navigateur.
                    Les cookies analytiques ont une durée de vie maximale de 13 mois.
                  </p>
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-400">Durée :</span> session à 13 mois selon la catégorie
                  </p>
                </InfoCard>
              </div>
            </ArticleSection>

            {/* ── §7 Sécurité des données ──────────────────────────── */}
            <ArticleSection id="securite" number="7" title="Sécurité des données">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                Nous mettons en œuvre des mesures techniques et organisationnelles appropriées
                pour garantir un niveau de sécurité proportionnel au risque.
              </p>

              <div className="space-y-4 mb-6">
                <InfoCard
                  icon={Lock}
                  title="Chiffrement TLS 1.3"
                  accent="amber"
                >
                  Toutes les communications entre votre appareil et nos serveurs sont chiffrées
                  en utilisant le protocole TLS 1.3. Les données au repos sont également chiffrées
                  avec AES-256.
                </InfoCard>

                <InfoCard
                  icon={Fingerprint}
                  title="Authentification multifacteur (MFA)"
                  accent="sky"
                >
                  L&apos;accès aux interfaces d&apos;administration est protégé par une authentification
                  multifacteur. Les sessions utilisateur expirent automatiquement après une période
                  d&apos;inactivité.
                </InfoCard>

                <InfoCard
                  icon={Server}
                  title="Hébergement sécurisé"
                  accent="emerald"
                >
                  Nos infrastructures sont hébergées dans des centres de données certifiés ISO 27001
                  avec des sauvegardes automatiques quotidiennes, une surveillance continue et un
                  plan de reprise d&apos;activité (PRA).
                </InfoCard>
              </div>

              {/* Audit mention */}
              <div className="rounded-xl border border-white/10 bg-slate-900/40 p-5">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white mb-1">Audits et tests de sécurité</p>
                    <p className="text-sm leading-relaxed text-slate-400">
                      Nous réalisons des audits de sécurité internes semestriels et des tests de
                      pénétration annuels pour identifier et corriger toute vulnérabilité potentielle.
                      En cas de violation de données, nous nous engageons à notifier les personnes
                      concernées et les autorités compétentes dans les 72 heures conformément à
                      l&apos;article 33 du RGPD.
                    </p>
                  </div>
                </div>
              </div>
            </ArticleSection>

            {/* ── §8 Cookies ───────────────────────────────────────── */}
            <ArticleSection id="cookies" number="8" title="Cookies et technologies similaires">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                Notre site utilise des cookies pour améliorer votre expérience, analyser le trafic
                et proposer des contenus personnalisés. Vous pouvez gérer vos préférences à tout moment.
              </p>

              <div className="space-y-4 mb-6">
                {/* Essential cookies */}
                <div className="rounded-xl border border-white/10 bg-slate-900/40 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                      <CheckCircle2 className="h-4.5 w-4.5 text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Cookies essentiels</h4>
                      <p className="text-xs text-slate-500">Toujours actifs — indispensables au fonctionnement</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-400">
                    Ces cookies sont nécessaires au bon fonctionnement du site. Ils permettent la
                    navigation, l&apos;authentification et la sécurité. Ils ne peuvent pas être désactivés
                    car le site ne fonctionnerait pas correctement sans eux.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className="border-white/10 bg-slate-800/60 text-slate-400">Session</Badge>
                    <Badge className="border-white/10 bg-slate-800/60 text-slate-400">CSRF</Badge>
                    <Badge className="border-white/10 bg-slate-800/60 text-slate-400">Auth</Badge>
                  </div>
                </div>

                {/* Analytics cookies */}
                <div className="rounded-xl border border-white/10 bg-slate-900/40 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
                      <Database className="h-4.5 w-4.5 text-sky-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Cookies analytiques</h4>
                      <p className="text-xs text-slate-500">Activables — mesure d&apos;audience anonymisée</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-400">
                    Ces cookies nous permettent de comprendre comment les visiteurs utilisent notre site
                    afin de l&apos;améliorer. Les données collectées sont agrégées et anonymisées.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className="border-white/10 bg-slate-800/60 text-slate-400">Analytics</Badge>
                    <Badge className="border-white/10 bg-slate-800/60 text-slate-400">Performance</Badge>
                  </div>
                </div>

                {/* Marketing cookies */}
                <div className="rounded-xl border border-white/10 bg-slate-900/40 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                      <Share2 className="h-4.5 w-4.5 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Cookies marketing</h4>
                      <p className="text-xs text-slate-500">Activables — publicité et suivi</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-400">
                    Ces cookies sont utilisés pour afficher des publicités pertinentes et mesurer
                    l&apos;efficacité de nos campagnes marketing. Ils peuvent être configurés via la
                    bannière de consentement.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className="border-white/10 bg-slate-800/60 text-slate-400">Publicité</Badge>
                    <Badge className="border-white/10 bg-slate-800/60 text-slate-400">Retargeting</Badge>
                  </div>
                </div>
              </div>

              {/* Consent banner reference */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-400 mb-1">Gestion du consentement</p>
                    <p className="text-sm leading-relaxed text-slate-400">
                      Vous pouvez modifier vos préférences en matière de cookies à tout moment via
                      la bannière de consentement affichée lors de votre première visite, ou en
                      accédant aux paramètres de votre navigateur. Retirez votre consentement
                      n&apos;affectera pas la licéité du traitement effectué sur la base de votre
                      consentement antérieur.
                    </p>
                  </div>
                </div>
              </div>
            </ArticleSection>

            {/* ── §9 Contact DPO ───────────────────────────────────── */}
            <ArticleSection id="contact-dpo" number="9" title="Contact DPO">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                Notre Délégué à la Protection des Données (DPO) est à votre disposition pour toute
                question relative à la protection de vos données personnelles.
              </p>

              <div className="grid gap-4 sm:grid-cols-2 mb-6">
                <div className="rounded-xl border border-white/10 bg-slate-900/40 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                      <Mail className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Email</p>
                      <p className="text-sm font-medium text-white">dpo@smartly.aero</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400">
                    Pour toute demande concernant vos données personnelles, l&apos;exercice de vos droits
                    ou une réclamation.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-900/40 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10">
                      <Phone className="h-5 w-5 text-sky-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Téléphone</p>
                      <p className="text-sm font-medium text-white">+221 33 869 69 70</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400">
                    Disponible du lundi au vendredi, de 8h à 18h (GMT), et le samedi de 9h à 13h.
                  </p>
                </div>
              </div>

              {/* Response time */}
              <div className="rounded-xl border border-white/10 bg-slate-900/40 p-5 mb-6">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white mb-1">Délai de réponse</p>
                    <p className="text-sm leading-relaxed text-slate-400">
                      Conformément à l&apos;article 12 du RGPD, nous nous engageons à répondre à votre demande
                      dans un délai maximum de{' '}
                      <span className="font-semibold text-emerald-400">30 jours</span> à compter de
                      la réception de votre requête. Ce délai peut être prolongé de 60 jours
                      supplémentaires en cas de demandes complexes, dont vous serez informé.
                    </p>
                  </div>
                </div>
              </div>

              {/* Authorities */}
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5">
                <div className="flex items-start gap-3">
                  <Scale className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-rose-400 mb-1">Autorités de contrôle</p>
                    <p className="text-sm leading-relaxed text-slate-400 mb-3">
                      Si vous estimez que le traitement de vos données n&apos;est pas conforme à la
                      réglementation, vous avez le droit d&apos;introduire une réclamation auprès des
                      autorités de contrôle compétentes :
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                        <span className="text-sm text-slate-300">CNIL — Commission Nationale de l&apos;Informatique et des Libertés (France)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                        <span className="text-sm text-slate-300">CNDP — Commission Nationale des Données Personnelles (Sénégal)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ArticleSection>
          </main>
        </div>
      </div>
    </section>
  )
}
