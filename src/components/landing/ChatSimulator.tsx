'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, MoreVertical, Send } from 'lucide-react'
import {
  fadeInUp,
  scaleIn,
  staggerContainer,
  staggerItem,
  viewportOnce,
} from '@/lib/animations'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  text: string
  displayedText: string
  sender: 'bot' | 'user'
  isTyping?: boolean
}

interface QuickReply {
  id: string
  label: string
  response: string
}

// ─── Quick Reply Data ──────────────────────────────────────────────────────

const quickReplies: QuickReply[] = [
  {
    id: 'flight-status',
    label: '✈️ Statut vol AF123',
    response:
      '✈️ **Vol AF123** — Paris CDG / Dakar\n🕐 Départ prévu : 14:30 (Porte B12)\n✅ **À l\'heure** — Embarquement à 13:50\n🪑 Siège : 14A — Fenêtre\n⚠️ Pensez à être à la porte 30 min avant.',
  },
  {
    id: 'find-taxi',
    label: '🚕 Chercher un taxi',
    response:
      '🚕 Voici 3 options de taxi disponibles :\n\n1️⃣ **Allo Taxi** — ~15 min • 5 000 FCFA\n2️⃣ **Rapid Taxi** — ~8 min • 7 500 FCFA ⭐\n3️⃣ **Aéroport Express** — ~5 min • 10 000 FCFA\n\n👉 Répondez avec le numéro pour réserver !',
  },
  {
    id: 'lost-baggage',
    label: "🧳 J'ai perdu ma valise",
    response:
      '🧳 Pas d\'inquiétude, je vous aide !\n\n📝 Je vais créer un signalement. Répondez :\n- Votre numéro de vol\n- Une description de la valise\n\n📌 En attendant, rendez-vous au comptoir **Bagages** (Hall A, niveau -1)\n📞 Urgence ? Appelez le +221 33 869 69 69',
  },
  {
    id: 'vip-lounge',
    label: '🛋️ Réserver salon VIP',
    response:
      '🛋️ **Salons VIP disponibles :**\n\n1️⃣ **Sky Lounge** — 15 000 FCFA/personne\n   • WiFi, snacks, douche, vue piste\n   • Disponible maintenant ✅\n\n2️⃣ **Africa Lounge** — 25 000 FCFA/personne\n   • Buffet, bar, salon privé\n   • 3 places restantes\n\n💳 Paiement via Orange Money ou Wave',
  },
]

const WELCOME_MESSAGE =
  "👋 Bonjour ! Je suis **Smartly**, votre assistant aéroport IA. Comment puis-je vous aider ?"

// ─── Helpers ───────────────────────────────────────────────────────────────

let messageIdCounter = 0
function createId(): string {
  return `msg-${++messageIdCounter}-${Date.now()}`
}

/** Parse **bold** markdown into <strong> spans */
function parseMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2)
      return (
        <strong key={i} className="font-semibold">
          {inner}
        </strong>
      )
    }
    // Preserve newlines
    return part.split('\n').reduce<React.ReactNode[]>((acc, line, idx, arr) => {
      acc.push(line)
      if (idx < arr.length - 1) {
        acc.push(<br key={`br-${i}-${idx}`} />)
      }
      return acc
    }, [])
  })
}

// ─── Component ─────────────────────────────────────────────────────────────

