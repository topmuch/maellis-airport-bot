'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Search,
  MessageCircle,
  Bot,
  User,
  Clock,
  BadgeCheck,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

// ─── Types ───────────────────────────────────────────────────────
interface Conversation {
  id: string
  userPhone: string
  userName: string | null
  language: string
  status: string
  lastMessage: string
  messageCount: number
  createdAt: string
  updatedAt: string
}

interface Message {
  id: string
  direction: 'inbound' | 'outbound'
  content: string
  intent?: string | null
  responseTime?: number | null
  createdAt: string
}

// ─── Constants ───────────────────────────────────────────────────
const LANG_LABELS: Record<string, string> = {
  fr: 'FR',
  en: 'EN',
  ar: 'AR',
  wo: 'WO',
}

const LANG_COLORS: Record<string, string> = {
  fr: 'bg-teal-500/15 text-teal-700 border-teal-200',
  en: 'bg-emerald-500/15 text-emerald-700 border-emerald-200',
  ar: 'bg-amber-500/15 text-amber-700 border-amber-200',
  wo: 'bg-orange-500/15 text-orange-700 border-orange-200',
}

const INTENT_COLORS: Record<string, string> = {
  flight_search: 'bg-sky-500/15 text-sky-700 border-sky-200',
  flight_status: 'bg-teal-500/15 text-teal-700 border-teal-200',
  baggage_qr: 'bg-purple-500/15 text-purple-700 border-purple-200',
  lounge_booking: 'bg-amber-500/15 text-amber-700 border-amber-200',
  transport_booking: 'bg-orange-500/15 text-orange-700 border-orange-200',
  payment_help: 'bg-emerald-500/15 text-emerald-700 border-emerald-200',
  emergency: 'bg-red-500/15 text-red-700 border-red-200',
  greeting: 'bg-gray-500/15 text-gray-600 border-gray-200',
  help: 'bg-teal-500/15 text-teal-700 border-teal-200',
  unknown: 'bg-gray-400/15 text-gray-500 border-gray-300',
}

const INTENT_LABELS: Record<string, string> = {
  flight_search: 'Recherche vol',
  flight_status: 'Statut vol',
  baggage_qr: 'QR Bagage',
  lounge_booking: 'Salon',
  transport_booking: 'Transport',
  payment_help: 'Paiement',
  emergency: 'Urgence',
  greeting: 'Salutation',
  help: 'Aide',
  unknown: 'Inconnu',
}

// ─── Mock Data ───────────────────────────────────────────────────
const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-001',
    userPhone: '+221 77 123 45 67',
    userName: 'Amadou Diallo',
    language: 'fr',
    status: 'active',
    lastMessage: 'Quel est le statut du vol AK-304 ?',
    messageCount: 5,
    createdAt: '2024-04-21T11:30:00Z',
    updatedAt: '2024-04-21T11:35:00Z',
  },
  {
    id: 'conv-002',
    userPhone: '+221 78 234 56 78',
    userName: 'Fatou Ndiaye',
    language: 'wo',
    status: 'active',
    lastMessage: 'Naka na book salon VIP bi ?',
    messageCount: 8,
    createdAt: '2024-04-21T10:00:00Z',
    updatedAt: '2024-04-21T11:20:00Z',
  },
  {
    id: 'conv-003',
    userPhone: '+221 76 345 67 89',
    userName: 'Moussa Sow',
    language: 'fr',
    status: 'active',
    lastMessage: 'Je veux un taxi pour la Corniche Ouest',
    messageCount: 4,
    createdAt: '2024-04-21T09:30:00Z',
    updatedAt: '2024-04-21T10:15:00Z',
  },
  {
    id: 'conv-004',
    userPhone: '+221 77 456 78 90',
    userName: null,
    language: 'en',
    status: 'closed',
    lastMessage: 'Thank you for the information!',
    messageCount: 6,
    createdAt: '2024-04-21T08:00:00Z',
    updatedAt: '2024-04-21T09:00:00Z',
  },
  {
    id: 'conv-005',
    userPhone: '+221 78 567 89 01',
    userName: 'Aissatou Ba',
    language: 'fr',
    status: 'active',
    lastMessage: 'Comment payer avec Orange Money ?',
    messageCount: 3,
    createdAt: '2024-04-21T10:45:00Z',
    updatedAt: '2024-04-21T11:00:00Z',
  },
  {
    id: 'conv-006',
    userPhone: '+221 76 678 90 12',
    userName: 'Ibrahim Diop',
    language: 'ar',
    status: 'active',
    lastMessage: 'أين يمكنني العثور على أمتعتي؟',
    messageCount: 2,
    createdAt: '2024-04-21T11:10:00Z',
    updatedAt: '2024-04-21T11:15:00Z',
  },
  {
    id: 'conv-007',
    userPhone: '+221 77 789 01 23',
    userName: 'Mariama Sy',
    language: 'fr',
    status: 'active',
    lastMessage: 'J\'ai perdu mon passeport dans le terminal',
    messageCount: 7,
    createdAt: '2024-04-21T09:00:00Z',
    updatedAt: '2024-04-21T10:30:00Z',
  },
  {
    id: 'conv-008',
    userPhone: '+221 78 890 12 34',
    userName: 'Cheikh Mbaye',
    language: 'fr',
    status: 'closed',
    lastMessage: 'D\'accord, merci pour votre aide !',
    messageCount: 12,
    createdAt: '2024-04-20T14:00:00Z',
    updatedAt: '2024-04-20T16:00:00Z',
  },
  {
    id: 'conv-009',
    userPhone: '+221 76 901 23 45',
    userName: 'Adama Traoré',
    language: 'en',
    status: 'active',
    lastMessage: 'Can I book a lounge for 4 people?',
    messageCount: 2,
    createdAt: '2024-04-21T11:25:00Z',
    updatedAt: '2024-04-21T11:28:00Z',
  },
  {
    id: 'conv-010',
    userPhone: '+221 77 012 34 56',
    userName: 'Kine Diop',
    language: 'wo',
    status: 'active',
    lastMessage: 'Dama bëgg ñaari biir fi teere bi',
    messageCount: 5,
    createdAt: '2024-04-21T10:30:00Z',
    updatedAt: '2024-04-21T11:05:00Z',
  },
]

