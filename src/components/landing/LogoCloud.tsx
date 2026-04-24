'use client'

import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, viewportOnce } from '@/lib/animations'

const partners = [
  { name: 'AIBD Dakar', abbr: 'AIBD' },
  { name: 'Air Sénégal', abbr: 'ASK' },
  { name: 'Aéroport Abidjan', abbr: 'ABJ' },
  { name: 'Air Côte d\'Ivoire', abbr: 'ACI' },
  { name: 'Aéroport Bamako', abbr: 'BKO' },
]

export function LogoCloud() {
  return (
    <section className="py-16 border-y border-border/40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <motion.p
          variants={staggerItem}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="text-sm uppercase tracking-widest text-muted-foreground text-center mb-10"
        >
          Ils nous font confiance
        </motion.p>

        {/* Logo Grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 md:gap-6 items-center justify-items-center"
        >
          {partners.map((partner) => (
            <motion.div
              key={partner.name}
              variants={staggerItem}
              className="flex flex-col items-center gap-2 group"
            >
              {/* Stylized logo placeholder */}
              <div className="flex items-center justify-center w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 group-hover:border-orange-300 dark:group-hover:border-orange-700/50 group-hover:bg-orange-50/50 dark:group-hover:bg-orange-950/20 transition-all duration-300">
                <span className="text-2xl font-extrabold tracking-tight text-slate-400 dark:text-slate-600 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors duration-300">
                  {partner.abbr}
                </span>
              </div>
              <span className="text-sm font-medium text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors duration-300 text-center">
                {partner.name}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
