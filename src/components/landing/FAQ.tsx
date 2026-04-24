'use client'

import { motion } from 'framer-motion'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { fadeInUp, staggerContainer, staggerItem, viewportOnce } from '@/lib/animations'

const faqs = [
  {
    question: 'Combien de temps pour déployer Smartly ?',
    answer:
      '3 à 5 jours ouvrés. Nous nous occupons de tout : configuration WhatsApp, intégration APIs, formation équipes.',
  },
  {
    question: 'Puis-je personnaliser le bot ?',
    answer:
      'Oui, complètement. Logo, ton de voix, workflows, modules activés — tout est adaptable à votre marque.',
  },
  {
    question: 'Que se passe-t-il si le bot ne comprend pas ?',
    answer:
      'Transfert automatique vers un agent humain via le dashboard. Vous gardez le contrôle total.',
  },
  {
    question: 'Quels sont les moyens de paiement acceptés ?',
    answer:
      'Orange Money, Wave, MTN Mobile Money, carte bancaire via CinetPay. Conforme aux standards africains.',
  },
  {
    question: 'Mes données sont-elles sécurisées ?',
    answer:
      'Oui. Hébergement RGPD-compliant, chiffrement AES-256, backups quotidiens, audit de sécurité annuel.',
  },
  {
    question: 'Puis-je tester avant de m\'engager ?',
    answer:
      'Oui ! Essai gratuit de 30 jours, sans carte bancaire. Si vous n\'êtes pas convaincu, annulation en 1 clic.',
  },
]

export function FAQ() {
  return (
    <section id="faq" className="py-20" style={{ scrollMarginTop: '4.5rem' }}>
      <div className="max-w-3xl mx-auto px-4">
        {/* Heading */}
        <motion.h2
          className="text-3xl font-bold text-center mb-2"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          Questions fréquentes
        </motion.h2>

        <motion.p
          className="text-muted-foreground text-center mb-12"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          Tout ce que vous devez savoir
        </motion.p>

        {/* FAQ Accordion */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <motion.div key={index} variants={staggerItem}>
                <AccordionItem value={`item-${index}`}>
                  <AccordionTrigger className="font-medium text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  )
}
