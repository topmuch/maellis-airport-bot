'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { fadeInUp, staggerContainer, staggerItem, viewportOnce } from '@/lib/animations'

/* ─── FAQ Data ───────────────────────────────────────────────────────── */
const faqs = [
  {
    question: 'Combien de temps pour déployer Smartly ?',
    answer:
      'Le déploiement standard prend 5 à 7 jours ouvrés. Cela inclut la configuration du bot, l\'intégration avec vos systèmes de vol, la personnalisation des réponses et la formation de votre équipe. Un chef de projet dédié vous accompagne à chaque étape.',
  },
  {
    question: 'Puis-je personnaliser le bot à mon image ?',
    answer:
      'Entièrement. Le nom, le logo, les couleurs, le ton des réponses et les workflows sont 100% personnalisables. Vous pouvez configurer des réponses spécifiques par langue, par type de passager et par situation opérationnelle.',
  },
  {
    question: 'Que se passe-t-il si le bot ne comprend pas ?',
    answer:
      'Le bot transmet automatiquement la conversation à un agent humain avec le contexte complet. Notre taux de résolution automatique est de 94%, et les 6% restants sont gérés par votre équipe via le dashboard de conciergerie hybride.',
  },
  {
    question: 'Quels sont les moyens de paiement acceptés ?',
    answer:
      'Smartly intègre les principaux moyens de paiement africains: Orange Money, Wave, MTN Mobile Money, carte bancaire et CinetPay. La facturation est automatique et conforme aux normes OHADA.',
  },
  {
    question: 'Mes données sont-elles sécurisées et conformes ?',
    answer:
      'Absolument. Toutes les données sont chiffrées (AES-256), hébergées sur des serveurs sécurisés, et conformes au RGPD ainsi qu\'à la législation locale. Aucune donnée n\'est partagée avec des tiers.',
  },
  {
    question: 'Puis-je tester avant de m\'engager ?',
    answer:
      'Oui, nous proposons une démonstration privée de 30 minutes avec un environnement de test complet. Vous pourrez tester tous les modules avec des scénarios réels avant de prendre votre décision.',
  },
]

/* ─── Content Animation Variants ─────────────────────────────────────── */
const cubicEase: [number, number, number, number] = [0.22, 1, 0.36, 1]

const contentVariants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.3, ease: cubicEase },
      opacity: { duration: 0.2, ease: 'easeOut' as const },
    },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: { duration: 0.35, ease: cubicEase },
      opacity: { duration: 0.25, ease: 'easeOut' as const, delay: 0.05 },
    },
  },
}

/* ─── Single FAQ Item ────────────────────────────────────────────────── */
function FAQItem({
  question,
  answer,
  index,
  isOpen,
  onToggle,
}: {
  question: string
  answer: string
  index: number
  isOpen: boolean
  onToggle: (i: number) => void
}) {
  const contentId = `faq-content-${index}`
  const buttonId = `faq-button-${index}`

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] overflow-hidden hover:border-white/10 transition-colors">
      <button
        id={buttonId}
        type="button"
        className="w-full flex items-center justify-between p-6 text-left"
        onClick={() => onToggle(index)}
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <span className="text-white font-medium pr-4">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={contentId}
            role="region"
            aria-labelledby={buttonId}
            variants={contentVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            className="overflow-hidden"
          >
            <p className="px-6 pb-6 text-slate-400 leading-relaxed">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── FAQ Component ──────────────────────────────────────────────────── */
export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const handleToggle = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index))
  }, [])

  return (
    <section
      id="faq"
      className="py-20 lg:py-32 bg-gradient-to-b from-slate-950 to-slate-900"
      style={{ scrollMarginTop: '4.5rem' }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ─── Title ────────────────────────────────────────────────── */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="text-center"
        >
          <motion.h2
            className="text-3xl lg:text-4xl font-semibold tracking-tight text-white"
            variants={fadeInUp}
          >
            Questions fréquentes
          </motion.h2>
          <motion.p
            className="text-lg text-slate-400 mt-4"
            variants={fadeInUp}
          >
            Tout ce que vous devez savoir avant de démarrer.
          </motion.p>
        </motion.div>

        {/* ─── Accordion ───────────────────────────────────────────── */}
        <motion.div
          className="mt-12 space-y-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {faqs.map((faq, index) => (
            <motion.div key={index} variants={staggerItem}>
              <FAQItem
                question={faq.question}
                answer={faq.answer}
                index={index}
                isOpen={openIndex === index}
                onToggle={handleToggle}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
