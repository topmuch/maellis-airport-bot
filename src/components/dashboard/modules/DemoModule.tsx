'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Plane,
  MapPin,
  QrCode,
  Sofa,
  Car,
  AlertTriangle,
  Sparkles,
  Send,
  Bot,
  User,
  Phone,
  Mail,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

// ============================================================================
// Types
// ============================================================================

interface ChatMessage {
  id: string
  role: 'user' | 'bot'
  content: string
  intent?: string
  confidence?: number
  timestamp: Date
}

interface SimulatedResponse {
  text: string
  intent: string
  confidence: number
}

// ============================================================================
// Simulated Bot Response Engine
// ============================================================================

function simulateBotResponse(message: string): SimulatedResponse {
  const lower = message.toLowerCase().trim()

  // Greeting
  if (
    /^(bonjour|salut|hello|hi|good morning|bonsoir|na nga def|salam)/.test(lower)
  ) {
    return {
      text: `✈️ *Bienvenue à MAELLIS — Aéroport de Dakar* ✈️\n\nBonjour ! Comment puis-je vous aider aujourd'hui ?\n\nVous pouvez me demander :\n• ✈️ Rechercher un vol\n• 📍 Statut d'un vol\n• 🧳 QR code bagages\n• 🛋️ Réservation lounge\n• 🚕 Transport / Taxi\n• 💳 Aide paiement\n\nTapez *aide* pour voir toutes les options !`,
      intent: 'greeting',
      confidence: 0.98,
    }
  }

  // Help
  if (/^(aide|help|menu|que peux|what can|comment ça marche)/.test(lower)) {
    return {
      text: `📋 *MAELLIS — Centre d'Aide*\n\nVoici ce que je peux faire pour vous :\n\n✈️ *Recherche de vols*\n   « Je cherche un vol pour Abidjan »\n   « Vol Dakar Bamako demain »\n\n🔍 *Statut de vol*\n   « Statut du vol 2S221 »\n\n🧳 *Bagages*\n   « QR code bagage »\n\n🛋️ *Salon VIP / Lounge*\n   « Réserver salon VIP »\n\n🚕 *Transport*\n   « Commander un taxi »\n   « Navette aéroport »\n\n💳 *Paiement*\n   « Problème de paiement »\n\n🇬🇧 *English? Just type in English!*\n🇸🇳 *Wolof? Foy woor Wolof rek!*`,
      intent: 'help',
      confidence: 0.96,
    }
  }

  // Flight status
  if (/statut|status/.test(lower) && /vol|flight/.test(lower)) {
    const flightMatch = lower.match(/\b([a-z]?\d{2,5})\b/i)
    const flightNum = flightMatch ? flightMatch[1].toUpperCase() : 'AF123'
    return {
      text: `🔍 *Statut de Vol* — AviationStack API\n\n✈️ *Air France ${flightNum}*\n🛫 CDG Paris → 🛬 DSS Dakar\n\n📋 *Statut:* 🟢 En vol\n⏱️ *Retard:* 0 minutes\n\n🕐 Départ: 08:45 CET\n🕐 Arrivée: 12:30 GMT\n🚪 Porte: B42\n🏢 Terminal: 2E\n\n💡 Les informations sont mises à jour en temps réel.`,
      intent: 'flight_status',
      confidence: 0.94,
    }
  }

  // Flight search
  if (/cherche|recherch|search|vol|flight/.test(lower) && /(dakar|abidjan|bamako|lagos|accra|ouaga|nairobi|casablanca)/.test(lower)) {
    return {
      text: `✈️ *Résultats de Vol* — AviationStack API\n\n🛫 DSS → 🛬 ABJ\n\n1. ✈️ *Air Sénégal 2S221* 🟢\n   🛫 Départ: 07:30 | Porte: A12\n   🛬 Arrivée: 09:45 | Porte: C03\n   📋 Statut: ACTIVE\n\n2. ✈️ *Air Côte d'Ivoire HF521* 🟢\n   🛫 Départ: 10:15 | Porte: A08\n   🛬 Arrivée: 12:30 | Porte: C05\n   📋 Statut: ACTIVE\n\n3. ✈️ *RwandAir WB920* ⚠️\n   🛫 Départ: 14:00 | Porte: B15\n   🛬 Arrivée: 16:45 (⏱️ +25min) | Porte: C01\n   📋 Statut: DELAYED\n\n💡 Tapez le numéro de vol pour plus de détails.\n🔄 Pour actualiser, renvoyez votre recherche.`,
      intent: 'flight_search',
      confidence: 0.92,
    }
  }

  // Baggage QR
  if (/bagage|baggage|qr|étiquette/.test(lower)) {
    return {
      text: `🧳 *Service Bagages — MAELLIS*\n\n📱 *QR Code Bagage*\nObtenez votre code QR de bagage directement sur WhatsApp.\nScannez-le aux bornes pour un dépôt rapide.\n\n📍 *Suivi de Bagage*\nSuivez votre bagage en temps réel.\n\n🇫🇷 *Consignes :*\n• Poids max: 23kg (économique), 32kg (affaires)\n• Dimensions: 158cm (L+I+H)\n• Objets interdits dans les bagages en soute\n\n✅ *Votre QR Code a été généré !*\n🔖 Token: JWT_b7f2a...x9k4m\n📅 Valide 7 jours à compter d'aujourd'hui\n📎 Scannez aux bornes automatiques du terminal`,
      intent: 'baggage',
      confidence: 0.93,
    }
  }

  // Transport / Taxi
  if (/taxi|transport|navette|uber|bolt|vtc|voiture/.test(lower)) {
    return {
      text: `🚕 *Service de Transport — MAELLIS*\n\nComment souhaitez-vous voyager ?\n\n🚖 *Taxi / VTC*\n• Taxi officiel aéroport: à partir de 5 000 FCFA\n  🔗 Réserver maintenant\n• Uber / Bolt disponibles\n• Réservation à l'avance possible\n\n🚌 *Navette Aéroport*\n• Navette Dakar centre: 2 000 FCFA\n  🔗 Réserver: navette\n• Navette hôtels: 3 000 FCFA\n• Départ toutes les 30 minutes\n\n🚗 *Location de Voiture*\n• Hertz, Avis, Europcar au terminal\n• Réservation en ligne disponible\n\n🇬🇧 *Transport services from Dakar airport available 24/7!*`,
      intent: 'transport',
      confidence: 0.91,
    }
  }

  // Payment
  if (/paiement|payment|payer|pay|orange money|wave|cinetpay|factur/.test(lower)) {
    return {
      text: `💳 *Aide Paiement — MAELLIS*\n\nNous acceptons plusieurs modes de paiement :\n\n• 📱 Orange Money — Paiement mobile rapide\n• 🌊 Wave — Transfert instantané\n• 💳 Carte Bancaire — Visa, Mastercard\n• 💵 MTN Mobile Money — Disponible bientôt\n\n🇫🇷 *En cas de problème :*\n• Vérifiez vos informations de carte\n• Assurez-vous d'avoir les fonds nécessaires\n• Contactez votre banque si le paiement est refusé\n\n📞 *Support :* +221 33 XXX XXXX\n📧 *Email :* support@maellis.sn`,
      intent: 'payment',
      confidence: 0.90,
    }
  }

  // Emergency
  if (/urgence|emergency|sos|secours|ambulance|pompier|police|help me|au secours/.test(lower)) {
    return {
      text: `🚨 *URGENCE — AÉROPORT DE DAKAR* 🚨\n\n🇫🇷 *Numéros d'urgence :*\n• 🚑 SAMU / Ambulance: *15*\n• 🚓 Police: *17*\n• 🚒 Pompiers: *18*\n• ✈️ Sécurité aéroport: +221 33 869 00 00\n\n🇬🇧 *Emergency Numbers:*\n• 🚑 Ambulance: *15*\n• 🚓 Police: *17*\n• 🚒 Fire: *18*\n• ✈️ Airport Security: +221 33 869 00 00\n\n⏱️ *L'aéroport dispose d'un service médical 24h/24*\n📍 *Bureau d'information : Hall Arrivées, niveau 0*`,
      intent: 'emergency',
      confidence: 0.99,
    }
  }

  // Lounge
  if (/salon|lounge|vip|premium/.test(lower)) {
    return {
      text: `🛋️ *Salon VIP — Aéroport de Dakar*\n\nBienvenue dans notre espace premium !\n\n🌟 *Équipements :*\n• 🍽️ Restauration et boissons\n• 📶 WiFi haut débit\n• 💺 Espaces confortables\n• 🚿 Douches\n• 📺 Ecrans de divertissement\n• 💼 Espaces de travail\n\n💰 *Tarifs :*\n• Accès 3h: 25 000 FCFA\n• Accès journée: 40 000 FCFA\n• Membre MAELLIS+: Gratuit\n\n💳 Paiement: Orange Money, Wave, Carte bancaire`,
      intent: 'lounge',
      confidence: 0.92,
    }
  }

  // Fallback
  return {
    text: `🤔 *Désolé, je n'ai pas compris votre demande.*\n\n🇫🇷 Je suis l'assistant MAELLIS. Voici ce que je peux faire :\n🇬🇧 Sorry, I didn't understand. Here's what I can help with:\n\n• ✈️ Rechercher un vol / Search flights\n• 📍 Statut de vol / Flight status\n• 🧳 QR code bagage / Baggage QR\n• 🛋️ Salon VIP / VIP Lounge\n• 🚕 Transport / Transport\n• 💳 Paiement / Payment\n\nTapez *aide* ou *help* pour plus d'options !`,
    intent: 'unknown',
    confidence: 0.45,
  }
}

