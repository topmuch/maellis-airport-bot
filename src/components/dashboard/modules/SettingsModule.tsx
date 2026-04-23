'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Save,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Settings,
  MessageSquare,
  Brain,
  CreditCard,
  ShieldAlert,
  Plug,
  Plane,
  Mail,
  Lock,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ─── Types ───────────────────────────────────────────────────────
interface SettingItem {
  id: string
  key: string
  value: string
  group: string
  type: string
  description?: string | null
}

// ─── Mock Settings ───────────────────────────────────────────────
const MOCK_SETTINGS: Record<string, string> = {
  // General
  airport_name: 'Aéroport International Léopold Sédar Senghor',
  airport_iata: 'DSS',
  timezone: 'Africa/Dakar',
  languages: '["fr","en","ar","wo"]',
  maintenance_mode: 'false',

  // WhatsApp
  whatsapp_verify_token: 'my_verify_token_12345',
  whatsapp_access_token: 'EAAGm0PX4ZCpsBAO...',
  whatsapp_phone_number: '+221 78 000 00 00',
  whatsapp_webhook_url: 'https://api.maellis.ai/webhook',
  whatsapp_connected: 'true',

  // AI
  ai_provider: 'groq',
  ai_model: 'llama-3-8b',
  ai_api_key: 'gsk_abc123def456...',
  ai_temperature: '0.7',
  ai_max_tokens: '2048',
  ai_default_language: 'fr',

  // Payments
  orange_money_api_key: 'om_key_xxxxx',
  orange_money_merchant_id: 'OM-DSS-001',
  orange_money_enabled: 'true',
  wave_api_key: 'wave_key_xxxxx',
  wave_merchant_id: 'WV-DSS-001',
  wave_enabled: 'true',
  mtn_momo_api_key: 'mtn_key_xxxxx',
  mtn_momo_enabled: 'false',

  // Emergency
  sos_phone_primary: '+221 33 869 50 00',
  sos_phone_escalation: '+221 77 111 22 33',
  sos_email: 'urgence@maellis.aero',
  sos_auto_escalate_after: '10',
  sos_sms_notifications: 'true',
}