export function ChatSimulator() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [typingText, setTypingText] = useState('')
  const [hasStarted, setHasStarted] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatBodyRef = useRef<HTMLDivElement>(null)
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Scroll to bottom ────────────────────────────────────────────────────

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
  }, [])

  // ── Typewriter effect for bot messages ──────────────────────────────────

  const startTypewriter = useCallback(
    (msgId: string, fullText: string) => {
      let charIndex = 0
      setIsTyping(true)
      setTypingText('')

      typingIntervalRef.current = setInterval(() => {
        charIndex++
        const partial = fullText.slice(0, charIndex)
        setTypingText(partial)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, displayedText: partial } : m
          )
        )

        if (charIndex >= fullText.length) {
          if (typingIntervalRef.current) clearInterval(typingIntervalRef.current)
          typingIntervalRef.current = null
          setIsTyping(false)
        }
      }, 18)
    },
    []
  )

  // ── Handle quick reply click ────────────────────────────────────────────

  const handleQuickReply = useCallback(
    (reply: QuickReply) => {
      if (isTyping) return

      // 1. Add user message
      const userMsg: ChatMessage = {
        id: createId(),
        text: reply.label,
        displayedText: reply.label,
        sender: 'user',
      }

      // 2. Add typing placeholder for bot (will be shown after 500ms delay)
      const botMsgId = createId()
      const botMsg: ChatMessage = {
        id: botMsgId,
        text: reply.response,
        displayedText: '',
        sender: 'bot',
        isTyping: true,
      }

      setMessages((prev) => [...prev, userMsg, botMsg])

      // 3. After 500ms start typing indicator
      setTimeout(() => {
        // We show the "Smartly écrit..." label via isTyping state + empty displayedText
      }, 500)

      // 4. After 800ms total, start typewriter
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) => (m.id === botMsgId ? { ...m, isTyping: false } : m))
        )
        startTypewriter(botMsgId, reply.response)
      }, 800)
    },
    [isTyping, startTypewriter]
  )

  // ── Initialize with welcome message on first view ───────────────────────

  useEffect(() => {
    if (!hasStarted) {
      setHasStarted(true)
      const welcomeId = createId()
      const welcomeMsg: ChatMessage = {
        id: welcomeId,
        text: WELCOME_MESSAGE,
        displayedText: '',
        sender: 'bot',
      }
      setMessages([welcomeMsg])
      startTypewriter(welcomeId, WELCOME_MESSAGE)
    }
  }, [hasStarted, startTypewriter])

  // ── Scroll on message change ────────────────────────────────────────────

  useEffect(() => {
    scrollToBottom()
  }, [messages, typingText, scrollToBottom])

  // ── Cleanup ─────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current)
    }
  }, [])

  // ── Typing dots animation config ────────────────────────────────────────

  const dotVariants = {
    animate: {
      y: [0, -5, 0],
    },
  }

  const dotTransition = (delay: number) => ({
    duration: 0.6,
    repeat: Infinity,
    repeatDelay: 0.2,
    ease: 'easeInOut' as const,
    delay,
  })

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <section className="py-20">
      <div className="max-w-4xl mx-auto px-4">
        {/* ── Heading ──────────────────────────────────────────────────── */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-3">
            Essayez Smartly{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-teal-500">
              maintenant
            </span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Aucune inscription requise
          </p>
        </motion.div>

        {/* ── Chat Container ──────────────────────────────────────────── */}
        <motion.div
          variants={scaleIn}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="max-w-md mx-auto"
        >
          <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            {/* ── WhatsApp Header ──────────────────────────────────────── */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">SA</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm leading-tight">
                    Smartly Assistant
                  </h3>
                  <p className="text-green-100 text-xs">En ligne</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-white/80">
                <button
                  type="button"
                  aria-label="Appeler"
                  className="hover:text-white transition-colors"
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  aria-label="Plus d'options"
                  className="hover:text-white transition-colors"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ── Chat Body ────────────────────────────────────────────── */}
            <div
              ref={chatBodyRef}
              className="bg-[#ECE5DD] dark:bg-slate-800 p-4 space-y-3 min-h-[350px] max-h-[450px] overflow-y-auto scroll-smooth"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(120,120,120,0.4) transparent',
              }}
            >
              {/* Wallpaper pattern */}
              <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none">
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage:
                      'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                  }}
                />
              </div>

              {/* Messages */}
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className={`flex ${
                      message.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`relative max-w-[80%] px-3 py-2 text-sm leading-relaxed whitespace-pre-line ${
                        message.sender === 'user'
                          ? 'bg-[#DCF8C6] dark:bg-green-900/40 text-slate-900 dark:text-green-100 rounded-2xl rounded-tr-sm'
                          : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-sm shadow-sm'
                      }`}
                    >
                      {/* Typing indicator or message content */}
                      {message.isTyping && !message.displayedText ? (
                        <div className="flex items-center gap-1 py-1 px-1">
                          <span className="text-xs text-slate-400 dark:text-slate-500 mr-1">
                            Smartly écrit
                          </span>
                          {[0, 1, 2].map((i) => (
                            <motion.span
                              key={i}
                              className="inline-block w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500"
                              variants={dotVariants}
                              animate="animate"
                              transition={dotTransition(i * 0.15)}
                            />
                          ))}
                        </div>
                      ) : message.displayedText ? (
                        <span>
                          {parseMarkdown(message.displayedText)}
                          {/* Blinking cursor while typing */}
                          {isTyping &&
                            message.id === messages[messages.length - 1]?.id && (
                              <motion.span
                                className="inline-block w-[2px] h-4 ml-0.5 bg-slate-500 dark:bg-slate-400 align-middle"
                                animate={{ opacity: [1, 0] }}
                                transition={{
                                  duration: 0.6,
                                  repeat: Infinity,
                                  repeatType: 'reverse',
                                }}
                              />
                            )}
                        </span>
                      ) : null}

                      {/* Timestamp */}
                      {!message.isTyping && message.displayedText === message.text && (
                        <div className="flex justify-end items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            {new Date().toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {message.sender === 'bot' && (
                            <svg
                              className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500"
                              viewBox="0 0 16 11"
                              fill="currentColor"
                            >
                              <path d="M11.07 0L5.41 5.28 2.36 2.4 0 4.7l5.41 5.19L13.5 2.3z" />
                            </svg>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator (standalone) shown when no typing message yet */}
              {isTyping && messages.length > 0 && messages[messages.length - 1].displayedText && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-white dark:bg-slate-700 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 dark:text-slate-500 mr-1">
                        Smartly écrit
                      </span>
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="inline-block w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500"
                          variants={dotVariants}
                          animate="animate"
                          transition={dotTransition(i * 0.15)}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* ── Quick Reply Buttons ──────────────────────────────────── */}
            <div className="bg-[#F0F0F0] dark:bg-slate-850 border-t border-slate-200 dark:border-slate-700 p-3">
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="flex flex-wrap gap-2"
              >
                {quickReplies.map((reply) => (
                  <motion.button
                    key={reply.id}
                    variants={staggerItem}
                    type="button"
                    onClick={() => handleQuickReply(reply)}
                    disabled={isTyping}
                    className={`
                      bg-white dark:bg-slate-700
                      border border-slate-300 dark:border-slate-600
                      rounded-full px-4 py-2
                      text-sm font-medium text-slate-700 dark:text-slate-300
                      hover:bg-orange-50 dark:hover:bg-orange-900/20
                      hover:border-orange-300 dark:hover:border-orange-500
                      cursor-pointer transition-all duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed
                      disabled:hover:bg-white dark:disabled:hover:bg-slate-700
                      disabled:hover:border-slate-300 dark:disabled:hover:border-slate-600
                      active:scale-95
                    `}
                  >
                    {reply.label}
                  </motion.button>
                ))}
              </motion.div>

              {/* Bottom input area (decorative) */}
              <div className="mt-3 flex items-center gap-2 bg-white dark:bg-slate-700 rounded-full px-4 py-2 border border-slate-200 dark:border-slate-600">
                <span className="flex-1 text-slate-400 dark:text-slate-500 text-sm">
                  Tapez un message...
                </span>
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <Send className="w-4 h-4 text-white -rotate-90" />
                </div>
              </div>
            </div>
          </div>

          {/* ── CTA Below Chat ──────────────────────────────────────────── */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="text-center mt-8"
          >
            <a
              href="https://wa.me/221784858226"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 font-semibold text-lg transition-colors duration-200 group"
            >
              <span>👉 Tester sur votre WhatsApp</span>
              <svg
                className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
