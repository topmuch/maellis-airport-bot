'use client'

import { motion } from 'framer-motion'
import { fadeInUp, scaleIn, viewportOnce } from '@/lib/animations'

export function FinalCTA() {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-orange-500 via-orange-600 to-sky-500">
      <div className="max-w-3xl mx-auto text-center">
        {/* Heading */}
        <motion.h2
          className="text-3xl md:text-4xl font-bold text-white mb-4"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          Prêt à moderniser votre aéroport ?
        </motion.h2>

        {/* Subheading */}
        <motion.p
          className="text-lg text-white/80 max-w-2xl mx-auto mb-8"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          Rejoignez les aéroports qui font confiance à Smartly Assistant. Déploiement en 7 jours, ROI garanti.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center mt-8"
          variants={scaleIn}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <a
            href="/auth/admin"
            className="inline-flex items-center justify-center bg-white text-orange-600 hover:bg-orange-50 font-semibold rounded-lg px-6 py-3 transition-colors"
          >
            🔐 Connexion Admin
          </a>
          <a
            href="/auth/partner"
            className="inline-flex items-center justify-center border-2 border-white text-white hover:bg-white/10 font-semibold rounded-lg px-6 py-3 transition-colors"
          >
            🤝 Espace Partenaire
          </a>
        </motion.div>

        {/* Contact Info */}
        <motion.p
          className="text-sm text-white/60 mt-8"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          contact@smartly.aero | +221 33 869 69 69
        </motion.p>
      </div>
    </section>
  )
}
