'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import {
  ChevronRight,
  Building2,
  Globe,
  Server,
  Shield,
  Scale,
  FileText,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  ArrowLeft,
  Gavel,
  Copyright,
} from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

// ─── TOC Section Configuration ─────────────────────────────────────────────

const tocSections: { id: string; label: string }[] = [
  { id: 'editeur', label: '\u00c9diteur du site' },
  { id: 'directeur-publication', label: 'Directeur de publication' },
  { id: 'hebergeur', label: 'H\u00e9bergeur' },
  { id: 'propriete-intellectuelle', label: 'Propri\u00e9t\u00e9 intellectuelle' },
  { id: 'responsabilite', label: 'Responsabilit\u00e9' },
  { id: 'liens-hypertextes', label: 'Liens hypertextes' },
  { id: 'donnees-personnelles', label: 'Donn\u00e9es personnelles' },
  { id: 'droit-applicable', label: 'Droit applicable' },
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
          <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400">{number}</Badge>
          <h2 className="text-xl font-bold text-white sm:text-2xl">{title}</h2>
        </div>
        <div className="mt-6">{children}</div>
      </AnimatedSection>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── Main LegalContent Component ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

export function LegalContent() {
  const [activeSection, setActiveSection] = useState<string>('editeur')

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
        <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-500/8 to-transparent" />
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
          <Badge className="mb-5 border-amber-500/30 bg-amber-500/10 text-amber-400">
            Informations L&eacute;gales
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Mentions{' '}
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
              L&eacute;gales
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-400 sm:text-lg">
            Informations relatives &agrave; l&apos;&eacute;diteur, l&apos;h&eacute;bergeur et les conditions
            d&apos;utilisation du site smartly.aero.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Derni&egrave;re mise &agrave; jour : 26 avril 2026
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
            {/* §1 Éditeur du site */}
            <ArticleSection id="editeur" number="1" title="\u00c9diteur du site">
              <div className="rounded-xl border border-white/10 bg-slate-900/40 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                    <Building2 className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Informations de l&apos;&eacute;diteur</h3>
                    <p className="text-xs text-slate-500">Entit&eacute; responsable du site</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/5 bg-slate-900/60 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Raison sociale</p>
                    <p className="text-sm text-slate-200">Smartly Assistant</p>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-slate-900/60 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Forme juridique</p>
                    <p className="text-sm text-slate-200">Soci&eacute;t&eacute; &agrave; Responsabilit&eacute; Limit&eacute;e (SARL)</p>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-slate-900/60 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Si&egrave;ge social</p>
                    <p className="text-sm text-slate-200">A&eacute;roport International Blaise Diagne, Dakar, S&eacute;n&eacute;gal</p>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-slate-900/60 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Email</p>
                    <p className="text-sm text-slate-200">contact@smartly.aero</p>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-slate-900/60 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">T&eacute;l&eacute;phone</p>
                    <p className="text-sm text-slate-200">+221 33 869 69 70</p>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-slate-900/60 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Site web</p>
                    <a href="https://smartly.aero" target="_blank" rel="noopener noreferrer" className="text-sm text-amber-400 hover:text-amber-300 transition-colors">
                      https://smartly.aero
                    </a>
                  </div>
                </div>
              </div>
            </ArticleSection>

            {/* §2 Directeur de la publication */}
            <ArticleSection id="directeur-publication" number="2" title="Directeur de la publication">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                Conform&eacute;ment &agrave; la loi n&deg;2004-575 du 21 juin 2004 pour la confiance
                dans l&apos;&eacute;conomie num&eacute;rique, le directeur de la publication du site
                smartly.aero est d&eacute;sign&eacute; comme suit.
              </p>

              <div className="space-y-4">
                <InfoCard icon={Gavel} title="Directeur de publication" accent="amber">
                  <p className="mb-2">
                    Le directeur de la publication est le repr&eacute;sentant l&eacute;gal de la
                    soci&eacute;t&eacute; Smartly Assistant. Il est responsable du contenu &eacute;ditorial
                    publi&eacute; sur le site.
                  </p>
                  <p>
                    Pour toute question relative au contenu du site, veuillez contacter le directeur
                    de la publication &agrave; l&apos;adresse :{' '}
                    <a href="mailto:contact@smartly.aero" className="text-amber-400 hover:text-amber-300 transition-colors">
                      contact@smartly.aero
                    </a>
                  </p>
                </InfoCard>
              </div>
            </ArticleSection>

            {/* §3 Hébergeur */}
            <ArticleSection id="hebergeur" number="3" title="H\u00e9bergeur">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                Le site smartly.aero est h&eacute;berg&eacute; par une infrastructure cloud
                conforme aux normes internationales de s&eacute;curit&eacute; et de disponibilit&eacute;.
              </p>

              <div className="space-y-4">
                <InfoCard icon={Server} title="Infrastructure principale" accent="sky">
                  <p className="mb-2">
                    L&apos;application est d&eacute;ploy&eacute;e sur une infrastructure cloud
                    avec des serveurs situ&eacute;s dans des centres de donn&eacute;es certifi&eacute;s
                    ISO 27001 assurant une disponibilit&eacute; de 99,9%.
                  </p>
                  <p>
                    <span className="text-xs text-slate-500">Technologies :</span>{' '}
                    <span className="text-xs text-slate-300">Docker, conteneurisation, chiffrement TLS 1.3, sauvegardes automatiques quotidiennes</span>
                  </p>
                </InfoCard>

                <InfoCard icon={Globe} title="CDN et distribution" accent="emerald">
                  <p>
                    Le contenu statique est distribu&eacute; via un r&eacute;seau de diffusion de
                    contenu (CDN) pour garantir des temps de chargement rapides quel que soit
                    le lieu de connexion en Afrique et dans le monde.
                  </p>
                </InfoCard>
              </div>

              <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-emerald-400 mb-1">Engagement de disponibilit&eacute;</p>
                    <p className="text-sm leading-relaxed text-slate-400">
                      Un SLA de 99,9% de disponibilit&eacute; avec un temps de r&eacute;ponse
                      en cas d&apos;incident inf&eacute;rieur &agrave; 15 minutes. Un plan de reprise
                      d&apos;activit&eacute; (PRA) est en place avec des sauvegardes toutes les 6 heures.
                    </p>
                  </div>
                </div>
              </div>
            </ArticleSection>

            {/* §4 Propriété intellectuelle */}
            <ArticleSection id="propriete-intellectuelle" number="4" title="Propri\u00e9t\u00e9 intellectuelle">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                L&apos;ensemble des contenus pr&eacute;sents sur le site smartly.aero est prot&eacute;g&eacute;
                par le droit de la propri&eacute;t&eacute; intellectuelle conform&eacute;ment aux
                dispositions du droit s&eacute;n&eacute;galais et des conventions internationales
                applicables, notamment l&apos;accord ADPIC et la convention de Berne.
              </p>

              <div className="space-y-4 mb-6">
                <InfoCard icon={Copyright} title="Droits d&apos;auteur" accent="amber">
                  <p>
                    Tous les &eacute;l&eacute;ments du site (textes, graphismes, logos, ic&ocirc;nes,
                    animations, sons, logiciels, architecture et mise en page) sont la propri&eacute;t&eacute;
                    exclusive de Smartly Assistant ou de ses partenaires. Toute reproduction, repr&eacute;sentation,
                    modification, adaptation ou traduction, totale ou partielle, est interdite sans
                    autorisation &eacute;crite pr&eacute;alable.
                  </p>
                </InfoCard>

                <InfoCard icon={Shield} title="Marques d\u00e9pos\u00e9es" accent="emerald">
                  <p>
                    &laquo; Smartly Assistant &raquo; et le logo Smartly sont des marques d&eacute;pos&eacute;es.
                    Toute utilisation non autoris&eacute;e de ces marques est strictement interdite et
                    pourra faire l&apos;objet de poursuites judiciaires.
                  </p>
                </InfoCard>

                <InfoCard icon={FileText} title="Licence d&apos;utilisation" accent="sky">
                  <p>
                    L&apos;utilisation du site ne conf&egrave;re aux utilisateurs aucun droit de
                    propri&eacute;t&eacute; intellectuelle sur les &eacute;l&eacute;ments consult&eacute;s.
                    Les utilisateurs s&apos;engagent &agrave; ne pas utiliser les contenus &agrave; des
                    fins commerciales ou publicitaires sans autorisation pr&eacute;alable.
                  </p>
                </InfoCard>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                <div className="flex items-start gap-3">
                  <Scale className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-400 mb-1">Sanctions en cas de contrefa&ccedil;on</p>
                    <p className="text-sm leading-relaxed text-slate-400">
                      Conform&eacute;ment &agrave; la loi s&eacute;n&eacute;galaise sur la propri&eacute;t&eacute;
                      intellectuelle, toute contrefa&ccedil;on pourra &ecirc;tre poursuivie devant les
                      tribunaux comp&eacute;tents et exposera le contrevenant &agrave; des sanctions
                      p&eacute;nales et civiles, incluant des dommages et int&eacute;r&ecirc;ts.
                    </p>
                  </div>
                </div>
              </div>
            </ArticleSection>

            {/* §5 Responsabilité */}
            <ArticleSection id="responsabilite" number="5" title="Responsabilit\u00e9">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                Smartly Assistant s&apos;efforce de fournir des informations pr&eacute;cises sur le site.
                Toutefois, la soci&eacute;t&eacute; ne pourra &ecirc;tre tenue responsable des omissions,
                des inexactitudes et des carences dans la mise &agrave; jour.
              </p>

              <div className="space-y-4">
                <InfoCard icon={Shield} title="Limitation de responsabilit\u00e9" accent="amber">
                  <p>
                    Smartly Assistant d&eacute;cline toute responsabilit&eacute; pour les dommages
                    directs ou indirects r&eacute;sultant de l&apos;utilisation du site, y compris
                    la perte de donn&eacute;es, l&apos;interruption de service, les erreurs d&apos;affichage
                    des informations de vols ou toute autre d&eacute;faillance technique.
                  </p>
                </InfoCard>

                <InfoCard icon={Globe} title="Informations tierces" accent="sky">
                  <p>
                    Les donn&eacute;es de vols proviennent de sources tierces (AviationStack, syst&egrave;mes FIDS).
                    Smartly Assistant ne garantit pas l&apos;exactitude en temps r&eacute;el de ces donn&eacute;es
                    et recommande de v&eacute;rifier aupr&egrave;s des compagnies a&eacute;riennes ou a&eacute;roports.
                  </p>
                </InfoCard>

                <InfoCard icon={FileText} title="Contenu informatif" accent="emerald">
                  <p>
                    Les informations pr&eacute;sentes sur le site sont fournies &agrave; titre indicatif
                    et ne sauraient se substituer &agrave; un conseil professionnel.
                  </p>
                </InfoCard>
              </div>
            </ArticleSection>

            {/* §6 Liens hypertextes */}
            <ArticleSection id="liens-hypertextes" number="6" title="Liens hypertextes">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                Le site peut contenir des liens hypertextes vers d&apos;autres sites internet.
                Ces liens sont fournis &agrave; titre informatif et ne constituent pas une approbation.
              </p>

              <div className="space-y-4">
                <InfoCard icon={ExternalLink} title="Liens sortants" accent="sky">
                  <p>
                    Smartly Assistant n&apos;exerce aucun contr&ocirc;le sur le contenu des sites tiers
                    et d&eacute;cline toute responsabilit&eacute; quant au contenu de ces sites.
                  </p>
                </InfoCard>

                <InfoCard icon={Shield} title="Liens entrants" accent="amber">
                  <p>
                    Toute cr&eacute;ation de lien hypertexte vers smartly.aero est autoris&eacute;e
                    sans autorisation pr&eacute;alable, &agrave; condition que le lien ne porte pas
                    atteinte &agrave; l&apos;image de Smartly Assistant et que la page s&apos;ouvre
                    dans une nouvelle fen&ecirc;tre.
                  </p>
                </InfoCard>
              </div>
            </ArticleSection>

            {/* §7 Données personnelles */}
            <ArticleSection id="donnees-personnelles" number="7" title="Donn\u00e9es personnelles">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                Smartly Assistant s&apos;engage &agrave; prot&eacute;ger la vie priv&eacute;e de ses
                utilisateurs. La collecte et le traitement des donn&eacute;es personnelles sont
                r&eacute;gis par notre{' '}
                <Link
                  href="/privacy"
                  className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
                >
                  Politique de Confidentialit&eacute;
                </Link>{' '}
                conforme au RGPD et &agrave; la loi s&eacute;n&eacute;galaise n&deg;2008-12.
              </p>

              <div className="rounded-xl border border-white/10 bg-slate-900/40 p-5">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white mb-1">D&eacute;l&eacute;gu&eacute; &agrave; la Protection des Donn&eacute;es (DPO)</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Mail className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-sm text-amber-400">dpo@smartly.aero</span>
                    </div>
                  </div>
                </div>
              </div>
            </ArticleSection>

            {/* §8 Droit applicable */}
            <ArticleSection id="droit-applicable" number="8" title="Droit applicable et juridiction">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                Les pr&eacute;sentes mentions l&eacute;gales sont r&eacute;gies par le droit
                s&eacute;n&eacute;galais. En cas de litige, les tribunaux de Dakar seront seuls
                comp&eacute;tents.
              </p>

              <div className="space-y-4">
                <InfoCard icon={Scale} title="Droit applicable" accent="amber">
                  <p>
                    Les pr&eacute;sentes mentions l&eacute;gales sont soumises au droit s&eacute;n&eacute;galais,
                    incluant la loi n&deg;2008-12 relative &agrave; la protection des donn&eacute;es
                    et la loi n&deg;2004-575 pour la confiance dans l&apos;&eacute;conomie num&eacute;rique.
                  </p>
                </InfoCard>

                <InfoCard icon={Gavel} title="Juridiction comp\u00e9tente" accent="sky">
                  <p>
                    En cas de diff&eacute;rend, les parties s&apos;engagent &agrave; rechercher une
                    solution amiable avant toute action judiciaire. &Agrave; d&eacute;faut d&apos;accord,
                    le Tribunal R&eacute;gional de Dakar sera seul comp&eacute;tent.
                  </p>
                </InfoCard>
              </div>
            </ArticleSection>

            {/* §9 Contact */}
            <ArticleSection id="contact" number="9" title="Contact">
              <p className="mb-6 text-sm leading-relaxed text-slate-400">
                Pour toute question relative aux pr&eacute;sentes mentions l&eacute;gales ou au
                fonctionnement du site, vous pouvez nous contacter.
              </p>

              <div className="rounded-xl border border-white/10 bg-slate-900/40 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                    <Mail className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Nous contacter</h3>
                    <p className="text-xs text-slate-500">Plusieurs moyens de nous joindre</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <a href="mailto:contact@smartly.aero" className="rounded-lg border border-white/5 bg-slate-900/60 p-4 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="h-3.5 w-3.5 text-amber-400" />
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Email</p>
                    </div>
                    <p className="text-sm text-slate-200">contact@smartly.aero</p>
                  </a>
                  <a href="tel:+221338696970" className="rounded-lg border border-white/5 bg-slate-900/60 p-4 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Phone className="h-3.5 w-3.5 text-amber-400" />
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">T\u00e9l\u00e9phone</p>
                    </div>
                    <p className="text-sm text-slate-200">+221 33 869 69 70</p>
                  </a>
                  <div className="rounded-lg border border-white/5 bg-slate-900/60 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-3.5 w-3.5 text-amber-400" />
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Adresse</p>
                    </div>
                    <p className="text-sm text-slate-200">AIBD, Dakar, S\u00e9n\u00e9gal</p>
                  </div>
                  <a href="mailto:dpo@smartly.aero" className="rounded-lg border border-white/5 bg-slate-900/60 p-4 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="h-3.5 w-3.5 text-amber-400" />
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
