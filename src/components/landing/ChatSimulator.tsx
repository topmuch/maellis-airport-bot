'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Phone, Plane } from 'lucide-react'

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1]

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  text: string
  sender: 'bot' | 'user'
}

interface QuickReply {
  label: string
  response: string
}

// ─── Data ───────────────────────────────────────────────────────────────────

const quickReplies: QuickReply[] = [
  {
    label: '✈️ Statut vol AF123',
    response:
      '✈️ Vol AF123 — Paris CDG → Dakar DSS\n📍 Statut: À l\'heure\n🕐 Arrivée prévue: 14h35\n🚪 Porte: B12\n⏱️ En vol depuis 4h32\n\nVoulez-vous recevoir une notification de mise à jour ?',
  },
  {
    label: '🛍️ Réserver salon VIP',
    response:
      '🛍️ Salon VIP Dakar — Aire Horizon\n\n✅ Disponible maintenant\n💰 Tarif: 25 000 FCFA / personne\n⏰ Accès: 3 heures\n☕ Inclus: buffet, WiFi, douche, zone calme\n\nVoulez-vous réserver ? Paiement via Orange Money ou Wave.',
  },
  {
    label: '🧳 J\'ai perdu ma valise',
    response:
      '🧳 Déclaration de bagage — PIR\n\nJe vais vous aider. Répondez aux questions suivantes :\n\n1️⃣ Numéro de vol ?\n2️⃣ Carte d\'embarquement (photo) ?\n3️⃣ Description de la valise ?\n\n📝 Un rapport PIR sera généré automatiquement et transmis au service bagagerie.',
  },
]

const initialMessages: ChatMessage[] = [
  {
    id: 'init-1',
    text: '👋 Bienvenue sur Smartly Assistant ! Je suis votre assistant virtuel à l\'aéroport. Comment puis-je vous aider ?',
    sender: 'bot',
  },
  {
    id: 'init-2',
    text: 'Vous pouvez me poser des questions sur les vols, les bagages, les services, ou simplement taper votre demande.',
    sender: 'bot',
  },
]

// ─── Helpers ───────────────────────────────────────────────────────────────

let messageIdCounter = 0
function createId(): string {
  return `msg-${++messageIdCounter}-${Date.now()}`
}

function getTimestamp(): string {
  return new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Component ─────────────────────────────────────────────────────────────

export function ChatSimulator() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const initializedRef = useRef(false)

  const chatBodyRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Scroll to bottom ────────────────────────────────────────────────────

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (chatBodyRef.current) {
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight
      }
    })
  }, [])

  // ── Show initial welcome messages with stagger ──────────────────────────

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const delays = prefersReducedMotion ? [0, 200] : [400, 1200]

    const timer1 = setTimeout(() => {
      setMessages((prev) => [...prev, initialMessages[0]])
      scrollToBottom()
    }, delays[0])

    const timer2 = setTimeout(() => {
      setMessages((prev) => [...prev, initialMessages[1]])
      scrollToBottom()
    }, delays[1])

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [prefersReducedMotion, scrollToBottom])

  // ── Scroll on message change ────────────────────────────────────────────

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping, scrollToBottom])

  // ── Cleanup ─────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [])

  // ── Handle quick reply click ────────────────────────────────────────────

  const handleQuickReply = useCallback(
    (reply: QuickReply) => {
      if (isTyping) return

      // 1. Add user message
      const userMsg: ChatMessage = {
        id: createId(),
        text: reply.label,
        sender: 'user',
      }
      setMessages((prev) => [...prev, userMsg])

      // 2. Show typing indicator after a brief moment
      const typingDelay = prefersReducedMotion ? 0 : 300
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(true)
      }, typingDelay)

      // 3. After 1.5s, remove typing and show bot response
      typingTimeoutRef.current = setTimeout(
        () => {
          setIsTyping(false)
          const botMsg: ChatMessage = {
            id: createId(),
            text: reply.response,
            sender: 'bot',
          }
          setMessages((prev) => [...prev, botMsg])
        },
        1500 + typingDelay
      )
    },
    [isTyping, prefersReducedMotion]
  )

  // ── Animation variants ──────────────────────────────────────────────────

  const messageVariants = {
    initial: prefersReducedMotion
      ? { opacity: 0 }
      : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
  }

  return (
    <section className="py-20 lg:py-32 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Heading ──────────────────────────────────────────────────── */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease }}
        >
          <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight text-white text-center">
            Essayez Smartly maintenant — Aucune inscription requise
          </h2>
          <p className="text-lg text-slate-400 text-center mt-4">
            Découvrez l&apos;expérience passager en temps réel.
          </p>
        </motion.div>

        {/* ── Phone Container ──────────────────────────────────────────── */}
        <motion.div
          className="max-w-md mx-auto mt-12"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease }}
        >
          <div className="rounded-[2.5rem] border-[6px] border-slate-700 bg-slate-900 overflow-hidden shadow-2xl shadow-black/60">
            {/* ── WhatsApp Header ──────────────────────────────────────── */}
            <div className="bg-[#075E54] p-4 flex items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Smartly Icon */}
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                  <Plane className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-semibold text-sm leading-tight truncate">
                    Smartly Assistant
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                    <span className="text-xs text-green-300">En ligne</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Appeler Smartly"
                className="text-white/80 hover:text-white transition-colors flex-shrink-0"
              >
                <Phone className="w-5 h-5" />
              </button>
            </div>

            {/* ── Chat Body ────────────────────────────────────────────── */}
            <div
              ref={chatBodyRef}
              className="bg-[#0B141A] p-4 space-y-3 min-h-[400px] max-h-[500px] overflow-y-auto"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#334155 transparent',
              }}
            >
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    variants={messageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.3, ease }}
                    className={`flex ${
                      message.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`${
                        message.sender === 'user'
                          ? 'ml-auto bg-[#005C4B] rounded-2xl rounded-br-sm'
                          : 'mr-auto bg-[#1F2C34] rounded-2xl rounded-bl-sm'
                      } px-4 py-2.5 max-w-[85%] text-white text-sm whitespace-pre-line leading-relaxed`}
                    >
                      {message.text}
                      <span className="block text-[10px] text-slate-500 mt-1 text-right">
                        {getTimestamp()}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* ── Typing Indicator ─────────────────────────────────────── */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex justify-start"
                  >
                    <div className="mr-auto bg-[#1F2C34] rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex gap-1 items-center">
                        <span
                          className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0ms' }}
                        />
                        <span
                          className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                          style={{ animationDelay: '150ms' }}
                        />
                        <span
                          className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                          style={{ animationDelay: '300ms' }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Quick Reply Buttons ──────────────────────────────────── */}
            <div className="p-3 bg-[#1F2C34] flex flex-wrap gap-2">
              {quickReplies.map((reply) => (
                <button
                  key={reply.label}
                  type="button"
                  onClick={() => handleQuickReply(reply)}
                  disabled={isTyping}
                  className="rounded-full px-4 py-2 text-xs font-medium border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  {reply.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── CTA Below Phone ───────────────────────────────────────── */}
          <div className="text-center mt-6">
            <a
              href="https://wa.me/221338696969"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 transition-colors text-sm font-medium"
            >
              👉 Tester sur votre WhatsApp
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