// ============================================================================
// Feature Cards Data
// ============================================================================

const featureCards = [
  {
    icon: Plane,
    title: 'Recherche de Vols',
    description: 'AviationStack en temps réel',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
  },
  {
    icon: MapPin,
    title: 'Statut de Vol',
    description: 'Portes, terminaux, retards',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    icon: QrCode,
    title: 'QR Code Bagage',
    description: 'JWT sécurisé, 7 jours',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  {
    icon: Sofa,
    title: 'Salon VIP',
    description: 'Réservation avec paiement',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    icon: Car,
    title: 'Transport',
    description: 'Taxi, navette, VTC',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  {
    icon: AlertTriangle,
    title: 'Urgences',
    description: 'SOS 24h/24',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
]

// ============================================================================
// Tech Stack Data
// ============================================================================

const techStack = [
  'Next.js 16 + Tailwind CSS',
  'Bun Runtime',
  'Meta WhatsApp Cloud API',
  'Groq LLM (Llama-3)',
  'AviationStack API',
  'CinetPay (Orange Money / Wave)',
  'JWT-Signed QR Codes',
  '4 Langues: FR, EN, Wolof, Arabe',
]

// ============================================================================
// Example Buttons
// ============================================================================

const exampleButtons = [
  'Statut vol AF123',
  'Chercher vol Dakar Abidjan',
  'QR bagage',
  'Taxi aéroport',
  'Paiement',
  'Urgence SOS',
]

// ============================================================================
// Intent Badge Color
// ============================================================================

function getIntentColor(intent: string) {
  switch (intent) {
    case 'greeting':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-800/30 dark:text-orange-400'
    case 'help':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    case 'flight_status':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400'
    case 'flight_search':
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400'
    case 'baggage':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
    case 'transport':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    case 'payment':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
    case 'emergency':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    case 'lounge':
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function DemoModule() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'bot',
      content:
        '✈️ *Bienvenue à MAELLIS — Aéroport de Dakar* ✈️\n\nBonjour ! Je suis votre assistant voyage. Comment puis-je vous aider aujourd\'hui ?\n\nEssayez une des commandes ci-dessous pour voir mes capacités !',
      intent: 'greeting',
      confidence: 1.0,
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = (text?: string) => {
    const message = text || inputValue.trim()
    if (!message) return

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputValue('')
    setIsTyping(true)

    // Simulate bot typing delay
    setTimeout(() => {
      const response = simulateBotResponse(message)
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'bot',
        content: response.text,
        intent: response.intent,
        confidence: response.confidence,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMsg])
      setIsTyping(false)
    }, 800 + Math.random() * 700)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleReset = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'bot',
        content:
          '✈️ *Bienvenue à MAELLIS — Aéroport de Dakar* ✈️\n\nBonjour ! Je suis votre assistant voyage. Comment puis-je vous aider aujourd\'hui ?\n\nEssayez une des commandes ci-dessous pour voir mes capacités !',
        intent: 'greeting',
        confidence: 1.0,
        timestamp: new Date(),
      },
    ])
  }

  const renderMessageContent = (content: string) => {
    // Simple WhatsApp-style formatting
    const parts = content.split(/(\*[^*]+\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <strong key={i} className="font-semibold">
            {part.slice(1, -1)}
          </strong>
        )
      }
      return part
    })
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 via-white to-blue-50 dark:from-orange-900/30 dark:via-background dark:to-blue-900/20">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Badge className="bg-orange-500 px-3 py-1 text-sm text-white hover:bg-orange-600">
                  MAELLIS
                </Badge>
                <Badge variant="outline" className="border-orange-300 text-orange-600">
                  v1.0.0
                </Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl dark:text-white">
                Démonstration MAELLIS
              </h1>
              <p className="max-w-2xl text-gray-600 dark:text-gray-400">
                Explorez les capacités du bot MAELLIS grâce à cette démonstration interactive.
                Testez les commandes, découvrez les fonctionnalités et visualisez les réponses
                en temps réel.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-orange-500" />
              <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                IA Propulsée par Groq Llama-3
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Chat Demo Panel */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Chat Panel */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-3 items-center justify-center">
                  <div className="size-2 rounded-full bg-orange-500 animate-pulse" />
                </div>
                <CardTitle className="text-lg">Chat Interactif</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset} className="text-xs">
                Réinitialiser
              </Button>
            </div>
            <CardDescription>
              Simulez une conversation avec le bot MAELLIS via WhatsApp
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            {/* Messages Area */}
            <div
              ref={scrollRef}
              className="flex flex-col gap-3 overflow-y-auto p-4"
              style={{ maxHeight: 420 }}
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                      msg.role === 'bot'
                        ? 'bg-orange-100 dark:bg-orange-800/40'
                        : 'bg-gray-200 dark:bg-gray-800'
                    }`}
                  >
                    {msg.role === 'bot' ? (
                      <Bot className="size-4 text-orange-500 dark:text-orange-400" />
                    ) : (
                      <User className="size-4 text-gray-600 dark:text-gray-400" />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-orange-500 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 rounded-bl-md'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{renderMessageContent(msg.content)}</div>
                    {/* Intent & Confidence Badge for bot messages */}
                    {msg.role === 'bot' && msg.intent && msg.confidence !== undefined && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 ${getIntentColor(msg.intent)}`}
                        >
                          {msg.intent}
                        </Badge>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                          {Math.round(msg.confidence * 100)}%
                        </span>
                      </div>
                    )}
                    <div
                      className={`mt-1 text-[10px] ${
                        msg.role === 'user'
                          ? 'text-orange-200'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      {msg.timestamp.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex gap-2">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-800/40">
                    <Bot className="size-4 text-orange-500 dark:text-orange-400" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3 dark:bg-gray-800">
                    <div className="flex gap-1">
                      <div className="size-2 animate-bounce rounded-full bg-gray-400 dark:bg-gray-500 [animation-delay:0ms]" />
                      <div className="size-2 animate-bounce rounded-full bg-gray-400 dark:bg-gray-500 [animation-delay:150ms]" />
                      <div className="size-2 animate-bounce rounded-full bg-gray-400 dark:bg-gray-500 [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <Separator />
            <div className="p-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Tapez votre message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isTyping}
                  className="flex-1"
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={isTyping || !inputValue.trim()}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Example Buttons Panel */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Exemples de Commandes</CardTitle>
            <CardDescription>
              Cliquez pour tester les différentes fonctionnalités du bot
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-2 p-4">
            {exampleButtons.map((btn, i) => (
              <Button
                key={i}
                variant="outline"
                className="w-full justify-start gap-2 text-left font-normal hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30"
                onClick={() => handleSend(btn)}
                disabled={isTyping}
              >
                {i === 0 && <MapPin className="size-4 shrink-0 text-sky-500" />}
                {i === 1 && <Plane className="size-4 shrink-0 text-cyan-500" />}
                {i === 2 && <QrCode className="size-4 shrink-0 text-amber-500" />}
                {i === 3 && <Car className="size-4 shrink-0 text-orange-500" />}
                {i === 4 && (
                  <svg
                    className="size-4 shrink-0 text-purple-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                )}
                {i === 5 && <AlertTriangle className="size-4 shrink-0 text-red-500" />}
                {btn}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Feature Cards Grid */}
      <div>
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
          Fonctionnalités
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((card) => {
            const Icon = card.icon
            return (
              <Card
                key={card.title}
                className="group transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex size-10 items-center justify-center rounded-lg ${card.bgColor}`}
                    >
                      <Icon className={`size-5 ${card.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {card.title}
                      </h3>
                      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                        {card.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Tech Stack Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Stack Technologique</CardTitle>
          <CardDescription>
            Technologies utilisées par la plateforme MAELLIS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {techStack.map((tech) => (
              <div
                key={tech}
                className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 dark:border-orange-700 dark:bg-orange-900/30"
              >
                <CheckCircle className="size-4 shrink-0 text-orange-500" />
                <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                  {tech}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact CTA */}
      <Card className="border-orange-200 bg-gradient-to-r from-orange-500 to-blue-600">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col items-center text-center md:flex-row md:text-left md:justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white md:text-2xl">
                Intéressé par MAELLIS ?
              </h2>
              <p className="text-orange-100">
                Contactez-nous pour une démonstration personnalisée
              </p>
            </div>
            <div className="mt-4 flex flex-col gap-2 md:mt-0 md:items-end">
              <div className="flex items-center gap-2 text-white">
                <Mail className="size-4" />
                <span className="text-sm">contact@maellis.sn</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <Phone className="size-4" />
                <span className="text-sm">+221 33 869 00 00</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
