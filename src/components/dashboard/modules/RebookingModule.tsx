'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bot,
  Bell,
  Plane,
  Users,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  BarChart3,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// ─── Types ───────────────────────────────────────────────────────────────────

interface RebookingStats {
  totalAlerts: number
  todayAlerts: number
  recentAlerts: number
  acceptanceRate: number
  statusBreakdown: { status: string; count: number }[]
  affectedFlights: { flightNumber: string; airline: string; alertCount: number }[]
  affectedAirlines: { airline: string; alertCount: number }[]
  uniquePassengers: number
}

interface RebookingLog {
  id: string
  originalFlight: string
  airline: string
  phone: string
  status: 'detected' | 'notified' | 'accepted' | 'rejected' | 'expired'
  createdAt: string
}

// ─── Status Helpers ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; badge: string; icon: React.ElementType }
> = {
  detected: {
    label: 'Détecté',
    badge: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700',
    icon: Eye,
  },
  notified: {
    label: 'Notifié',
    badge: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
    icon: Bell,
  },
  accepted: {
    label: 'Accepté',
    badge: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Refusé',
    badge: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
    icon: XCircle,
  },
  expired: {
    label: 'Expiré',
    badge: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700',
    icon: Clock,
  },
}

function getStatusBadge(status: string) {
  const config = STATUS_CONFIG[status]
  if (!config) return <Badge variant="secondary">{status}</Badge>
  const Icon = config.icon
  return (
    <Badge className={`${config.badge} flex items-center gap-1`} variant="outline">
      <Icon className="size-3" />
      {config.label}
    </Badge>
  )
}