const MOCK_MESSAGES: Record<string, Message[]> = {
  'conv-001': [
    {
      id: 'msg-001-1',
      direction: 'inbound',
      content: 'Bonjour !',
      intent: 'greeting',
      createdAt: '2024-04-21T11:30:00Z',
    },
    {
      id: 'msg-001-2',
      direction: 'outbound',
      content: 'Bonjour ! 👋 Bienvenue au service d\'assistance de l\'Aéroport International Léopold Sédar Senghor (DSS). Comment puis-je vous aider ?',
      intent: null,
      responseTime: 450,
      createdAt: '2024-04-21T11:30:01Z',
    },
    {
      id: 'msg-001-3',
      direction: 'inbound',
      content: 'Je voudrais connaître le statut du vol AK-304 à destination de Bamako.',
      intent: 'flight_status',
      createdAt: '2024-04-21T11:32:00Z',
    },
    {
      id: 'msg-001-4',
      direction: 'outbound',
      content: '✈️ **Vol AK-304** (Air Sénégal)\n📍 Dakar (DSS) → Bamako (BKO)\n🕐 Départ prévu : 14h30\n🚪 Porte : B5\n📊 Statut : **À l\'heure**\n\nSouhaitez-vous d\'autres informations ?',
      intent: null,
      responseTime: 620,
      createdAt: '2024-04-21T11:32:01Z',
    },
    {
      id: 'msg-001-5',
      direction: 'inbound',
      content: 'Quel est le statut du vol AK-304 ?',
      intent: 'flight_status',
      createdAt: '2024-04-21T11:35:00Z',
    },
  ],
  'conv-002': [
    {
      id: 'msg-002-1',
      direction: 'inbound',
      content: 'Naka la gis salon VIP ?',
      intent: 'greeting',
      createdAt: '2024-04-21T10:00:00Z',
    },
    {
      id: 'msg-002-2',
      direction: 'outbound',
      content: 'Naka la gis ! 🙌 Bienvenue au service d\'assistance de l\'Aéroport DSS. Man na la koy wax?',
      intent: null,
      responseTime: 380,
      createdAt: '2024-04-21T10:00:01Z',
    },
    {
      id: 'msg-002-3',
      direction: 'inbound',
      content: 'Naka na book salon VIP bi ?',
      intent: 'lounge_booking',
      createdAt: '2024-04-21T10:05:00Z',
    },
    {
      id: 'msg-002-4',
      direction: 'outbound',
      content: '🏨 **Salons VIP disponibles** :\n\n1. 🌟 **Salon Teranga** - 25,000 FCFA/personne\n   • Buffet, WiFi, douche\n   • Ouvert 6h-22h\n\n2. ✨ **Salon Espace Afrique** - 35,000 FCFA/personne\n   • Buffet premium, spa, WiFi\n   • Ouvert 5h-23h\n\nSélectionnez un salon pour réserver 👇',
      intent: null,
      responseTime: 510,
      createdAt: '2024-04-21T10:05:01Z',
    },
  ],
  'conv-005': [
    {
      id: 'msg-005-1',
      direction: 'inbound',
      content: 'Bonjour, je veux réserver un transport',
      intent: 'greeting',
      createdAt: '2024-04-21T10:45:00Z',
    },
    {
      id: 'msg-005-2',
      direction: 'outbound',
      content: 'Bonjour ! 🚕 Je peux vous aider à réserver un transport. Voici les options disponibles :\n\n• 🚗 **Berline** - à partir de 15,000 FCFA\n• 🚐 **Minibus** - à partir de 25,000 FCFA\n• 🏎️ **Premium** - à partir de 40,000 FCFA',
      intent: null,
      responseTime: 540,
      createdAt: '2024-04-21T10:45:01Z',
    },
    {
      id: 'msg-005-3',
      direction: 'inbound',
      content: 'Comment payer avec Orange Money ?',
      intent: 'payment_help',
      createdAt: '2024-04-21T11:00:00Z',
    },
  ],
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'À l\'instant'
  if (diffMin < 60) return `Il y a ${diffMin} min`
  if (diffHour < 24) return `Il y a ${diffHour}h`
  return `Il y a ${diffDay}j`
}

