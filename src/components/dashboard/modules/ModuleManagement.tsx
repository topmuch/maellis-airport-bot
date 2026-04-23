'use client'

import React, { useState } from 'react'
import {
  Puzzle,
  BarChart3,
  Clock,
  Plane,
  QrCode,
  Crown,
  Car,
  CreditCard,
  ShieldAlert,
  MessageSquare,
  BookOpen,
  Play,
  FlaskConical,
  Users,
  Upload,
  MapPin,
  Save,
  Building2,
  LayoutDashboard,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────

interface ModuleItem {
  id: string
  name: string
  description: string
  icon: React.ElementType
  active: boolean
  usage: number
}

interface BetaFeature {
  id: string
  name: string
  description: string
  status: 'Bêta' | 'En Production' | 'Désactivé'
  enabled: boolean
  details: string
}

interface AirportConfig {
  code: string
  name: string
  city: string
  country: string
  timezone: string
  primaryLang: string
  supportedLangs: string[]
  whatsappNumber: string
  welcomeMessage: string
}

// ─── Mock Data: Modules ──────────────────────────────────────────

const MODULES_DATA: ModuleItem[] = [
  { id: 'overview', name: 'Vue d\'ensemble', description: 'Tableau de bord principal', icon: LayoutDashboard, active: true, usage: 100 },
  { id: 'flights', name: 'Vols', description: 'Recherche et suivi des vols', icon: Plane, active: true, usage: 95 },
  { id: 'baggage', name: 'Bagages QR', description: 'Gestion des bagages', icon: QrCode, active: true, usage: 78 },
  { id: 'lounge', name: 'Salles VIP', description: 'Réservation salons VIP', icon: Crown, active: true, usage: 62 },
  { id: 'transport', name: 'Transport', description: 'Réservation taxi/shuttle', icon: Car, active: true, usage: 85 },
  { id: 'payments', name: 'Paiements', description: 'Suivi des paiements', icon: CreditCard, active: true, usage: 91 },
  { id: 'emergency', name: 'Urgences', description: 'Gestion des alertes SOS', icon: ShieldAlert, active: true, usage: 100 },
  { id: 'conversations', name: 'Conversations', description: 'Historique des conversations', icon: MessageSquare, active: true, usage: 88 },
  { id: 'analytics', name: 'Analytics', description: 'Statistiques avancées', icon: BarChart3, active: true, usage: 72 },
  { id: 'documentation', name: 'Documentation', description: 'Guide d\'utilisation', icon: BookOpen, active: true, usage: 45 },
  { id: 'demo', name: 'Démonstration', description: 'Mode démo interactif', icon: Play, active: false, usage: 0 },
]

// ─── Mock Data: Beta Features ────────────────────────────────────

const BETA_FEATURES_DATA: BetaFeature[] = [
  {
    id: 'advanced-ai',
    name: 'IA Conversationnelle Avancée',
    description: 'Réponses contextuelles multi-tours avec mémoire',
    status: 'Bêta',
    enabled: true,
    details: 'Cette fonctionnalité utilise un modèle de langage avancé avec une mémoire de conversation persistante. Le bot peut maintenir un contexte sur plusieurs échanges, se souvenir des préférences du passager, et fournir des réponses plus personnalisées et pertinentes. Compatible avec les modèles Groq Llama-3-70B et supérieurs.',
  },
  {
    id: 'card-payment',
    name: 'Paiement par Carte Bancaire',
    description: 'Intégration Stripe pour les réservations',
    status: 'Bêta',
    enabled: false,
    details: 'Intégration complète de Stripe pour les paiements par carte bancaire Visa et Mastercard. Supporte les paiements en FCFA, EUR et USD. Inclut la gestion des remboursements, les webhooks de confirmation et la conformité PCI DSS. Nécessite un compte Stripe Business vérifié.',
  },
  {
    id: 'voice-recognition',
    name: 'Reconnaissance Vocale',
    description: 'Transcription et réponse vocale en temps réel',
    status: 'Bêta',
    enabled: true,
    details: 'Transcription vocale en temps réel des messages audio WhatsApp en français, anglais, wolof et arabe. Réponse vocale automatique via synthèse vocale neuronale. Supporte les accents africains francophones avec une précision de 92%. Latence moyenne de 1.5 secondes.',
  },
  {
    id: 'auto-translate',
    name: 'Traduction Automatique',
    description: 'Traduction instantanée 12 langues',
    status: 'En Production',
    enabled: true,
    details: 'Traduction automatique bidirectionnelle entre 12 langues : français, anglais, wolof, arabe, espagnol, portugais, mandarin, haoussa, yoruba, bambara, swahili et amharique. Utilise un modèle neuronal spécialisé pour les contextes aéroportuaires. Temps de traduction moyen : 200ms.',
  },
  {
    id: 'sentiment',
    name: 'Analyse Sentiment',
    description: 'Détection d\'émotion dans les messages',
    status: 'Bêta',
    enabled: false,
    details: 'Analyse du sentiment et des émotions dans les messages des passagers en temps réel. Détecte 5 émotions : satisfait, neutre, confus, frustré, en colère. Permet une escalade automatique des messages négatifs vers un agent humain. Intégration avec le module Urgences pour les cas critiques.',
  },
  {
    id: 'multimodal-chat',
    name: 'Chat Multimodal',
    description: 'Support images et documents dans les conversations',
    status: 'Bêta',
    enabled: true,
    details: 'Le bot peut désormais recevoir et analyser des images (cartes d\'embarcation, passeports, reçus) et des documents (PDF, billets) envoyés par les passagers. Utilise la vision par IA pour extraire les informations pertinentes : numéro de vol, nom du passager, date de vol, siège, etc.',
  },
]

// ─── Mock Data: Airports ─────────────────────────────────────────

const AIRPORTS_CONFIG: Record<string, AirportConfig> = {
  AIBD: {
    code: 'AIBD',
    name: 'Aéroport International Blaise Diagne',
    city: 'Dakar',
    country: 'Sénégal',
    timezone: 'GMT',
    primaryLang: 'Français',
    supportedLangs: ['Français', 'English', 'Wolof'],
    whatsappNumber: '+221 77 123 45 67',
    welcomeMessage: 'Bienvenue à l\'Aéroport International Blaise Diagne de Dakar ! 🇸🇳\n\nJe suis MAELLIS, votre assistant aéroport intelligent. Je peux vous aider avec :\n\n✈️ Rechercher un vol\n📦 Vérifier un bagage QR\n🚗 Réserver un transport\n👑 Réserver un salon VIP\n💳 Suivre un paiement\n🆘 Signaler une urgence\n\nComment puis-je vous aider aujourd\'hui ?',
  },
  CKY: {
    code: 'CKY',
    name: 'Aéroport international de Conakry',
    city: 'Conakry',
    country: 'Guinée',
    timezone: 'GMT',
    primaryLang: 'Français',
    supportedLangs: ['Français', 'English', 'Arabe'],
    whatsappNumber: '+224 621 11 22 33',
    welcomeMessage: 'Bienvenue à l\'Aéroport international de Conakry ! 🇬🇳\n\nJe suis MAELLIS, votre assistant aéroport. Comment puis-je vous aider ?\n\n✈️ Vols • 🚗 Transport • 💳 Paiements',
  },
  ABJ: {
    code: 'ABJ',
    name: 'Aéroport Félix Houphouët-Boigny',
    city: 'Abidjan',
    country: 'Côte d\'Ivoire',
    timezone: 'GMT',
    primaryLang: 'Français',
    supportedLangs: ['Français', 'English', 'Espagnol'],
    whatsappNumber: '+225 07 44 55 66 77',
    welcomeMessage: 'Bienvenue à l\'Aéroport Félix Houphouët-Boigny d\'Abidjan ! 🇨🇮\n\nJe suis MAELLIS, votre assistant aéroport intelligent. Que puis-je faire pour vous ?\n\n✈️ Vols • 📦 Bagages • 🚗 Transport',
  },
  LOS: {
    code: 'LOS',
    name: 'Aéroport international Murtala Muhammed',
    city: 'Lagos',
    country: 'Nigeria',
    timezone: 'GMT+1',
    primaryLang: 'English',
    supportedLangs: ['English', 'Français', 'Arabe'],
    whatsappNumber: '+234 801 234 5678',
    welcomeMessage: 'Welcome to Murtala Muhammed International Airport, Lagos! 🇳🇬\n\nI am MAELLIS, your intelligent airport assistant. How can I help you today?\n\n✈️ Flights • 📦 Baggage • 🚗 Transport • 💳 Payments',
  },
}

// ─── KPI Card Component ──────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  borderColor,
  iconBgColor,
  iconColor,
  valueColor,
}: {
  icon: React.ElementType
  label: string
  value: string
  borderColor: string
  iconBgColor: string
  iconColor: string
  valueColor: string
}) {
  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBgColor}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground truncate text-xs">{label}</p>
          <p className={`text-xl font-bold ${valueColor}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Tab 1: Modules ──────────────────────────────────────────────

function ModulesTab() {
  const [modules, setModules] = useState<ModuleItem[]>(MODULES_DATA)

  const activeCount = modules.filter((m) => m.active).length
  const totalCount = modules.length
  const globalUsage = Math.round(
    modules.reduce((sum, m) => sum + m.usage, 0) / totalCount
  )

  const handleToggle = (id: string) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const newActive = !m.active
          const newUsage = newActive ? Math.floor(Math.random() * 30) + 50 : 0
          toast.success(
            newActive
              ? `Module "${m.name}" activé`
              : `Module "${m.name}" désactivé`
          )
          return { ...m, active: newActive, usage: newUsage }
        }
        return m
      })
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          icon={Puzzle}
          label="Modules Actifs"
          value={`${activeCount}/${totalCount}`}
          borderColor="border-l-emerald-500"
          iconBgColor="bg-emerald-500/10"
          iconColor="text-emerald-600 dark:text-emerald-400"
          valueColor="text-emerald-600 dark:text-emerald-400"
        />
        <KpiCard
          icon={BarChart3}
          label="Utilisation Globale"
          value={`${globalUsage}%`}
          borderColor="border-l-sky-500"
          iconBgColor="bg-sky-500/10"
          iconColor="text-sky-600 dark:text-sky-400"
          valueColor="text-sky-600 dark:text-sky-400"
        />
        <KpiCard
          icon={Clock}
          label="Dernier Changement"
          value="il y a 3j"
          borderColor="border-l-amber-500"
          iconBgColor="bg-amber-500/10"
          iconColor="text-amber-600 dark:text-amber-400"
          valueColor="text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* Module Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((mod) => {
          const Icon = mod.icon
          return (
            <Card
              key={mod.id}
              className={`transition-all hover:shadow-md ${
                mod.active ? '' : 'opacity-70'
              }`}
            >
              <CardContent className="p-4 space-y-3">
                {/* Top row: icon + name + toggle */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        mod.active
                          ? 'bg-orange-500/10'
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${
                          mod.active
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-gray-400'
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{mod.name}</p>
                      <p className="text-muted-foreground text-xs truncate">
                        {mod.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={mod.active}
                    onCheckedChange={() => handleToggle(mod.id)}
                  />
                </div>

                {/* Status badge + usage */}
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={
                      mod.active
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                    }
                  >
                    {mod.active ? 'Actif' : 'Inactif'}
                  </Badge>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Progress
                      value={mod.usage}
                      className="h-1.5 flex-1"
                    />
                    <span className="text-muted-foreground text-xs shrink-0">
                      {mod.usage}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tab 2: Configuration Aéroport ───────────────────────────────

function AirportConfigTab() {
  const [selectedAirport, setSelectedAirport] = useState('AIBD')
  const [saving, setSaving] = useState(false)

  const config = AIRPORTS_CONFIG[selectedAirport]

  const [name, setName] = useState(config.name)
  const [iataCode, setIataCode] = useState(config.code)
  const [cityCountry, setCityCountry] = useState(`${config.city}, ${config.country}`)
  const [timezone, setTimezone] = useState(config.timezone)
  const [primaryLang, setPrimaryLang] = useState(config.primaryLang)
  const [supportedLangs, setSupportedLangs] = useState<string[]>(config.supportedLangs)
  const [whatsappNumber, setWhatsappNumber] = useState(config.whatsappNumber)
  const [welcomeMessage, setWelcomeMessage] = useState(config.welcomeMessage)

  const handleAirportChange = (airportCode: string) => {
    setSelectedAirport(airportCode)
    const cfg = AIRPORTS_CONFIG[airportCode]
    setName(cfg.name)
    setIataCode(cfg.code)
    setCityCountry(`${cfg.city}, ${cfg.country}`)
    setTimezone(cfg.timezone)
    setPrimaryLang(cfg.primaryLang)
    setSupportedLangs(cfg.supportedLangs)
    setWhatsappNumber(cfg.whatsappNumber)
    setWelcomeMessage(cfg.welcomeMessage)
  }

  const toggleSupportedLang = (lang: string) => {
    setSupportedLangs((prev) =>
      prev.includes(lang)
        ? prev.filter((l) => l !== lang)
        : [...prev, lang]
    )
  }

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      toast.success(`Configuration de ${name} sauvegardée avec succès`)
    }, 1000)
  }

  const allSupportedLangs = ['Français', 'English', 'Wolof', 'Arabe', 'Espagnol']

  return (
    <div className="space-y-6">
      {/* Airport Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Building2 className="h-5 w-5 text-orange-500" />
            <Label className="font-medium text-sm">Sélectionner un aéroport</Label>
          </div>
          <Select value={selectedAirport} onValueChange={handleAirportChange}>
            <SelectTrigger className="w-full sm:w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AIBD">
                AIBD — Aéroport International Blaise Diagne (Dakar, Sénégal)
              </SelectItem>
              <SelectItem value="CKY">
                CKY — Aéroport international de Conakry (Conakry, Guinée)
              </SelectItem>
              <SelectItem value="ABJ">
                ABJ — Aéroport Félix Houphouët-Boigny (Abidjan, Côte d&apos;Ivoire)
              </SelectItem>
              <SelectItem value="LOS">
                LOS — Aéroport international Murtala Muhammed (Lagos, Nigeria)
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-orange-500" />
            Configuration de {name}
          </CardTitle>
          <CardDescription>
            Paramètres spécifiques à cet aéroport
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="airport-name">Nom de l&apos;aéroport</Label>
              <Input
                id="airport-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="airport-iata">Code IATA</Label>
              <Input
                id="airport-iata"
                value={iataCode}
                onChange={(e) => setIataCode(e.target.value)}
                maxLength={3}
                className="w-full sm:w-32"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="airport-location">Ville / Pays</Label>
            <Input
              id="airport-location"
              value={cityCountry}
              onChange={(e) => setCityCountry(e.target.value)}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fuseau Horaire</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GMT">GMT (UTC±0)</SelectItem>
                  <SelectItem value="GMT+1">GMT+1 (WAT)</SelectItem>
                  <SelectItem value="GMT+2">GMT+2 (CAT)</SelectItem>
                  <SelectItem value="GMT+3">GMT+3 (EAT)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Langue Principale</Label>
              <Select value={primaryLang} onValueChange={setPrimaryLang}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Français">Français</SelectItem>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Wolof">Wolof</SelectItem>
                  <SelectItem value="Arabe">Arabe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Langues Supportées</Label>
            <div className="flex flex-wrap gap-3">
              {allSupportedLangs.map((lang) => (
                <label
                  key={lang}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-colors hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={supportedLangs.includes(lang)}
                    onChange={() => toggleSupportedLang(lang)}
                    className="accent-orange-500"
                  />
                  <span className="text-sm">{lang}</span>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="whatsapp-number">Numéro WhatsApp Business</Label>
            <Input
              id="whatsapp-number"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="+221 77 123 45 67"
            />
          </div>

          <div className="space-y-2">
            <Label>Logo de l&apos;aéroport</Label>
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-8 transition-colors hover:border-orange-400 dark:hover:border-orange-500 cursor-pointer">
              <div className="text-center">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Cliquez ou glissez-déposez pour télécharger
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  PNG, JPG ou SVG (max. 2 Mo)
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="welcome-message">Messages de Bienvenue</Label>
            <Textarea
              id="welcome-message"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              rows={6}
              className="text-sm"
            />
          </div>

          <div className="flex justify-end">
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="h-4 w-4" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab 3: Fonctionnalités Bêta ─────────────────────────────────

function BetaFeaturesTab() {
  const [features, setFeatures] = useState<BetaFeature[]>(BETA_FEATURES_DATA)

  const handleToggle = (id: string) => {
    setFeatures((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          const newEnabled = !f.enabled
          toast.success(
            newEnabled
              ? `Fonctionnalité "${f.name}" activée`
              : `Fonctionnalité "${f.name}" désactivée`
          )
          return { ...f, enabled: newEnabled }
        }
        return f
      })
    )
  }

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'Bêta':
        return 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800'
      case 'En Production':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
      case 'Désactivé':
        return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard
          icon={FlaskConical}
          label="Fonctionnalités Bêta"
          value={features.filter((f) => f.status === 'Bêta').length.toString()}
          borderColor="border-l-violet-500"
          iconBgColor="bg-violet-500/10"
          iconColor="text-violet-600 dark:text-violet-400"
          valueColor="text-violet-600 dark:text-violet-400"
        />
        <KpiCard
          icon={Users}
          label="Utilisateurs Test"
          value="23"
          borderColor="border-l-amber-500"
          iconBgColor="bg-amber-500/10"
          iconColor="text-amber-600 dark:text-amber-400"
          valueColor="text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* Beta Features Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {features.map((feature) => (
          <Card
            key={feature.id}
            className={`transition-all hover:shadow-md ${
              feature.enabled ? '' : 'opacity-70'
            }`}
          >
            <CardContent className="p-4 space-y-3">
              {/* Top row: name + toggle */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{feature.name}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {feature.description}
                  </p>
                </div>
                <Switch
                  checked={feature.enabled}
                  onCheckedChange={() => handleToggle(feature.id)}
                />
              </div>

              {/* Status badge */}
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={getStatusBadgeClasses(feature.status)}
                >
                  {feature.status}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    feature.enabled
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                  }
                >
                  {feature.enabled ? 'Activé' : 'Désactivé'}
                </Badge>
              </div>

              {/* En savoir plus accordion */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="details" className="border-b-0">
                  <AccordionTrigger className="py-2 text-xs text-orange-600 dark:text-orange-400 hover:no-underline">
                    En savoir plus
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {feature.details}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────

export function ModuleManagement() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Gestion des Modules
        </h2>
        <p className="text-muted-foreground text-sm">
          Activez, configurez et gérez les modules et fonctionnalités du système
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="modules" className="w-full">
        <TabsList className="flex-wrap">
          <TabsTrigger value="modules" className="gap-1.5">
            <Puzzle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Modules</span>
          </TabsTrigger>
          <TabsTrigger value="airport" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Configuration Aéroport</span>
          </TabsTrigger>
          <TabsTrigger value="beta" className="gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Fonctionnalités Bêta</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="modules">
          <ModulesTab />
        </TabsContent>

        <TabsContent value="airport">
          <AirportConfigTab />
        </TabsContent>

        <TabsContent value="beta">
          <BetaFeaturesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
