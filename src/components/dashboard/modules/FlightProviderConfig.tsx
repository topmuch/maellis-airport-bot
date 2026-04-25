'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Plane,
  Radio,
  TestTube,
  Settings2,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Save,
  FlaskConical,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────

type ProviderType = 'AVIATION_STACK' | 'CUSTOM_FIDS' | 'MOCK'

type ConnectionStatus = 'idle' | 'loading' | 'success' | 'error'

interface FlightProviderConfigData {
  flightProvider: ProviderType
  aviationStackKey: string | null
  hasAviationKey: boolean
  customFidsUrl: string | null
  customFidsHeaders: Record<string, string> | null
  customFidsDataPath: string | null
  customFidsMapping: Record<string, string> | null
  updatedAt: string | null
}

interface TestResult {
  success: boolean
  message: string
  latencyMs?: number
  sample?: {
    flightNumber: string
    airline: string
    departureCode: string
    arrivalCode: string
    departureCity?: string
    arrivalCity?: string
    status: string
    delayMinutes?: number
    gate?: string
    scheduledDep?: string
    scheduledArr?: string
  }
}

// ─── Provider Option Cards ───────────────────────────────────────

const PROVIDER_OPTIONS: {
  value: ProviderType
  label: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    value: 'AVIATION_STACK',
    label: 'AviationStack (Démo)',
    description: 'API publique de données aéronautiques en temps réel',
    icon: <Plane className="h-5 w-5 text-sky-500" />,
  },
  {
    value: 'CUSTOM_FIDS',
    label: 'API Interne Aéroport (FIDS)',
    description: 'Système interne de votre aéroport',
    icon: <Radio className="h-5 w-5 text-amber-500" />,
  },
  {
    value: 'MOCK',
    label: 'Mode Test (Mock)',
    description: 'Données statiques pour le développement',
    icon: <TestTube className="h-5 w-5 text-emerald-500" />,
  },
]

// ─── Component ───────────────────────────────────────────────────

