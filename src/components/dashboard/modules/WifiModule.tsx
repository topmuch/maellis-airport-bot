'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Wifi,
  Ticket,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  RefreshCw,
  Zap,
  Crown,
  Star,
  Clock,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ─── Types ───────────────────────────────────────────────────────────────────

interface WifiVoucher {
  id: string
  airportCode: string
  voucherCode: string
  phone: string | null
  planType: 'free' | 'premium' | 'premium_plus'
  durationMinutes: number
  bandwidthMbps: number
  price: number
  currency: string
  paymentStatus: string
  isActive: boolean
  activatedAt: string | null
  expiresAt: string | null
  createdAt: string
}

interface WifiStats {
  totalVouchers: number
  activeVouchers: number
  activatedVouchers: number
  expiredVouchers: number
  totalRevenue: number
  currency: string
  planBreakdown: PlanBreakdown[]
}

interface PlanBreakdown {
  planType: string
  count: number
  revenue: number
  activatedCount: number
}

// ─── Plan Config ─────────────────────────────────────────────────────────────

const PLAN_CONFIG = {
  free: {
    label: '🆓 Gratuit',
    durationMinutes: 60,
    bandwidthMbps: 10,
    price: 0,
    color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    btnColor: 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/40',
    icon: Zap,
  },
  premium: {
    label: '⭐ Premium',
    durationMinutes: 240,
    bandwidthMbps: 50,
    price: 1500,
    color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
    btnColor: 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-700 dark:hover:bg-orange-900/40',
    icon: Star,
  },
  premium_plus: {
    label: '👑 Premium+',
    durationMinutes: 480,
    bandwidthMbps: 100,
    price: 3000,
    color: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
    btnColor: 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-700 dark:hover:bg-purple-900/40',
    icon: Crown,
  },
} as const

type PlanType = keyof typeof PLAN_CONFIG

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPlanBadge(planType: string) {
  const config = PLAN_CONFIG[planType as PlanType]
  if (!config) return <Badge variant="secondary">{planType}</Badge>
  return (
    <Badge className={`${config.color} border flex items-center gap-1`}>
      {config.label}
    </Badge>
  )
}