// ─── Tab Component: Général ──────────────────────────────────────
function GeneralTab({
  settings,
  saving,
  onSave,
}: {
  settings: Record<string, string>
  saving: boolean
  onSave: (key: string, value: string) => void
}) {
  const [airportName, setAirportName] = useState(settings.airport_name || '')
  const [airportIata, setAirportIata] = useState(settings.airport_iata || '')
  const [timezone, setTimezone] = useState(settings.timezone || 'Africa/Dakar')
  const [maintenance, setMaintenance] = useState(
    settings.maintenance_mode === 'true'
  )
  const [languages, setLanguages] = useState<string[]>(() => {
    try {
      return JSON.parse(settings.languages || '["fr"]')
    } catch {
      return ['fr']
    }
  })

  const toggleLang = (lang: string) => {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    )
  }

  const handleSave = () => {
    onSave('airport_name', airportName)
    onSave('airport_iata', airportIata)
    onSave('timezone', timezone)
    onSave('languages', JSON.stringify(languages))
    onSave('maintenance_mode', maintenance.toString())
  }

  const allLangs = [
    { code: 'fr', label: 'Français' },
    { code: 'en', label: 'English' },
    { code: 'ar', label: 'العربية' },
    { code: 'wo', label: 'Wolof' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="airport_name">Nom de l&apos;aéroport</Label>
          <Input
            id="airport_name"
            value={airportName}
            onChange={(e) => setAirportName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="airport_iata">Code IATA</Label>
          <Input
            id="airport_iata"
            value={airportIata}
            onChange={(e) => setAirportIata(e.target.value)}
            maxLength={3}
            className="w-32"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Fuseau Horaire</Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UTC">UTC (Temps Universel)</SelectItem>
            <SelectItem value="Africa/Dakar">GMT (Dakar)</SelectItem>
            <SelectItem value="Africa/Abidjan">GMT (Abidjan)</SelectItem>
            <SelectItem value="Africa/Bamako">GMT (Bamako)</SelectItem>
            <SelectItem value="Europe/Paris">CET (Paris)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Langues Supportées</Label>
        <div className="flex flex-wrap gap-3">
          {allLangs.map((lang) => (
            <label
              key={lang.code}
              className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-colors hover:bg-muted/50"
            >
              <input
                type="checkbox"
                checked={languages.includes(lang.code)}
                onChange={() => toggleLang(lang.code)}
                className="accent-orange-500"
              />
              <span className="text-sm">{lang.label}</span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <p className="text-sm font-medium">Mode Maintenance</p>
          <p className="text-muted-foreground text-xs">
            Désactive le bot WhatsApp et affiche un message d&apos;indisponibilité
          </p>
        </div>
        <Switch
          checked={maintenance}
          onCheckedChange={setMaintenance}
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
    </div>
  )
}

// ─── Tab Component: WhatsApp ─────────────────────────────────────
function WhatsAppTab({
  settings,
  saving,
  onSave,
}: {
  settings: Record<string, string>
  saving: boolean
  onSave: (key: string, value: string) => void
}) {
  const [verifyToken, setVerifyToken] = useState(
    settings.whatsapp_verify_token || ''
  )
  const [accessToken, setAccessToken] = useState(
    settings.whatsapp_access_token || ''
  )
  const [phoneNumber, setPhoneNumber] = useState(
    settings.whatsapp_phone_number || ''
  )
  const [showVerify, setShowVerify] = useState(false)
  const [showAccess, setShowAccess] = useState(false)
  const isConnected = settings.whatsapp_connected === 'true'

  const handleSave = () => {
    onSave('whatsapp_verify_token', verifyToken)
    onSave('whatsapp_access_token', accessToken)
    onSave('whatsapp_phone_number', phoneNumber)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Badge
          className={`${
            isConnected
              ? 'bg-orange-500/15 text-orange-600 border-orange-200'
              : 'bg-red-500/15 text-red-700 border-red-200'
          }`}
          variant="outline"
        >
          {isConnected ? (
            <>
              <Wifi className="mr-1 h-3 w-3" />
              Connecté
            </>
          ) : (
            <>
              <WifiOff className="mr-1 h-3 w-3" />
              Déconnecté
            </>
          )}
        </Badge>
        <span className="text-muted-foreground text-xs">
          Statut de connexion WhatsApp Business
        </span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="verify_token">Verify Token</Label>
        <div className="relative">
          <Input
            id="verify_token"
            type={showVerify ? 'text' : 'password'}
            value={verifyToken}
            onChange={(e) => setVerifyToken(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowVerify(!showVerify)}
            className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2"
          >
            {showVerify ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="access_token">Access Token</Label>
        <div className="relative">
          <Input
            id="access_token"
            type={showAccess ? 'text' : 'password'}
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowAccess(!showAccess)}
            className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2"
          >
            {showAccess ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="wa_phone">Numéro WhatsApp</Label>
        <Input
          id="wa_phone"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+221 78 000 00 00"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="webhook">Webhook URL</Label>
        <Input
          id="webhook"
          value={settings.whatsapp_webhook_url || ''}
          readOnly
          className="bg-muted cursor-not-allowed"
        />
        <p className="text-muted-foreground text-xs">
          URL configurée côté Meta Developer Dashboard
        </p>
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
    </div>
  )
}

// ─── Tab Component: IA ───────────────────────────────────────────
function AITab({
  settings,
  saving,
  onSave,
}: {
  settings: Record<string, string>
  saving: boolean
  onSave: (key: string, value: string) => void
}) {
  const [provider, setProvider] = useState(settings.ai_provider || 'groq')
  const [model, setModel] = useState(settings.ai_model || 'llama-3-8b')
  const [apiKey, setApiKey] = useState(settings.ai_api_key || '')
  const [temperature, setTemperature] = useState(
    parseFloat(settings.ai_temperature || '0.7')
  )
  const [maxTokens, setMaxTokens] = useState(
    settings.ai_max_tokens || '2048'
  )
  const [defaultLang, setDefaultLang] = useState(
    settings.ai_default_language || 'fr'
  )
  const [showApiKey, setShowApiKey] = useState(false)

  const handleSave = () => {
    onSave('ai_provider', provider)
    onSave('ai_model', model)
    onSave('ai_api_key', apiKey)
    onSave('ai_temperature', temperature.toString())
    onSave('ai_max_tokens', maxTokens)
    onSave('ai_default_language', defaultLang)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Fournisseur IA</Label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="groq">Groq</SelectItem>
              <SelectItem value="ollama">Ollama (Local)</SelectItem>
              <SelectItem value="local">Local</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai_model">Modèle</Label>
          <Input
            id="ai_model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="llama-3-8b"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ai_key">API Key</Label>
        <div className="relative">
          <Input
            id="ai_key"
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2"
          >
            {showApiKey ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Température : {temperature.toFixed(1)}</Label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          className="w-full max-w-sm accent-orange-500"
        />
        <div className="flex justify-between text-xs text-muted-foreground max-w-sm">
          <span>Précis (0)</span>
          <span>Créatif (1)</span>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="max_tokens">Max Tokens</Label>
          <Input
            id="max_tokens"
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(e.target.value)}
            min={256}
            max={8192}
          />
        </div>
        <div className="space-y-2">
          <Label>Langue par défaut</Label>
          <Select value={defaultLang} onValueChange={setDefaultLang}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ar">العربية</SelectItem>
              <SelectItem value="wo">Wolof</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
    </div>
  )
}

// ─── Tab Component: Paiements ────────────────────────────────────
function PaymentsTab({
  settings,
  saving,
  onSave,
}: {
  settings: Record<string, string>
  saving: boolean
  onSave: (key: string, value: string) => void
}) {
  // Orange Money
  const [omApiKey, setOmApiKey] = useState(
    settings.orange_money_api_key || ''
  )
  const [omMerchantId, setOmMerchantId] = useState(
    settings.orange_money_merchant_id || ''
  )
  const [omEnabled, setOmEnabled] = useState(
    settings.orange_money_enabled === 'true'
  )
  const [showOmKey, setShowOmKey] = useState(false)

  // Wave
  const [wvApiKey, setWvApiKey] = useState(settings.wave_api_key || '')
  const [wvMerchantId, setWvMerchantId] = useState(
    settings.wave_merchant_id || ''
  )
  const [wvEnabled, setWvEnabled] = useState(
    settings.wave_enabled === 'true'
  )
  const [showWvKey, setShowWvKey] = useState(false)

  // MTN MoMo
  const [mtnApiKey, setMtnApiKey] = useState(settings.mtn_momo_api_key || '')
  const [mtnEnabled, setMtnEnabled] = useState(
    settings.mtn_momo_enabled === 'true'
  )
  const [showMtnKey, setShowMtnKey] = useState(false)

  const handleSave = () => {
    onSave('orange_money_api_key', omApiKey)
    onSave('orange_money_merchant_id', omMerchantId)
    onSave('orange_money_enabled', omEnabled.toString())
    onSave('wave_api_key', wvApiKey)
    onSave('wave_merchant_id', wvMerchantId)
    onSave('wave_enabled', wvEnabled.toString())
    onSave('mtn_momo_api_key', mtnApiKey)
    onSave('mtn_momo_enabled', mtnEnabled.toString())
  }

  return (
    <div className="space-y-8">
      {/* Orange Money */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500">
              <CreditCard className="h-4 w-4 text-white" />
            </div>
            <h4 className="font-semibold">Orange Money</h4>
          </div>
          <Switch checked={omEnabled} onCheckedChange={setOmEnabled} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="relative">
              <Input
                type={showOmKey ? 'text' : 'password'}
                value={omApiKey}
                onChange={(e) => setOmApiKey(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowOmKey(!showOmKey)}
                className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showOmKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Merchant ID</Label>
            <Input
              value={omMerchantId}
              onChange={(e) => setOmMerchantId(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Wave */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500">
              <CreditCard className="h-4 w-4 text-white" />
            </div>
            <h4 className="font-semibold">Wave</h4>
          </div>
          <Switch checked={wvEnabled} onCheckedChange={setWvEnabled} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="relative">
              <Input
                type={showWvKey ? 'text' : 'password'}
                value={wvApiKey}
                onChange={(e) => setWvApiKey(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowWvKey(!showWvKey)}
                className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showWvKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Merchant ID</Label>
            <Input
              value={wvMerchantId}
              onChange={(e) => setWvMerchantId(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* MTN MoMo */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500">
              <CreditCard className="h-4 w-4 text-white" />
            </div>
            <h4 className="font-semibold">MTN MoMo</h4>
          </div>
          <Switch checked={mtnEnabled} onCheckedChange={setMtnEnabled} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="relative">
              <Input
                type={showMtnKey ? 'text' : 'password'}
                value={mtnApiKey}
                onChange={(e) => setMtnApiKey(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowMtnKey(!showMtnKey)}
                className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showMtnKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
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
    </div>
  )
}

// ─── Tab Component: Urgences ─────────────────────────────────────
function EmergencyTab({
  settings,
  saving,
  onSave,
}: {
  settings: Record<string, string>
  saving: boolean
  onSave: (key: string, value: string) => void
}) {
  const [sosPhone, setSosPhone] = useState(
    settings.sos_phone_primary || ''
  )
  const [escalationPhone, setEscalationPhone] = useState(
    settings.sos_phone_escalation || ''
  )
  const [sosEmail, setSosEmail] = useState(settings.sos_email || '')
  const [autoEscalate, setAutoEscalate] = useState(
    settings.sos_auto_escalate_after || '10'
  )
  const [smsNotifications, setSmsNotifications] = useState(
    settings.sos_sms_notifications === 'true'
  )

  const handleSave = () => {
    onSave('sos_phone_primary', sosPhone)
    onSave('sos_phone_escalation', escalationPhone)
    onSave('sos_email', sosEmail)
    onSave('sos_auto_escalate_after', autoEscalate)
    onSave('sos_sms_notifications', smsNotifications.toString())
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sos_phone">Numéro SOS Principal</Label>
          <Input
            id="sos_phone"
            value={sosPhone}
            onChange={(e) => setSosPhone(e.target.value)}
            placeholder="+221 33 869 50 00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="escalation_phone">Numéro Escalade</Label>
          <Input
            id="escalation_phone"
            value={escalationPhone}
            onChange={(e) => setEscalationPhone(e.target.value)}
            placeholder="+221 77 111 22 33"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sos_email">Email Alertes</Label>
        <Input
          id="sos_email"
          type="email"
          value={sosEmail}
          onChange={(e) => setSosEmail(e.target.value)}
          placeholder="urgence@maellis.aero"
        />
      </div>

      <div className="space-y-2">
        <Label>Auto-escalade après</Label>
        <Select value={autoEscalate} onValueChange={setAutoEscalate}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5 minutes</SelectItem>
            <SelectItem value="10">10 minutes</SelectItem>
            <SelectItem value="15">15 minutes</SelectItem>
            <SelectItem value="30">30 minutes</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          Durée avant escalade automatique des alertes non traitées
        </p>
      </div>

      <Separator />

      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <p className="text-sm font-medium">Notifications SMS</p>
          <p className="text-muted-foreground text-xs">
            Envoyer des alertes SMS aux agents en cas d&apos;urgence critique
          </p>
        </div>
        <Switch
          checked={smsNotifications}
          onCheckedChange={setSmsNotifications}
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
    </div>
  )
}

// ─── Status Badge (extracted to avoid render-time component) ──
function ConnectionStatusBadge({ status }: { status: 'idle' | 'loading' | 'connected' | 'error' }) {
  if (status === 'loading') return <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200"><Loader2 className="mr-1 h-3 w-3 animate-spin" />En attente</Badge>
  if (status === 'connected') return <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200"><Wifi className="mr-1 h-3 w-3" />Connecté</Badge>
  if (status === 'error') return <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200"><WifiOff className="mr-1 h-3 w-3" />Déconnecté</Badge>
  return <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200">Non testé</Badge>
}

// ─── Tab Component: APIs & Intégrations ────────────────────────────
function ApiIntegrationsTab({
  settings,
  saving,
  onSave,
}: {
  settings: Record<string, string>
  saving: boolean
  onSave: (key: string, value: string) => void
}) {
  // ── State per group ──────────────────────────────────────────────────
  const [aviationKey, setAviationKey] = useState(settings.aviation_stack_key || '')
  const [groqKey, setGroqKey] = useState(settings.ai_api_key || '')
  const [mapsKey, setMapsKey] = useState(settings.google_maps_key || '')
  const [waPhoneId, setWaPhoneId] = useState(settings.whatsapp_phone_number_id || '')
  const [waToken, setWaToken] = useState(settings.whatsapp_access_token || '')
  const [waVerify, setWaVerify] = useState(settings.whatsapp_verify_token || '')
  const [smtpHost, setSmtpHost] = useState(settings.smtp_host || '')
  const [smtpPort, setSmtpPort] = useState(settings.smtp_port || '')
  const [smtpUser, setSmtpUser] = useState(settings.smtp_user || '')
  const [smtpPass, setSmtpPass] = useState(settings.smtp_password || '')
  const [cinetpayKey, setCinetpayKey] = useState(settings.cinetpay_api_key || '')
  const [cinetpaySiteId, setCinetpaySiteId] = useState(settings.cinetpay_site_id || '')
  const [cinetpaySecret, setCinetpaySecret] = useState(settings.cinetpay_secret_key || '')
  const [jwtSecret, setJwtSecret] = useState(settings.jwt_secret || '')

  // Show/hide passwords
  const [showAviation, setShowAviation] = useState(false)
  const [showGroq, setShowGroq] = useState(false)
  const [showMaps, setShowMaps] = useState(false)
  const [showWaToken, setShowWaToken] = useState(false)
  const [showSmtpPass, setShowSmtpPass] = useState(false)
  const [showCinetpayKey, setShowCinetpayKey] = useState(false)
  const [showCinetpaySecret, setShowCinetpaySecret] = useState(false)
  const [showJwt, setShowJwt] = useState(false)

  // Test connection status per group
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'loading' | 'connected' | 'error'>>({})
  const [testMessage, setTestMessage] = useState<Record<string, string>>({})

  // ── Test handler ─────────────────────────────────────────────────────
  const testConnection = async (type: string) => {
    setTestStatus((prev) => ({ ...prev, [type]: 'loading' }))
    setTestMessage((prev) => ({ ...prev, [type]: '' }))
    try {
      const res = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setTestStatus((prev) => ({ ...prev, [type]: json.data.connected ? 'connected' : 'error' }))
        setTestMessage((prev) => ({ ...prev, [type]: json.data.message }))
        toast[json.data.connected ? 'success' : 'error'](json.data.message)
      } else {
        setTestStatus((prev) => ({ ...prev, [type]: 'error' }))
        setTestMessage((prev) => ({ ...prev, [type]: json.error || 'Erreur' }))
        toast.error(json.error || 'Erreur')
      }
    } catch {
      setTestStatus((prev) => ({ ...prev, [type]: 'error' }))
      setTestMessage((prev) => ({ ...prev, [type]: 'Erreur réseau' }))
      toast.error('Erreur réseau')
    }
  }

  // ── Save all ─────────────────────────────────────────────────────────
  const handleSaveAll = () => {
    onSave('aviation_stack_key', aviationKey)
    onSave('google_maps_key', mapsKey)
    onSave('whatsapp_phone_number_id', waPhoneId)
    onSave('whatsapp_access_token', waToken)
    onSave('whatsapp_verify_token', waVerify)
    onSave('smtp_host', smtpHost)
    onSave('smtp_port', smtpPort)
    onSave('smtp_user', smtpUser)
    onSave('smtp_password', smtpPass)
    onSave('cinetpay_api_key', cinetpayKey)
    onSave('cinetpay_site_id', cinetpaySiteId)
    onSave('cinetpay_secret_key', cinetpaySecret)
    onSave('jwt_secret', jwtSecret)
  }

  // ── Status badge (using extracted component) ──────────────────────────────
  const statusFor = (group: string) => testStatus[group] || 'idle'

  // ── Password input rendered inline (JSX in return, not a component declaration) ──

  return (
    <div className="space-y-8">
      {/* ═══ 1. INTELLIGENCE & DONNÉES ═══ */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
              <Brain className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <h4 className="font-semibold">Intelligence & Données</h4>
              <p className="text-xs text-muted-foreground">APIs pour le suivi des vols, IA et cartographie</p>
            </div>
          </div>
          <ConnectionStatusBadge status={statusFor('aviation')} />
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">AviationStack API Key</Label>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => testConnection('aviation')} disabled={testStatus.aviation === 'loading'}>
                {testStatus.aviation === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Tester'} Vols
              </Button>
            </div>
            <div className="relative"><Input type={showAviation ? 'text' : 'password'} value={aviationKey} onChange={(e) => setAviationKey(e.target.value)} placeholder="AVIATION_STACK_KEY" /><button type="button" onClick={() => setShowAviation(!showAviation)} className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2">{showAviation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
            <p className="text-xs text-muted-foreground">Pour le suivi des vols en temps réel (portes, retards).</p>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Groq / LLM API Key</Label>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => testConnection('groq')} disabled={testStatus.groq === 'loading'}>
                {testStatus.groq === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Tester'} IA
              </Button>
            </div>
            <div className="relative"><Input type={showGroq ? 'text' : 'password'} value={groqKey} onChange={(e) => setGroqKey(e.target.value)} placeholder="gsk_..." /><button type="button" onClick={() => setShowGroq(!showGroq)} className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2">{showGroq ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
            <p className="text-xs text-muted-foreground">Pour l&apos;intelligence du chatbot (compréhension langage).</p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm">Google Maps API Key</Label>
            <div className="relative"><Input type={showMaps ? 'text' : 'password'} value={mapsKey} onChange={(e) => setMapsKey(e.target.value)} placeholder="AIza..." /><button type="button" onClick={() => setShowMaps(!showMaps)} className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2">{showMaps ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
            <p className="text-xs text-muted-foreground">Pour calculer les distances Taxi/VTC.</p>
          </div>
        </div>
      </div>

      {/* ═══ 2. COMMUNICATION ═══ */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h4 className="font-semibold">Communication</h4>
              <p className="text-xs text-muted-foreground">WhatsApp Business & Email</p>
            </div>
          </div>
          <ConnectionStatusBadge status={statusFor('whatsapp')} />
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">WhatsApp Cloud API</Label>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => testConnection('whatsapp')} disabled={testStatus.whatsapp === 'loading'}>
                {testStatus.whatsapp === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Tester'} WhatsApp
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">Phone Number ID</Label><Input value={waPhoneId} onChange={(e) => setWaPhoneId(e.target.value)} placeholder="ID du numéro" /></div>
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">Access Token</Label><div className="relative"><Input type={showWaToken ? 'text' : 'password'} value={waToken} onChange={(e) => setWaToken(e.target.value)} placeholder="EAAGm0..." /><button type="button" onClick={() => setShowWaToken(!showWaToken)} className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2">{showWaToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">Verify Token</Label><Input value={waVerify} onChange={(e) => setWaVerify(e.target.value)} placeholder="Token de vérification" /></div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Email (SMTP)</Label>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => testConnection('email')} disabled={testStatus.email === 'loading'}>
                {testStatus.email === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Tester'} Email
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">Hôte</Label><Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.example.com" /></div>
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">Port</Label><Input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" /></div>
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">Utilisateur</Label><Input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="user@example.com" /></div>
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">Mot de passe</Label><div className="relative"><Input type={showSmtpPass ? 'text' : 'password'} value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} placeholder="••••••" /><button type="button" onClick={() => setShowSmtpPass(!showSmtpPass)} className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2">{showSmtpPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 3. PAIEMENTS ═══ */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <CreditCard className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h4 className="font-semibold">Paiements</h4>
              <p className="text-xs text-muted-foreground">CinetPay (Orange Money / Wave)</p>
            </div>
          </div>
          <ConnectionStatusBadge status={statusFor('payment')} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">CinetPay</Label>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => testConnection('payment')} disabled={testStatus.payment === 'loading'}>
              {testStatus.payment === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Simuler'} Transaction
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1"><Label className="text-xs text-muted-foreground">API Key</Label><div className="relative"><Input type={showCinetpayKey ? 'text' : 'password'} value={cinetpayKey} onChange={(e) => setCinetpayKey(e.target.value)} placeholder="CINETPAY_API_KEY" /><button type="button" onClick={() => setShowCinetpayKey(!showCinetpayKey)} className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2">{showCinetpayKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
            <div className="space-y-1"><Label className="text-xs text-muted-foreground">Site ID</Label><Input value={cinetpaySiteId} onChange={(e) => setCinetpaySiteId(e.target.value)} placeholder="Site ID" /></div>
            <div className="space-y-1"><Label className="text-xs text-muted-foreground">Secret Key</Label><div className="relative"><Input type={showCinetpaySecret ? 'text' : 'password'} value={cinetpaySecret} onChange={(e) => setCinetpaySecret(e.target.value)} placeholder="Secret Key" /><button type="button" onClick={() => setShowCinetpaySecret(!showCinetpaySecret)} className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2">{showCinetpaySecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
          </div>
          <p className="text-xs text-muted-foreground">Pour accepter les paiements mobiles locaux.</p>
        </div>
      </div>

      {/* ═══ 4. SÉCURITÉ ═══ */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
              <Lock className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h4 className="font-semibold">Sécurité</h4>
              <p className="text-xs text-muted-foreground">Clés de chiffrement et signatures</p>
            </div>
          </div>
          <ConnectionStatusBadge status={statusFor('jwt')} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">JWT Secret</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setJwtSecret(crypto.randomUUID?.() || Math.random().toString(36).slice(2))}>Générer</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => testConnection('jwt')} disabled={testStatus.jwt === 'loading'}>
                {testStatus.jwt === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Vérifier'}
              </Button>
            </div>
          </div>
          <div className="relative"><Input type={showJwt ? 'text' : 'password'} value={jwtSecret} onChange={(e) => setJwtSecret(e.target.value)} placeholder="Clé secrète JWT" /><button type="button" onClick={() => setShowJwt(!showJwt)} className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2">{showJwt ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
          <p className="text-xs text-muted-foreground">Clé secrète pour signer les tokens et QR codes Bagages.</p>
        </div>
      </div>

      {/* ═══ SAVE ALL ═══ */}
      <div className="flex justify-end pt-2">
        <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSaveAll} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder les configurations'}
        </Button>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────
export function SettingsModule() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const json = await res.json()
          if (json.data && json.data.length > 0) {
            const map: Record<string, string> = {}
            json.data.forEach((item: SettingItem) => {
              map[item.key] = item.value
            })
            setSettings(map)
          } else {
            setSettings(MOCK_SETTINGS)
          }
        } else {
          setSettings(MOCK_SETTINGS)
        }
      } catch {
        setSettings(MOCK_SETTINGS)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSave = useCallback(
    async (key: string, value: string) => {
      setSaving(true)
      try {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value }),
        })
        setSettings((prev) => ({ ...prev, [key]: value }))
      } catch {
        // Silently fail - settings remain in local state
      } finally {
        setSaving(false)
      }
    },
    []
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Paramètres</h2>
        <p className="text-muted-foreground text-sm">
          Configuration du système et des intégrations
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="border-orange-500 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="flex-wrap">
            <TabsTrigger value="general" className="gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Général</span>
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </TabsTrigger>
            <TabsTrigger value="ia" className="gap-1.5">
              <Brain className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">IA</span>
            </TabsTrigger>
            <TabsTrigger value="paiements" className="gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Paiements</span>
            </TabsTrigger>
            <TabsTrigger value="urgences" className="gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Urgences</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-1.5">
              <Plug className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">APIs & Intégrations</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Paramètres Généraux
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GeneralTab
                  settings={settings}
                  saving={saving}
                  onSave={handleSave}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whatsapp">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Intégration WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WhatsAppTab
                  settings={settings}
                  saving={saving}
                  onSave={handleSave}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ia">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Configuration IA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AITab
                  settings={settings}
                  saving={saving}
                  onSave={handleSave}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="paiements">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Fournisseurs de Paiement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentsTab
                  settings={settings}
                  saving={saving}
                  onSave={handleSave}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="urgences">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Gestion des Urgences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EmergencyTab
                  settings={settings}
                  saving={saving}
                  onSave={handleSave}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Plug className="h-4 w-4" />
                  APIs & Intégrations
                </CardTitle>
                <CardDescription>Centralisation de toutes les clés et configurations de services tiers.</CardDescription>
              </CardHeader>
              <CardContent>
                <ApiIntegrationsTab
                  settings={settings}
                  saving={saving}
                  onSave={handleSave}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
