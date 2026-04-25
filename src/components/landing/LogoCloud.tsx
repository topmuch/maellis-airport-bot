'use client'

import { motion } from 'framer-motion'
import { Plane } from 'lucide-react'

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1]

const logos = [
  { name: 'Aéroport DSS' },
  { name: 'Air Sénégal' },
  { name: 'CASA Airlines' },
  { name: 'AIBD' },
  { name: 'Smartly Partner' },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease },
  },
}

export function LogoCloud() {
  return (
    <motion.section
      className="py-16 bg-slate-950"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={containerVariants}
    >
      {/* Title */}
      <motion.p
        variants={itemVariants}
        className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 text-center mb-12"
      >
        Ils nous font confiance
      </motion.p>

      {/* Logos */}
      <motion.div
        variants={containerVariants}
        className="flex flex-wrap items-center justify-center gap-12 lg:gap-16 px-4"
      >
        {logos.map((logo) => (
          <motion.div
            key={logo.name}
            variants={itemVariants}
            className="flex items-center gap-2 group"
          >
            <Plane className="h-4 w-4 text-slate-700 group-hover:text-slate-500 transition-colors duration-300" />
            <span className="text-xl font-bold text-slate-600 hover:text-slate-300 transition-colors duration-300 cursor-default select-none">
              {logo.name}
            </span>
          </motion.div>
        ))}
      </motion.div>

      {/* Separator line */}
      <motion.div
        variants={itemVariants}
        className="border-t border-white/5 max-w-md mx-auto mt-12"
      />
    </motion.section>
  )
}
