'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Plane, Shield, MapPin, Zap, Linkedin, Github, MessageCircle } from 'lucide-react'

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1]

/* ─── Data ──────────────────────────────────────────────────────────────── */

const footerColumns: { title: string; links: string[] }[] = [
  {
    title: 'Produit',
    links: [
      'IA Conversationnelle',
      'Suivi de Vols',
      'Marketplace',
      'Dashboard Analytics',
      'Gestion de Crise',
    ],
  },
  {
    title: 'Entreprise',
    links: ['À Propos', 'Équipe', 'Carrières', 'Partenaires', 'Contact'],
  },
  {
    title: 'Ressources',
    links: [
      'Documentation',
      'Blog',
      'Études de Cas',
      'Webinaires',
      'Centre d\'Aide',
    ],
  },
  {
    title: 'Légal',
    links: [
      'Mentions Légales',
      'Politique de Confidentialité',
      'Conditions Générales',
      'RGPD',
      'Sécurité',
    ],
  },
]

const badges = [
  { icon: Shield, label: 'RGPD Compliant' },
  { icon: MapPin, label: 'Made in Dakar' },
  { icon: Zap, label: 'Propulsé par Groq AI' },
]

const socialLinks = [
  { icon: MessageCircle, label: 'Twitter' },
  { icon: Linkedin, label: 'LinkedIn' },
  { icon: Github, label: 'GitHub' },
]

/* ─── Component ─────────────────────────────────────────────────────────── */

export function Footer() {
  const prefersReducedMotion = useReducedMotion()

  const fadeInUp = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.6,
        ease,
      },
    },
  }

  const stagger = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.08,
        delayChildren: 0.05,
      },
    },
  }

  return (
    <footer className="bg-slate-950 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ─── Column Grid ────────────────────────────────────────────── */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-10 py-16"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
        >
          {footerColumns.map((column) => (
            <motion.div key={column.title} variants={fadeInUp}>
              <h4 className="text-xs font-medium uppercase tracking-[0.15em] text-slate-500 mb-4">
                {column.title}
              </h4>
              <ul>
                {column.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-slate-400 hover:text-white transition-colors py-1.5 cursor-pointer block"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        {/* ─── Bottom Bar ─────────────────────────────────────────────── */}
        <motion.div
          className="border-t border-white/5 py-8"
          initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.6 }}
        >
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Left — Logo + Copyright */}
            <div className="flex flex-col items-center lg:items-start gap-3">
              <div className="flex items-center gap-2.5">
                <Plane className="w-5 h-5 text-amber-500" />
                <span className="text-white font-semibold text-sm">
                  Smartly Assistant
                </span>
              </div>
              <p className="text-xs text-slate-600">
                &copy; 2026 Smartly Assistant. Tous droits réservés.
              </p>
            </div>

            {/* Center — Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {badges.map((badge) => (
                <span
                  key={badge.label}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-white/5 rounded-full px-3 py-1"
                >
                  <badge.icon className="w-3.5 h-3.5" />
                  {badge.label}
                </span>
              ))}
            </div>

            {/* Right — Social Icons */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href="#"
                  aria-label={social.label}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  )
}