function getAvatarColor(phone: string): string {
  const colors = [
    'bg-emerald-600',
    'bg-teal-600',
    'bg-amber-600',
    'bg-orange-600',
    'bg-red-600',
    'bg-pink-600',
    'bg-purple-600',
    'bg-cyan-600',
    'bg-lime-600',
    'bg-rose-600',
  ]
  let hash = 0
  for (let i = 0; i < phone.length; i++) {
    hash = phone.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Component ───────────────────────────────────────────────────
export function ConversationsModule() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchConversations() {
      try {
        const res = await fetch('/api/conversations')
        if (res.ok) {
          const json = await res.json()
          if (json.data && json.data.length > 0) {
            setConversations(json.data)
          } else {
            setConversations(MOCK_CONVERSATIONS)
          }
        } else {
          setConversations(MOCK_CONVERSATIONS)
        }
      } catch {
        setConversations(MOCK_CONVERSATIONS)
      } finally {
        setLoading(false)
      }
    }
    fetchConversations()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSelectConversation = (id: string) => {
    setSelectedId(id)
    setMobileShowChat(true)
    // Load mock messages for the selected conversation
    const loaded = MOCK_MESSAGES[id] || [
      {
        id: `${id}-msg1`,
        direction: 'inbound' as const,
        content:
          conversations.find((c) => c.id === id)?.lastMessage || 'Bonjour',
        intent: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: `${id}-msg2`,
        direction: 'outbound' as const,
        content:
          'Merci pour votre message. Un agent vous aidera bientôt.',
        intent: null,
        responseTime: 400,
        createdAt: new Date().toISOString(),
      },
    ]
    setMessages(loaded)
  }

  const selectedConversation = conversations.find((c) => c.id === selectedId)

  const filteredConversations = conversations.filter((c) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      c.userPhone.toLowerCase().includes(s) ||
      (c.userName && c.userName.toLowerCase().includes(s)) ||
      c.lastMessage.toLowerCase().includes(s)
    )
  })

  const unreadCounts: Record<string, number> = {}
  conversations.forEach((c) => {
    if (c.status === 'active') {
      unreadCounts[c.id] = Math.min(c.messageCount % 4, 5) || 0
    }
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Conversations</h2>
        <p className="text-muted-foreground text-sm">
          Consultation des conversations WhatsApp en temps réel
        </p>
      </div>

      {/* Chat Layout */}
      <Card className="overflow-hidden">
        <CardContent className="flex gap-0 p-0">
          {/* Left Panel - Conversation List */}
          <div
            className={`flex w-full flex-col border-r ${
              mobileShowChat ? 'hidden md:flex md:w-1/3' : 'flex md:w-1/3'
            }`}
          >
            {/* Search */}
            <div className="border-b p-3">
              <div className="relative">
                <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Conversation List */}
            <ScrollArea className="h-[500px] md:h-[600px]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="border-emerald-600 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
                </div>
              ) : (
                <div>
                  {filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`flex w-full items-start gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-muted/50 ${
                        selectedId === conv.id
                          ? 'bg-emerald-50 dark:bg-emerald-950/30'
                          : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${getAvatarColor(
                          conv.userPhone
                        )}`}
                      >
                        {conv.userName
                          ? conv.userName.charAt(0).toUpperCase()
                          : conv.userPhone.slice(-2)}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">
                            {conv.userName || conv.userPhone}
                          </p>
                          <span className="text-muted-foreground shrink-0 text-xs">
                            {formatRelativeTime(conv.updatedAt)}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-0.5 truncate text-xs">
                          {conv.lastMessage}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <Badge
                            className={`text-[10px] px-1.5 py-0 ${
                              LANG_COLORS[conv.language] || ''
                            }`}
                            variant="outline"
                          >
                            {LANG_LABELS[conv.language] || conv.language}
                          </Badge>
                          {unreadCounts[conv.id] > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
                              {unreadCounts[conv.id]}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                  {filteredConversations.length === 0 && (
                    <div className="text-muted-foreground py-12 text-center text-sm">
                      Aucune conversation trouvée
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right Panel - Chat Messages */}
          <div
            className={`flex flex-1 flex-col ${
              mobileShowChat ? 'flex' : 'hidden md:flex'
            }`}
          >
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center gap-3 border-b px-4 py-3">
                  {/* Mobile back button */}
                  <button
                    onClick={() => setMobileShowChat(false)}
                    className="text-muted-foreground hover:text-foreground md:hidden"
                  >
                    ←
                  </button>
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${getAvatarColor(
                      selectedConversation.userPhone
                    )}`}
                  >
                    {selectedConversation.userName
                      ? selectedConversation.userName.charAt(0).toUpperCase()
                      : selectedConversation.userPhone.slice(-2)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {selectedConversation.userName || selectedConversation.userPhone}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {selectedConversation.userPhone}
                    </p>
                  </div>
                  <Badge
                    className={
                      LANG_COLORS[selectedConversation.language] || ''
                    }
                    variant="outline"
                  >
                    {LANG_LABELS[selectedConversation.language] ||
                      selectedConversation.language}
                  </Badge>
                  {selectedConversation.status === 'active' && (
                    <Badge
                      className="bg-emerald-500/15 text-emerald-700 border-emerald-200"
                      variant="outline"
                    >
                      <BadgeCheck className="mr-1 h-3 w-3" />
                      Actif
                    </Badge>
                  )}
                </div>

                {/* Messages */}
                <ScrollArea className="h-[430px] md:h-[530px]">
                  <div className="space-y-3 p-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.direction === 'inbound'
                            ? 'justify-start'
                            : 'justify-end'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                            msg.direction === 'inbound'
                              ? 'rounded-bl-md bg-muted text-foreground'
                              : 'rounded-br-md bg-emerald-600 text-white'
                          }`}
                        >
                          <div className="text-sm whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </div>
                          <div
                            className={`mt-1.5 flex items-center gap-2 ${
                              msg.direction === 'inbound'
                                ? 'text-muted-foreground'
                                : 'text-emerald-100'
                            }`}
                          >
                            <span className="text-[10px]">
                              {formatMessageTime(msg.createdAt)}
                            </span>
                            {msg.intent && (
                              <Badge
                                className={`text-[9px] px-1 py-0 ${
                                  INTENT_COLORS[msg.intent] ||
                                  'bg-gray-100 text-gray-500'
                                }`}
                                variant="outline"
                              >
                                {INTENT_LABELS[msg.intent] || msg.intent}
                              </Badge>
                            )}
                            {msg.responseTime && (
                              <span className="flex items-center gap-0.5 text-[10px]">
                                <Clock className="h-2.5 w-2.5" />
                                {msg.responseTime}ms
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-20">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <MessageCircle className="text-muted-foreground h-8 w-8" />
                </div>
                <p className="text-muted-foreground text-sm">
                  Sélectionnez une conversation
                </p>
                <p className="text-muted-foreground text-xs">
                  Choisissez une conversation dans la liste pour afficher les messages
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