function getStatusBadge(voucher: WifiVoucher) {
  if (!voucher.isActive) {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 flex items-center gap-1">
        <XCircle className="size-3" />
        Désactivé
      </Badge>
    )
  }
  const now = new Date()
  const expiresAt = voucher.expiresAt ? new Date(voucher.expiresAt) : null
  if (expiresAt && expiresAt < now) {
    return (
      <Badge className="bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700 flex items-center gap-1">
        <Clock className="size-3" />
        Expiré
      </Badge>
    )
  }
  if (voucher.activatedAt) {
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 flex items-center gap-1">
        <Wifi className="size-3" />
        Connecté
      </Badge>
    )
  }
  return (
    <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 flex items-center gap-1">
      <CheckCircle2 className="size-3" />
      Actif
    </Badge>
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPrice(price: number, currency: string): string {
  if (price === 0) return 'Gratuit'
  return `${new Intl.NumberFormat('fr-FR').format(price)} ${currency}`
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WifiModule() {
  const [stats, setStats] = useState<WifiStats | null>(null)
  const [vouchers, setVouchers] = useState<WifiVoucher[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingVouchers, setLoadingVouchers] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Generate form state
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('free')
  const [phoneInput, setPhoneInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedVoucher, setGeneratedVoucher] = useState<WifiVoucher | null>(null)
  const [copied, setCopied] = useState(false)

  // Fetch stats
  const fetchStats = useCallback(async (showLoading = false) => {
    if (showLoading) setLoadingStats(true)
    try {
      const res = await fetch('/api/wifi?stats=true')
      if (!res.ok) throw new Error('Failed to fetch stats')
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to load WiFi stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }, [])

  // Fetch vouchers
  const fetchVouchers = useCallback(async (showLoading = false) => {
    if (showLoading) setLoadingVouchers(true)
    try {
      const res = await fetch('/api/wifi')
      if (!res.ok) throw new Error('Failed to fetch vouchers')
      const data = await res.json()
      setVouchers(data.data || data || [])
    } catch (error) {
      console.error('Failed to load vouchers:', error)
    } finally {
      setLoadingVouchers(false)
    }
  }, [])

  // Refresh all
  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchStats(false), fetchVouchers(false)])
    setRefreshing(false)
  }

  useEffect(() => {
    fetchStats(true)
    fetchVouchers(true)
  }, [fetchStats, fetchVouchers])

  // Generate voucher
  const handleGenerate = async () => {
    setIsGenerating(true)
    setGeneratedVoucher(null)
    try {
      const body: Record<string, string> = { planType: selectedPlan }
      if (phoneInput.trim()) body.phone = phoneInput.trim()

      const res = await fetch('/api/wifi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to generate voucher')
      const data = await res.json()
      setGeneratedVoucher(data.data || data)
      setPhoneInput('')
      // Refresh data
      fetchStats(false)
      fetchVouchers(false)
    } catch (error) {
      console.error('Failed to generate voucher:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Copy voucher code
  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            📶 WiFi Aéroport Automatisé
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Génération et gestion des vouchers WiFi — Plans Free, Premium et
            Premium Plus
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw
            className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`}
          />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      {loadingStats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-l-4 border-l-muted">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-muted animate-pulse" />
                  <div className="space-y-1">
                    <div className="h-5 w-16 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Wifi className="size-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalVouchers}</p>
                  <p className="text-xs text-muted-foreground">
                    Total Vouchers
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.activeVouchers}</p>
                  <p className="text-xs text-muted-foreground">
                    Vouchers Actifs
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="size-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {new Intl.NumberFormat('fr-FR').format(stats.totalRevenue)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Revenu Total (FCFA)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-gray-400">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="size-8 text-gray-400" />
                <div>
                  <p className="text-2xl font-bold">{stats.expiredVouchers}</p>
                  <p className="text-xs text-muted-foreground">
                    Vouchers Expirés
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Tabs */}
      <Tabs defaultValue="vouchers" className="w-full">
        <TabsList>
          <TabsTrigger value="stats">📊 Statistiques</TabsTrigger>
          <TabsTrigger value="vouchers">🎫 Vouchers</TabsTrigger>
          <TabsTrigger value="generate">➕ Générer</TabsTrigger>
        </TabsList>

        {/* ── Tab: Statistiques ───────────────────────────────────────── */}
        <TabsContent value="stats" className="space-y-6 mt-4">
          {/* Plan Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Ticket className="size-4" />
                Répartition par Plan
              </CardTitle>
              <CardDescription>
                Détail des vouchers par type de plan WiFi
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : stats?.planBreakdown ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(Object.keys(PLAN_CONFIG) as PlanType[]).map((planKey) => {
                    const config = PLAN_CONFIG[planKey]
                    const Icon = config.icon
                    const breakdown = stats.planBreakdown.find(
                      (p) => p.planType === planKey
                    )

                    return (
                      <Card
                        key={planKey}
                        className="border-l-4"
                        style={{
                          borderLeftColor:
                            planKey === 'free'
                              ? '#22c55e'
                              : planKey === 'premium'
                                ? '#f97316'
                                : '#a855f7',
                        }}
                      >
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="size-5 text-muted-foreground" />
                              <span className="font-semibold">
                                {config.label}
                              </span>
                            </div>
                            <Badge className={config.color} variant="secondary">
                              {breakdown?.count || 0}
                            </Badge>
                          </div>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Durée
                              </span>
                              <span className="font-medium">
                                {config.durationMinutes} min
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Bande passante
                              </span>
                              <span className="font-medium">
                                {config.bandwidthMbps} Mbps
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Prix
                              </span>
                              <span className="font-medium">
                                {formatPrice(config.price, 'FCFA')}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Activés
                              </span>
                              <span className="font-medium">
                                {breakdown?.activatedCount || 0}
                              </span>
                            </div>
                            {config.price > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Revenu
                                </span>
                                <span className="font-medium text-green-600 dark:text-green-400">
                                  {new Intl.NumberFormat('fr-FR').format(
                                    breakdown?.revenue || 0
                                  )}{' '}
                                  FCFA
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucune donnée disponible
                </p>
              )}
            </CardContent>
          </Card>

          {/* Activation Summary */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border p-3 text-center bg-green-50 dark:bg-green-900/20">
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {stats.activatedVouchers}
                </p>
                <p className="text-[10px] text-green-600 dark:text-green-500 uppercase font-medium">
                  Vouchers Activés
                </p>
              </div>
              <div className="rounded-lg border p-3 text-center bg-blue-50 dark:bg-blue-900/20">
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {stats.activeVouchers - stats.activatedVouchers > 0
                    ? stats.activeVouchers - stats.activatedVouchers
                    : 0}
                </p>
                <p className="text-[10px] text-blue-600 dark:text-blue-500 uppercase font-medium">
                  En Attente
                </p>
              </div>
              <div className="rounded-lg border p-3 text-center bg-orange-50 dark:bg-orange-900/20">
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                  {stats.totalVouchers > 0
                    ? Math.round(
                        (stats.activatedVouchers / stats.totalVouchers) * 100
                      )
                    : 0}
                  %
                </p>
                <p className="text-[10px] text-orange-600 dark:text-orange-500 uppercase font-medium">
                  Taux d&apos;Activation
                </p>
              </div>
              <div className="rounded-lg border p-3 text-center bg-gray-50 dark:bg-gray-900/20">
                <p className="text-2xl font-bold text-gray-700 dark:text-gray-400">
                  {new Intl.NumberFormat('fr-FR').format(stats.totalRevenue)}
                </p>
                <p className="text-[10px] text-gray-600 dark:text-gray-500 uppercase font-medium">
                  Revenu FCFA
                </p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Vouchers ───────────────────────────────────────────── */}
        <TabsContent value="vouchers" className="space-y-4 mt-4">
          {/* Summary Badges */}
          <div className="flex flex-wrap gap-2">
            {[
              {
                label: 'Actifs',
                count: vouchers.filter(
                  (v) =>
                    v.isActive &&
                    !v.activatedAt &&
                    (!v.expiresAt || new Date(v.expiresAt) >= new Date())
                ).length,
                color:
                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
              },
              {
                label: 'Connectés',
                count: vouchers.filter(
                  (v) => v.isActive && v.activatedAt
                ).length,
                color:
                  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
              },
              {
                label: 'Expirés',
                count: vouchers.filter(
                  (v) =>
                    v.isActive &&
                    v.expiresAt &&
                    new Date(v.expiresAt) < new Date()
                ).length,
                color:
                  'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400',
              },
              {
                label: 'Désactivés',
                count: vouchers.filter((v) => !v.isActive).length,
                color:
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
              },
            ].map((item) => (
              <Badge
                key={item.label}
                className={`${item.color} border px-3 py-1`}
              >
                {item.label} ({item.count})
              </Badge>
            ))}
          </div>

          {/* Vouchers Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Ticket className="size-4" />
                Liste des Vouchers
              </CardTitle>
              <CardDescription>
                {vouchers.length} voucher(s) au total
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingVouchers ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">
                    Chargement des vouchers...
                  </span>
                </div>
              ) : vouchers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Wifi className="size-10 mb-2 opacity-30" />
                  <p className="text-sm">Aucun voucher disponible</p>
                  <p className="text-xs mt-1">
                    Utilisez l&apos;onglet &quot;Générer&quot; pour créer un
                    voucher
                  </p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="sticky top-0 bg-background z-10">
                        <TableHead>Code</TableHead>
                        <TableHead>Téléphone</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Prix</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Activé Le</TableHead>
                        <TableHead>Expiration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vouchers.map((voucher) => (
                        <TableRow key={voucher.id}>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                                {voucher.voucherCode}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-6 shrink-0"
                                onClick={() =>
                                  handleCopy(voucher.voucherCode)
                                }
                              >
                                <Copy className="size-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {voucher.phone || (
                              <span className="text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getPlanBadge(voucher.planType)}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {formatPrice(voucher.price, voucher.currency)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(voucher)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(voucher.activatedAt)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(voucher.expiresAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Générer ────────────────────────────────────────────── */}
        <TabsContent value="generate" className="space-y-6 mt-4">
          {/* Plan Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wifi className="size-4" />
                Générer un Voucher WiFi
              </CardTitle>
              <CardDescription>
                Sélectionnez un plan et générez un code WiFi pour les
                passagers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Plan Type Buttons */}
              <div className="space-y-2">
                <p className="text-sm font-medium">1. Choisissez un plan</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(Object.keys(PLAN_CONFIG) as PlanType[]).map((planKey) => {
                    const config = PLAN_CONFIG[planKey]
                    const Icon = config.icon
                    const isSelected = selectedPlan === planKey

                    return (
                      <button
                        key={planKey}
                        type="button"
                        onClick={() => setSelectedPlan(planKey)}
                        className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all cursor-pointer ${
                          isSelected
                            ? config.btnColor + ' border-2 shadow-sm'
                            : 'border-transparent bg-muted/50 hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        <Icon className="size-6" />
                        <span className="font-semibold text-sm">
                          {config.label}
                        </span>
                        <div className="text-xs text-center space-y-0.5">
                          <p>{config.durationMinutes} min</p>
                          <p>{config.bandwidthMbps} Mbps</p>
                          <p className="font-semibold">
                            {formatPrice(config.price, 'FCFA')}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="absolute -top-1.5 -right-1.5">
                            <CheckCircle2 className="size-4 text-orange-500" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Phone Input */}
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  2. Numéro de téléphone{' '}
                  <span className="text-muted-foreground font-normal">
                    (optionnel)
                  </span>
                </p>
                <Input
                  placeholder="ex: +221 77 123 45 67"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="max-w-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Associez un numéro pour le suivi et les notifications
                </p>
              </div>

              {/* Generate Button */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {isGenerating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Wifi className="size-4" />
                  )}
                  Générer le Voucher
                </Button>
                {isGenerating && (
                  <span className="text-xs text-muted-foreground animate-pulse">
                    Génération en cours...
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Generated Voucher Result */}
          {generatedVoucher && (
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-6 text-green-500" />
                    <h3 className="text-lg font-semibold">
                      Voucher Généré avec Succès !
                    </h3>
                  </div>
                  <div className="rounded-xl bg-muted/50 border-2 border-dashed border-orange-300 dark:border-orange-700 px-8 py-5">
                    <p className="text-xs text-muted-foreground mb-1">
                      Code WiFi
                    </p>
                    <p className="text-3xl font-mono font-bold tracking-widest text-orange-600 dark:text-orange-400">
                      {generatedVoucher.voucherCode}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleCopy(generatedVoucher.voucherCode)
                      }
                    >
                      {copied ? (
                        <CheckCircle2 className="size-4 text-green-500" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                      {copied ? 'Copié !' : 'Copier le code'}
                    </Button>
                    {getPlanBadge(generatedVoucher.planType)}
                    <Badge variant="outline">
                      {PLAN_CONFIG[
                        generatedVoucher.planType as PlanType
                      ]
                        ?.durationMinutes || generatedVoucher.durationMinutes}{' '}
                      min —{' '}
                      {PLAN_CONFIG[
                        generatedVoucher.planType as PlanType
                      ]
                        ?.bandwidthMbps || generatedVoucher.bandwidthMbps}{' '}
                      Mbps
                    </Badge>
                  </div>
                  {generatedVoucher.phone && (
                    <p className="text-xs text-muted-foreground">
                      Associé au : {generatedVoucher.phone}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