export function FlightProviderConfig() {
  // ── Config state ────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>('MOCK')

  // AviationStack
  const [aviationStackKey, setAviationStackKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [hasExistingKey, setHasExistingKey] = useState(false)

  // Custom FIDS
  const [fidsUrl, setFidsUrl] = useState('')
  const [fidsHeaders, setFidsHeaders] = useState('')
  const [fidsDataPath, setFidsDataPath] = useState('')
  const [fidsMapping, setFidsMapping] = useState('')

  // ── Connection test state ───────────────────────────────────────
  const [testStatus, setTestStatus] = useState<ConnectionStatus>('idle')
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  // ── Save state ──────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)

  // ── Load config on mount ────────────────────────────────────────
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/admin/config/flight-provider')
        const json = await res.json()
        if (json.success && json.data) {
          const data: FlightProviderConfigData = json.data
          setSelectedProvider(data.flightProvider)
          setHasExistingKey(data.hasAviationKey)
          // Only set key if user hasn't typed a new one (keep masked value for display)
          if (data.aviationStackKey) {
            setAviationStackKey(data.aviationStackKey)
          }
          if (data.customFidsUrl) setFidsUrl(data.customFidsUrl)
          if (data.customFidsHeaders) {
            setFidsHeaders(JSON.stringify(data.customFidsHeaders, null, 2))
          }
          if (data.customFidsDataPath) setFidsDataPath(data.customFidsDataPath)
          if (data.customFidsMapping) {
            setFidsMapping(JSON.stringify(data.customFidsMapping, null, 2))
          }
        }
      } catch {
        toast.error('Erreur lors du chargement de la configuration')
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [])

  // ── Test connection ─────────────────────────────────────────────
  const handleTestConnection = useCallback(async () => {
    setTestStatus('loading')
    setTestResult(null)

    try {
      const res = await fetch('/api/admin/config/flight-provider/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json()

      if (json.success && json.data) {
        const data = json.data as TestResult
        setTestResult(data)
        setTestStatus(data.success ? 'success' : 'error')
      } else {
        setTestResult({ success: false, message: json.error || 'Erreur inconnue' })
        setTestStatus('error')
      }
    } catch {
      setTestResult({ success: false, message: 'Erreur réseau — impossible de contacter le serveur' })
      setTestStatus('error')
    }
  }, [])

  // ── Validate before save ────────────────────────────────────────
  const validateForm = (): string | null => {
    if (selectedProvider === 'AVIATION_STACK') {
      if (!aviationStackKey || aviationStackKey.startsWith('••••')) {
        if (!hasExistingKey) {
          return 'La clé API AviationStack est requise'
        }
      }
    }
    if (selectedProvider === 'CUSTOM_FIDS') {
      if (!fidsUrl.trim()) {
        return "L'URL de l'API FIDS est requise"
      }
      if (fidsHeaders.trim()) {
        try {
          JSON.parse(fidsHeaders)
        } catch {
          return 'Les headers HTTP doivent être du JSON valide'
        }
      }
      if (fidsMapping.trim()) {
        try {
          JSON.parse(fidsMapping)
        } catch {
          return 'Le mapping des champs doit être du JSON valide'
        }
      }
    }
    return null
  }

  // ── Save configuration ──────────────────────────────────────────
  const handleSave = async () => {
    const validationError = validateForm()
    if (validationError) {
      toast.error(validationError)
      return
    }

    setSaving(true)
    try {
      const body: Record<string, string> = {
        flightProvider: selectedProvider,
      }

      // Only send aviation key if it's a new value (not masked)
      if (selectedProvider === 'AVIATION_STACK' && aviationStackKey && !aviationStackKey.startsWith('••••')) {
        body.aviationStackKey = aviationStackKey
      }

      if (selectedProvider === 'CUSTOM_FIDS') {
        body.customFidsUrl = fidsUrl
        if (fidsHeaders.trim()) body.customFidsHeaders = fidsHeaders.trim()
        if (fidsDataPath.trim()) body.customFidsDataPath = fidsDataPath.trim()
        if (fidsMapping.trim()) body.customFidsMapping = fidsMapping.trim()
      }

      const res = await fetch('/api/admin/config/flight-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (json.success) {
        toast.success('Configuration sauvegardée avec succès')
        // Reset test status after save
        setTestStatus('idle')
        setTestResult(null)
        // Update existing key flag
        if (selectedProvider === 'AVIATION_STACK') {
          setHasExistingKey(true)
        }
      } else {
        toast.error(json.error || 'Erreur lors de la sauvegarde')
      }
    } catch {
      toast.error('Erreur réseau — impossible de sauvegarder')
    } finally {
      setSaving(false)
    }
  }

  // ── Status badge ────────────────────────────────────────────────
  const renderStatusBadge = () => {
    if (testStatus === 'loading') {
      return (
        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
          <Loader2 className="h-3 w-3 animate-spin" />
          Test en cours...
        </Badge>
      )
    }
    if (testStatus === 'success') {
      return (
        <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
          <CheckCircle className="h-3 w-3" />
          Connecté ✅
        </Badge>
      )
    }
    if (testStatus === 'error') {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
          <XCircle className="h-3 w-3" />
          Erreur ❌
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700">
        En attente
      </Badge>
    )
  }

  // ── Sample flight card ──────────────────────────────────────────
  const renderSampleFlight = () => {
    if (!testResult?.success || !testResult.sample) return null
    const s = testResult.sample

    return (
      <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
        <div className="flex items-center gap-2 mb-3">
          <Plane className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            Vol exemple reçu
          </span>
          {testResult.latencyMs && (
            <span className="text-xs text-muted-foreground ml-auto">
              {testResult.latencyMs} ms
            </span>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Numéro de vol</p>
            <p className="text-sm font-semibold">{s.flightNumber}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Compagnie</p>
            <p className="text-sm font-semibold">{s.airline}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Trajet</p>
            <p className="text-sm font-semibold">
              {s.departureCode} → {s.arrivalCode}
              {s.departureCity && s.arrivalCity && (
                <span className="text-xs text-muted-foreground font-normal ml-2">
                  ({s.departureCity} → {s.arrivalCity})
                </span>
              )}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Statut</p>
            <p className={cn(
              'text-sm font-semibold',
              s.status === 'On Time' && 'text-emerald-600',
              s.status === 'Delayed' && 'text-amber-600',
              s.status === 'Cancelled' && 'text-red-600',
              (!s.status || s.status === 'Scheduled') && 'text-blue-600',
            )}>
              {s.status || 'Inconnu'}
              {s.delayMinutes && s.delayMinutes > 0 && (
                <span className="text-xs text-amber-600 ml-2">
                  +{s.delayMinutes} min
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Loading skeleton ────────────────────────────────────────────
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Settings2 className="h-5 w-5 text-amber-600 dark:text-amber-400 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-base">Sources de Données Vols</CardTitle>
              <div className="h-3 w-48 rounded bg-muted animate-pulse mt-1" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
            <div className="h-32 w-full rounded-md bg-muted animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Main render ─────────────────────────────────────────────────
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Settings2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Sources de Données Vols</CardTitle>
            <p className="text-xs text-muted-foreground">
              Configurez le fournisseur de données de vols pour le tableau de bord
            </p>
          </div>
          {renderStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ═══ Provider Select ═══ */}
        <div className="space-y-2">
          <Label>Fournisseur de données vols</Label>
          <div className="grid gap-3 sm:grid-cols-3">
            {PROVIDER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSelectedProvider(option.value)
                  setTestStatus('idle')
                  setTestResult(null)
                }}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-4 text-left transition-all',
                  selectedProvider === option.value
                    ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500/20 dark:bg-amber-950/20'
                    : 'border-border hover:border-amber-300 hover:bg-muted/50 dark:hover:border-amber-700',
                )}
              >
                <div className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  selectedProvider === option.value
                    ? 'bg-amber-100 dark:bg-amber-900/40'
                    : 'bg-muted',
                )}>
                  {option.icon}
                </div>
                <div className="min-w-0">
                  <p className={cn(
                    'text-sm font-medium',
                    selectedProvider === option.value && 'text-amber-700 dark:text-amber-300',
                  )}>
                    {option.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {option.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* ═══ Conditional Fields ═══ */}

        {/* ── AviationStack Fields ── */}
        {selectedProvider === 'AVIATION_STACK' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-sky-500" />
              <h4 className="text-sm font-semibold">Configuration AviationStack</h4>
            </div>
            <div className="space-y-2">
              <Label htmlFor="aviation-stack-key">Clé API AviationStack</Label>
              <div className="relative">
                <Input
                  id="aviation-stack-key"
                  type={showApiKey ? 'text' : 'password'}
                  value={aviationStackKey}
                  onChange={(e) => setAviationStackKey(e.target.value)}
                  placeholder="Entrez votre clé AviationStack"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 hover:text-foreground transition-colors"
                  aria-label={showApiKey ? 'Masquer la clé' : 'Afficher la clé'}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                La clé est stockée de manière sécurisée en base de données.
                {hasExistingKey && aviationStackKey.startsWith('••••') && (
                  <span className="text-amber-600 dark:text-amber-400 ml-1">
                    (clé existante — laissez vide pour conserver la valeur actuelle)
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* ── Custom FIDS Fields ── */}
        {selectedProvider === 'CUSTOM_FIDS' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-amber-500" />
              <h4 className="text-sm font-semibold">Configuration API FIDS</h4>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fids-url">URL de l&apos;API FIDS</Label>
              <Input
                id="fids-url"
                type="url"
                value={fidsUrl}
                onChange={(e) => setFidsUrl(e.target.value)}
                placeholder="https://fids.votre-aeroport.com/api/v1/flights"
              />
              <p className="text-xs text-muted-foreground">
                Endpoint de l&apos;API interne de votre aéroport retournant les données de vols.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fids-headers">Headers HTTP (JSON)</Label>
              <Textarea
                id="fids-headers"
                value={fidsHeaders}
                onChange={(e) => setFidsHeaders(e.target.value)}
                placeholder={'{"Authorization": "Bearer xxx"}'}
                className="min-h-20 font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                En-têtes HTTP à inclure dans chaque requête (authentification, etc.).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fids-datapath">Chemin des données (JSON Path)</Label>
              <Input
                id="fids-datapath"
                value={fidsDataPath}
                onChange={(e) => setFidsDataPath(e.target.value)}
                placeholder="data.flights"
              />
              <p className="text-xs text-muted-foreground">
                Chemin vers le tableau de vols dans la réponse JSON de l&apos;API.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fids-mapping">Mapping des champs (JSON)</Label>
              <Textarea
                id="fids-mapping"
                value={fidsMapping}
                onChange={(e) => setFidsMapping(e.target.value)}
                placeholder={'{"flightNumber": "flight_no", "status": "state"}'}
                className="min-h-24 font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Correspondance entre les noms de champs standard et ceux de votre API.
              </p>
            </div>
          </div>
        )}

        {/* ── Mock Info ── */}
        {selectedProvider === 'MOCK' && (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
            <TestTube className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                Mode Test actif
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Le mode Mock utilise des données statiques réalistes pour le développement.
                Aucune configuration n&apos;est requise. Les vols affichés sont simulés
                avec des retards aléatoires et des statuts variés.
              </p>
            </div>
          </div>
        )}

        <Separator />

        {/* ═══ Test Connection Result ═══ */}
        {testResult && !testResult.success && testStatus === 'error' && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-800 dark:bg-red-950/20">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                Erreur de connexion
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {testResult.message}
              </p>
            </div>
          </div>
        )}

        {testResult && testResult.success && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle className="h-4 w-4" />
            <span>{testResult.message}</span>
            {testResult.latencyMs != null && (
              <span className="text-xs text-muted-foreground">
                ({testResult.latencyMs} ms)
              </span>
            )}
          </div>
        )}

        {renderSampleFlight()}

        {/* ═══ Actions ═══ */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={testStatus === 'loading'}
            className="gap-2"
          >
            {testStatus === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FlaskConical className="h-4 w-4" />
            )}
            🧪 Tester la connexion
          </Button>

          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Sauvegarder la configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
