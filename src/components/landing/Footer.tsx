'use client'

import Image from 'next/image'
import { Linkedin, Twitter, MessageSquare, Youtube } from 'lucide-react'

const columns = [
  {
    title: 'Produit',
    links: ['Fonctionnalités', 'Tarifs', 'Démo', 'Documentation', 'Changelog'],
  },
  {
    title: 'Entreprise',
    links: ['À propos', 'Blog', 'Carrières', 'Presse', 'Contact'],
  },
  {
    title: 'Ressources',
    links: ['Guide de démarrage', 'API Docs', 'Status', 'Sécurité', 'RGPD'],
  },
  {
    title: 'Légal',
    links: ['CGV', 'Confidentialité', 'Cookies', 'Mentions légales'],
  },
]

const socialLinks = [
  { icon: Linkedin, label: 'LinkedIn' },
  { icon: Twitter, label: 'Twitter' },
  { icon: MessageSquare, label: 'WhatsApp' },
  { icon: Youtube, label: 'Youtube' },
]

export function Footer() {
  return (
    <footer className="bg-slate-900 dark:bg-[#0B0F19] text-slate-400 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* ─── Logo + Description ─────────────────────────────────────── */}
        <div className="flex flex-col items-center text-center mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/20">
              <Image
                src="/smartly-logo.png"
                alt="Smartly Assistant logo"
                width={56}
                height={56}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-xl leading-tight">
                Smartly
              </span>
              <span className="text-slate-500 text-sm font-normal leading-tight">
                Assistant
              </span>
            </div>
          </div>
          <p className="text-sm text-slate-500 max-w-md">
            L&apos;assistant IA WhatsApp qui transforme l&apos;expérience
            aéroportuaire en Afrique. Déployé en 7 jours.
          </p>
        </div>

        {/* ─── 4-Column Grid ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-white font-semibold text-sm mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ─── Bottom Bar ─────────────────────────────────────────────── */}
        <div className="pt-8 border-t border-slate-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left: Socials */}
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href="#"
                  className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-white transition-all"
                  aria-label={social.label}
                >
                  <social.icon className="size-4" />
                </a>
              ))}
            </div>

            {/* Right: Badges */}
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>Made with ❤️ in Dakar</span>
              <span className="hidden sm:inline">|</span>
              <span>Propulsé par Groq AI</span>
              <span className="hidden sm:inline">|</span>
              <span>RGPD Compliant</span>
            </div>
          </div>

          {/* Copyright */}
          <p className="text-xs text-slate-600 mt-6 text-center md:text-left">
            © {new Date().getFullYear()} Smartly Assistant. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  )
}