function getStatusLabel(status: string): string {
  return STATUS_CONFIG[status]?.label ?? status
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockStats: RebookingStats = {
  totalAlerts: 284,
  todayAlerts: 12,
  recentAlerts: 38,
  acceptanceRate: 76,
  statusBreakdown: [
    { status: 'detected', count: 42 },
    { status: 'notified', count: 95 },
    { status: 'accepted', count: 108 },
    { status: 'rejected', count: 27 },
    { status: 'expired', count: 12 },
  ],
  affectedFlights: [
    { flightNumber: 'AF 722', airline: 'Air France', alertCount: 34 },
    { flightNumber: 'AT 527', airline: 'Royal Air Maroc', alertCount: 22 },
    { flightNumber: 'SN 202', airline: 'Brussels Airlines', alertCount: 18 },
    { flightNumber: 'TK 601', airline: 'Turkish Airlines', alertCount: 15 },
    { flightNumber: 'IA 590', airline: 'Iberia', alertCount: 12 },
    { flightNumber: 'ET 912', airline: 'Ethiopian Airlines', alertCount: 9 },
    { flightNumber: 'BA 178', airline: 'British Airways', alertCount: 7 },
  ],
  affectedAirlines: [
    { airline: 'Air France', alertCount: 34 },
    { airline: 'Royal Air Maroc', alertCount: 22 },
    { airline: 'Brussels Airlines', alertCount: 18 },
    { airline: 'Turkish Airlines', alertCount: 15 },
    { airline: 'Iberia', alertCount: 12 },
    { airline: 'Ethiopian Airlines', alertCount: 9 },
    { airline: 'British Airways', alertCount: 7 },
  ],
  uniquePassengers: 156,
}

const mockLogs: RebookingLog[] = [
  {
    id: '1',
    originalFlight: 'AF 722',
    airline: 'Air France',
    phone: '+221 77 123 45 67',
    status: 'accepted',
    createdAt: '2025-06-15T08:30:00Z',
  },
  {
    id: '2',
    originalFlight: 'AT 527',
    airline: 'Royal Air Maroc',
    phone: '+221 78 234 56 78',
    status: 'notified',
    createdAt: '2025-06-15T09:15:00Z',
  },
  {
    id: '3',
    originalFlight: 'SN 202',
    airline: 'Brussels Airlines',
    phone: '+221 76 345 67 89',
    status: 'detected',
    createdAt: '2025-06-15T10:00:00Z',
  },
  {
    id: '4',
    originalFlight: 'TK 601',
    airline: 'Turkish Airlines',
    phone: '+221 77 456 78 90',
    status: 'rejected',
    createdAt: '2025-06-15T10:45:00Z',
  },
  {
    id: '5',
    originalFlight: 'IA 590',
    airline: 'Iberia',
    phone: '+221 78 567 89 01',
    status: 'expired',
    createdAt: '2025-06-15T11:30:00Z',
  },
  {
    id: '6',
    originalFlight: 'AF 722',
    airline: 'Air France',
    phone: '+221 76 678 90 12',
    status: 'accepted',
    createdAt: '2025-06-15T12:00:00Z',
  },
  {
    id: '7',
    originalFlight: 'ET 912',
    airline: 'Ethiopian Airlines',
    phone: '+221 77 789 01 23',
    status: 'notified',
    createdAt: '2025-06-15T13:20:00Z',
  },
  {
    id: '8',
    originalFlight: 'BA 178',
    airline: 'British Airways',
    phone: '+221 78 890 12 34',
    status: 'detected',
    createdAt: '2025-06-15T14:10:00Z',
  },
  {
    id: '9',
    originalFlight: 'AF 724',
    airline: 'Air France',
    phone: '+221 76 901 23 45',
    status: 'accepted',
    createdAt: '2025-06-15T15:00:00Z',
  },
  {
    id: '10',
    originalFlight: 'AT 527',
    airline: 'Royal Air Maroc',
    phone: '+221 77 012 34 56',
    status: 'notified',
    createdAt: '2025-06-15T16:30:00Z',
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function RebookingModule() {
  const [stats, setStats] = useState<RebookingStats | null>(null)
  const [logs, setLogs] = useState<RebookingLog[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch stats
  const fetchStats = useCallback(async (showLoading = false) => {
    if (showLoading) setLoadingStats(true)
    try {
      const res = await fetch('/api/rebooking?stats=true')
      if (res.ok) {
        const data = await res.json()
        if (data.data) {
          setStats(data.data)
        } else {
          setStats(mockStats)
        }
      } else {
        setStats(mockStats)
      }
    } catch {
      setStats(mockStats)
    } finally {
      setLoadingStats(false)
    }
  }, [])

  // Fetch logs
  const fetchLogs = useCallback(async (showLoading = false) => {
    if (showLoading) setLoadingLogs(true)
    try {
      const res = await fetch('/api/rebooking')
      if (res.ok) {
        const data = await res.json()
        const items = data.data ?? data
        if (Array.isArray(items) && items.length > 0) {
          setLogs(
            items.map((item: Record<string, unknown>) => ({
              id: item.id as string,
              originalFlight: (item.originalFlight as string) || (item.flightNumber as string) || '—',
              airline: (item.airline as string) || '—',
              phone: (item.phone as string) || (item.passengerPhone as string) || '—',
              status: (item.status as RebookingLog['status']) || 'detected',
              createdAt: (item.createdAt as string) || new Date().toISOString(),
            }))
          )
        } else {
          setLogs(mockLogs)
        }
      } else {
        setLogs(mockLogs)
      }
    } catch {
      setLogs(mockLogs)
    } finally {
      setLoadingLogs(false)
    }
  }, [])

  useEffect(() => {
    fetchStats(true)
    fetchLogs(true)
  }, [fetchStats, fetchLogs])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([fetchStats(false), fetchLogs(false)])
    setIsRefreshing(false)
  }

  // Derived values
  const effectiveStats = stats ?? mockStats
  const effectiveLogs = logs.length > 0 ? logs : mockLogs

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            🤖 Agent IA Proactif de Rebooking
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Détection automatique d&apos;annulations et proposition de alternatives
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-1.5"
        >
          <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Alertes */}
        <Card className="border-l-4 border-l-orange-500 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Total Alertes
            </CardDescription>
            <div className="rounded-xl bg-orange-100 dark:bg-orange-900/30 p-2.5">
              <AlertTriangle className="size-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {loadingStats ? (
                <Loader2 className="inline size-5 animate-spin" />
              ) : (
                effectiveStats.totalAlerts
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Depuis le début
            </p>
          </CardContent>
        </Card>

        {/* Alertes 24h */}
        <Card className="border-l-4 border-l-amber-500 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Alertes 24h
            </CardDescription>
            <div className="rounded-xl bg-amber-100 dark:bg-amber-900/30 p-2.5">
              <Bell className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {loadingStats ? (
                <Loader2 className="inline size-5 animate-spin" />
              ) : (
                effectiveStats.todayAlerts
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Dernières 24 heures
            </p>
          </CardContent>
        </Card>

        {/* Taux d'Acceptation */}
        <Card className="border-l-4 border-l-green-500 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Taux d&apos;Acceptation
            </CardDescription>
            <div className="rounded-xl bg-green-100 dark:bg-green-900/30 p-2.5">
              <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {loadingStats ? (
                <Loader2 className="inline size-5 animate-spin" />
              ) : (
                `${effectiveStats.acceptanceRate}%`
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Propositions acceptées
            </p>
          </CardContent>
        </Card>

        {/* Passagers Uniques */}
        <Card className="border-l-4 border-l-blue-500 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Passagers Uniques
            </CardDescription>
            <div className="rounded-xl bg-blue-100 dark:bg-blue-900/30 p-2.5">
              <Users className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {loadingStats ? (
                <Loader2 className="inline size-5 animate-spin" />
              ) : (
                effectiveStats.uniquePassengers
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Passagers recontactés
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="size-3.5" />
            Vue d&apos;ensemble
          </TabsTrigger>
          <TabsTrigger value="alertes" className="gap-1.5">
            <Bell className="size-3.5" />
            Alertes
          </TabsTrigger>
          <TabsTrigger value="flights" className="gap-1.5">
            <Plane className="size-3.5" />
            Vols Affectés
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Vue d'ensemble ──────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Breakdown Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="size-4 text-orange-500" />
                  Répartition par Statut
                </CardTitle>
                <CardDescription>
                  Distribution des alertes de rebooking par statut
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {effectiveStats.statusBreakdown.map((item) => {
                      const total = effectiveStats.statusBreakdown.reduce(
                        (sum, s) => sum + s.count,
                        0
                      )
                      const pct = total > 0 ? Math.round((item.count / total) * 100) : 0
                      const config = STATUS_CONFIG[item.status]
                      const colorMap: Record<string, string> = {
                        detected: 'bg-yellow-500',
                        notified: 'bg-blue-500',
                        accepted: 'bg-green-500',
                        rejected: 'bg-red-500',
                        expired: 'bg-gray-400',
                      }

                      return (
                        <div key={item.status} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              {getStatusBadge(item.status)}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{item.count}</span>
                              <span className="text-muted-foreground text-xs">
                                ({pct}%)
                              </span>
                            </div>
                          </div>
                          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                colorMap[item.status] ?? 'bg-gray-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Affected Airlines Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Plane className="size-4 text-orange-500" />
                  Compagnies les Plus Affectées
                </CardTitle>
                <CardDescription>
                  Classement des compagnies par nombre d&apos;alertes de rebooking
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky top-0 bg-background z-10">
                            Compagnie
                          </TableHead>
                          <TableHead className="sticky top-0 bg-background z-10 text-right">
                            Alertes
                          </TableHead>
                          <TableHead className="sticky top-0 bg-background z-10 text-right w-[80px]">
                            Part
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {effectiveStats.affectedAirlines.map((item, idx) => {
                          const maxCount = Math.max(
                            ...effectiveStats.affectedAirlines.map((a) => a.alertCount),
                            1
                          )
                          const pct = Math.round(
                            (item.alertCount / effectiveStats.totalAlerts) * 100
                          )
                          const barPct = Math.round(
                            (item.alertCount / maxCount) * 100
                          )

                          return (
                            <TableRow key={item.airline}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-muted-foreground font-mono w-5">
                                    {idx + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {item.airline}
                                    </p>
                                    <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[140px]">
                                      <div
                                        className="h-full rounded-full bg-orange-500 transition-all duration-500"
                                        style={{ width: `${barPct}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {item.alertCount}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground text-sm">
                                {pct}%
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab 2: Alertes ─────────────────────────────────────────── */}
        <TabsContent value="alertes" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="size-4 text-orange-500" />
                    Journal des Alertes de Rebooking
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Historique des détections d&apos;annulations et propositions de rebooking
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Rechercher par vol..."
                    className="h-8 text-sm w-[180px]"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">
                    Chargement des alertes...
                  </span>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky top-0 bg-background z-10">
                          Vol Original
                        </TableHead>
                        <TableHead className="sticky top-0 bg-background z-10">
                          Compagnie
                        </TableHead>
                        <TableHead className="hidden sm:table-cell sticky top-0 bg-background z-10">
                          Téléphone
                        </TableHead>
                        <TableHead className="sticky top-0 bg-background z-10">
                          Statut
                        </TableHead>
                        <TableHead className="hidden md:table-cell sticky top-0 bg-background z-10 text-right">
                          Date
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {effectiveLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono font-medium">
                            {log.originalFlight}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.airline}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {log.phone}
                          </TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell className="hidden md:table-cell text-right text-sm text-muted-foreground">
                            {new Date(log.createdAt).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
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

        {/* ── Tab 3: Vols Affectés ───────────────────────────────────── */}
        <TabsContent value="flights" className="mt-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Plane className="size-4 text-orange-500" />
                  Vols les Plus Affectés
                </CardTitle>
                <CardDescription className="mt-1">
                  Classement des vols ayant généré le plus d&apos;alertes de rebooking
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">
                    Chargement des vols...
                  </span>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky top-0 bg-background z-10 w-[60px]">
                          #
                        </TableHead>
                        <TableHead className="sticky top-0 bg-background z-10">
                          Vol
                        </TableHead>
                        <TableHead className="sticky top-0 bg-background z-10">
                          Compagnie
                        </TableHead>
                        <TableHead className="sticky top-0 bg-background z-10 text-right">
                          Alertes
                        </TableHead>
                        <TableHead className="hidden sm:table-cell sticky top-0 bg-background z-10">
                          Fréquence
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {effectiveStats.affectedFlights.map((flight, idx) => {
                        const maxCount = Math.max(
                          ...effectiveStats.affectedFlights.map((f) => f.alertCount),
                          1
                        )
                        const barPct = Math.round((flight.alertCount / maxCount) * 100)

                        return (
                          <TableRow key={flight.flightNumber}>
                            <TableCell className="font-mono text-muted-foreground text-sm">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="font-mono font-medium">
                              <div className="flex items-center gap-2">
                                <Plane className="size-3.5 text-orange-500" />
                                {flight.flightNumber}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {flight.airline}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700"
                                variant="outline"
                              >
                                {flight.alertCount}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <div className="h-2 rounded-full bg-muted overflow-hidden max-w-[120px]">
                                <div
                                  className="h-full rounded-full bg-orange-500 transition-all duration-500"
                                  style={{ width: `${barPct}%` }}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
