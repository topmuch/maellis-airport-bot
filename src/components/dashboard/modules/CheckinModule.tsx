'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Ticket,
  Link2,
  Plane,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Loader2,
  RefreshCw,
  BarChart3,
  Users,
  ShieldCheck,
  Copy,
  ExternalLink,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CheckInSession {
  id: string
  phone: string
  passengerName: string
  flightNumber: string
  airline: string
  pnr: string
  departureCode: string
  arrivalCode: string
  flightDate: string
  checkInUrl: string | null
  seat: string | null
  gate: string | null
  terminal: string | null
  boardingPassUrl: string | null
  status: 'detected' | 'link_generated' | 'checkin_initiated' | 'completed' | 'failed'
  errorMessage: string | null
  createdAt: string
}

interface CheckInStats {
  totalSessions: number
  sessionsLast7Days: number
  statusBreakdown: { status: string; count: number }[]
  airlineBreakdown: { airline: string; count: number }[]
}

interface CheckInTestForm {
  airline: string
  pnr: string
  phone: string
}

// ─── Supported Airlines ──────────────────────────────────────────────────────

const SUPPORTED_AIRLINES = [
  {
    name: 'Air France',
    code: 'AF',
    checkInDomain: 'airfrance.com/checkin',
    color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  },
  {
    name: 'Ethiopian Airlines',
    code: 'ET',
    checkInDomain: 'ethiopianairlines.com/checkin',
    color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  },
  {
    name: 'ASKY',
    code: 'KP',
    checkInDomain: 'flyasky.com/checkin',
    color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  },
]

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_SESSIONS: CheckInSession[] = [
  {
    id: 'ci-001',
    phone: '+221 77 123 45 67',
    passengerName: 'Amadou Diallo',
    flightNumber: 'AF 722',
    airline: 'Air France',
    pnr: 'XYZ123AB',
    departureCode: 'DSS',
    arrivalCode: 'CDG',
    flightDate: '2025-07-15',
    checkInUrl: 'https://www.airfrance.com/checkin?pnr=XYZ123AB',
    seat: '14A',
    gate: 'A3',
    terminal: 'T1',
    boardingPassUrl: null,
    status: 'completed',
    errorMessage: null,
    createdAt: '2025-07-10T08:30:00Z',
  },
  {
    id: 'ci-002',
    phone: '+221 78 987 65 43',
    passengerName: 'Fatou Sow',
    flightNumber: 'ET 912',
    airline: 'Ethiopian Airlines',
    pnr: 'DEF456CD',
    departureCode: 'DSS',
    arrivalCode: 'ADD',
    flightDate: '2025-07-18',
    checkInUrl: 'https://www.ethiopianairlines.com/checkin?pnr=DEF456CD',
    seat: null,
    gate: null,
    terminal: null,
    boardingPassUrl: null,
    status: 'link_generated',
    errorMessage: null,
    createdAt: '2025-07-12T14:00:00Z',
  },
  {
    id: 'ci-003',
    phone: '+221 76 555 44 33',
    passengerName: 'Ibrahim Keita',
    flightNumber: 'KP 202',
    airline: 'ASKY',
    pnr: 'GHI789EF',
    departureCode: 'DSS',
    arrivalCode: 'LFW',
    flightDate: '2025-07-20',
    checkInUrl: 'https://www.flyasky.com/checkin?pnr=GHI789EF',
    seat: '7C',
    gate: 'B2',
    terminal: 'T2',
    boardingPassUrl: null,
    status: 'checkin_initiated',
    errorMessage: null,
    createdAt: '2025-07-13T10:15:00Z',
  },
  {
    id: 'ci-004',
    phone: '+221 77 111 22 33',
    passengerName: 'Awa Ndiaye',
    flightNumber: 'AF 724',
    airline: 'Air France',
    pnr: 'JKL012GH',
    departureCode: 'CDG',
    arrivalCode: 'DSS',
    flightDate: '2025-07-22',
    checkInUrl: null,
    seat: null,
    gate: null,
    terminal: null,
    boardingPassUrl: null,
    status: 'detected',
    errorMessage: null,
    createdAt: '2025-07-14T06:45:00Z',
  },
  {
    id: 'ci-005',
    phone: '+221 78 444 55 66',
    passengerName: 'Moussa Traoré',
    flightNumber: 'ET 914',
    airline: 'Ethiopian Airlines',
    pnr: 'MNO345IJ',
    departureCode: 'DSS',
    arrivalCode: 'NBO',
    flightDate: '2025-07-16',
    checkInUrl: null,
    seat: null,
    gate: null,
    terminal: null,
    boardingPassUrl: null,
    status: 'failed',
    errorMessage: 'PNR non reconnu par le système de la compagnie',
    createdAt: '2025-07-11T16:20:00Z',
  },
  {
    id: 'ci-006',
    phone: '+221 76 222 33 44',
    passengerName: 'Mariam Ba',
    flightNumber: 'AF 720',
    airline: 'Air France',
    pnr: 'PQR678KL',
    departureCode: 'DSS',
    arrivalCode: 'ORY',
    flightDate: '2025-07-25',
    checkInUrl: 'https://www.airfrance.com/checkin?pnr=PQR678KL',
    seat: '22F',
    gate: 'C1',
    terminal: 'T1',
    boardingPassUrl: null,
    status: 'completed',
    errorMessage: null,
    createdAt: '2025-07-09T11:00:00Z',
  },
  {
    id: 'ci-007',
    phone: '+221 77 888 99 00',
    passengerName: 'Ousmane Diop',
    flightNumber: 'KP 301',
    airline: 'ASKY',
    pnr: 'STU901MN',
    departureCode: 'DSS',
    arrivalCode: 'ACC',
    flightDate: '2025-07-19',
    checkInUrl: null,
    seat: null,
    gate: null,
    terminal: null,
    boardingPassUrl: null,
    status: 'detected',
    errorMessage: null,
    createdAt: '2025-07-13T09:30:00Z',
  },
  {
    id: 'ci-008',
    phone: '+221 78 333 22 11',
    passengerName: 'Aissatou Fall',
    flightNumber: 'ET 916',
    airline: 'Ethiopian Airlines',
    pnr: 'VWX234OP',
    departureCode: 'ADD',
    arrivalCode: 'DSS',
    flightDate: '2025-07-21',
    checkInUrl: 'https://www.ethiopianairlines.com/checkin?pnr=VWX234OP',
    seat: '3A',
    gate: 'A1',
    terminal: 'T1',
    boardingPassUrl: null,
    status: 'completed',
    errorMessage: null,
    createdAt: '2025-07-12T07:15:00Z',
  },
]

const MOCK_STATS: CheckInStats = {
  totalSessions: 147,
  sessionsLast7Days: 23,
  statusBreakdown: [
    { status: 'detected', count: 32 },
    { status: 'link_generated', count: 28 },
    { status: 'checkin_initiated', count: 19 },
    { status: 'completed', count: 58 },
    { status: 'failed', count: 10 },
  ],
  airlineBreakdown: [
    { airline: 'Air France', count: 72 },
    { airline: 'Ethiopian Airlines', count: 48 },
    { airline: 'ASKY', count: 27 },
  ],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusBadge(status: CheckInSession['status']) {
  switch (status) {
    case 'detected':
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800 flex items-center gap-1">
          <Clock className="size-3" />
          Détecté
        </Badge>
      )
    case 'link_generated':
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 flex items-center gap-1">
          <Link2 className="size-3" />
          Lien Généré
        </Badge>
      )
    case 'checkin_initiated':
      return (
        <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800 flex items-center gap-1">
          <Loader2 className="size-3 animate-spin" />
          Check-in Lancé
        </Badge>
      )
    case 'completed':
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 flex items-center gap-1">
          <CheckCircle2 className="size-3" />
          Complété
        </Badge>
      )
    case 'failed':
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 flex items-center gap-1">
          <XCircle className="size-3" />
          Échoué
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'detected': return 'Détecté'
    case 'link_generated': return 'Lien Généré'
    case 'checkin_initiated': return 'Check-in Lancé'
    case 'completed': return 'Complété'
    case 'failed': return 'Échoué'
    default: return status
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'detected': return 'bg-yellow-500'
    case 'link_generated': return 'bg-blue-500'
    case 'checkin_initiated': return 'bg-orange-500'
    case 'completed': return 'bg-green-500'
    case 'failed': return 'bg-red-500'
    default: return 'bg-gray-500'
  }
}

function getStatusBarColor(status: string): string {
  switch (status) {
    case 'detected': return 'bg-yellow-400'
    case 'link_generated': return 'bg-blue-400'
    case 'checkin_initiated': return 'bg-orange-400'
    case 'completed': return 'bg-green-400'
    case 'failed': return 'bg-red-400'
    default: return 'bg-gray-400'
  }
}

function getAirlineColor(airline: string): string {
  switch (airline) {
    case 'Air France': return 'bg-blue-400'
    case 'Ethiopian Airlines': return 'bg-green-400'
    case 'ASKY': return 'bg-amber-400'
    default: return 'bg-gray-400'
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

// ─── Stats Card ──────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  colorClass: string
  iconBgClass: string
  subtitle?: string
}

function StatCard({ title, value, icon, colorClass, iconBgClass, subtitle }: StatCardProps) {
  return (
    <Card className={`border-l-4 ${colorClass.replace('text-', 'border-l-')} overflow-hidden`}>
      <CardContent className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBgClass}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CheckinModule() {
  const [sessions, setSessions] = useState<CheckInSession[]>([])
  const [stats, setStats] = useState<CheckInStats>({
    totalSessions: 0,
    sessionsLast7Days: 0,
    statusBreakdown: [],
    airlineBreakdown: [],
  })
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Test form state
  const [testForm, setTestForm] = useState<CheckInTestForm>({
    airline: '',
    pnr: '',
    phone: '',
  })
  const [testResult, setTestResult] = useState<{
    url: string
    airline: string
    pnr: string
  } | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  // ── Data Fetching ───────────────────────────────────────────────────────

  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    setIsRefreshing(true)
    try {
      const [statsRes, sessionsRes] = await Promise.all([
        fetch('/api/checkin?stats=true'),
        fetch('/api/checkin'),
      ])

      if (statsRes.ok) {
        const data = await statsRes.json()
        if (data.totalSessions) {
          setStats(data)
        }
      }

      if (sessionsRes.ok) {
        const data = await sessionsRes.json()
        const items = Array.isArray(data) ? data : (data.data ?? data.items ?? [])
        if (items.length > 0) {
          setSessions(items)
          setIsRefreshing(false)
          if (showLoading) setLoading(false)
          return
        }
      }
    } catch {
      // API error — leave lists empty
    }
    setSessions([])
    setStats({
      totalSessions: 0,
      sessionsLast7Days: 0,
      statusBreakdown: [],
      airlineBreakdown: [],
    })
    setIsRefreshing(false)
    if (showLoading) setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      await fetchData(true)
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [fetchData])

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleRefresh = () => {
    fetchData(false)
  }

  const handleTestCheckIn = async () => {
    if (!testForm.airline || !testForm.pnr || !testForm.phone) {
      toast.error('Veuillez remplir tous les champs')
      return
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testForm.phone,
          flightNumber: 'TEST',
          airline: testForm.airline,
          pnr: testForm.pnr,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.checkInUrl) {
          setTestResult({
            url: data.checkInUrl,
            airline: testForm.airline,
            pnr: testForm.pnr,
          })
          toast.success('Lien de check-in généré avec succès')
          setIsTesting(false)
          return
        }
      }
    } catch {
      // Fallback to local generation
    }

    // Local fallback: generate a simulated link
    const airline = SUPPORTED_AIRLINES.find((a) => a.name === testForm.airline)
    const domain = airline?.checkInDomain ?? 'example.com/checkin'
    const generatedUrl = `https://www.${domain}?pnr=${testForm.pnr.toUpperCase()}&lang=fr`

    setTestResult({
      url: generatedUrl,
      airline: testForm.airline,
      pnr: testForm.pnr,
    })
    toast.success('Lien de check-in simulé avec succès')
    setIsTesting(false)
  }

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Lien copié dans le presse-papiers')
    }).catch(() => {
      toast.error('Impossible de copier le lien')
    })
  }

  // ── Computed Values ────────────────────────────────────────────────────

  const successRate = (() => {
    const completed = stats.statusBreakdown.find((s) => s.status === 'completed')?.count ?? 0
    const total = stats.totalSessions || 1
    return Math.round((completed / total) * 100)
  })()

  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      s.passengerName?.toLowerCase().includes(q) ||
      s.flightNumber?.toLowerCase().includes(q) ||
      s.airline?.toLowerCase().includes(q) ||
      s.pnr?.toLowerCase().includes(q) ||
      s.phone?.includes(q) ||
      s.status?.includes(q)
    )
  })

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <span className="text-2xl">🎫</span>
          Billetterie & Check-in One-Click
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Génération automatique de liens de check-in — Détection des vols à venir
        </p>
      </div>

      {/* Stats cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Sessions Totales"
          value={stats.totalSessions}
          icon={<Ticket className="size-6 text-orange-600 dark:text-orange-400" />}
          colorClass="text-orange-600 dark:text-orange-400"
          iconBgClass="bg-orange-100 dark:bg-orange-900/30"
          subtitle="depuis le lancement"
        />
        <StatCard
          title="Check-ins 7j"
          value={stats.sessionsLast7Days}
          icon={<Plane className="size-6 text-sky-600 dark:text-sky-400" />}
          colorClass="text-sky-600 dark:text-sky-400"
          iconBgClass="bg-sky-100 dark:bg-sky-900/30"
          subtitle="derniers 7 jours"
        />
        <StatCard
          title="Compagnies Supportées"
          value={SUPPORTED_AIRLINES.length}
          icon={<ShieldCheck className="size-6 text-emerald-600 dark:text-emerald-400" />}
          colorClass="text-emerald-600 dark:text-emerald-400"
          iconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
          subtitle="auto check-in actif"
        />
        <StatCard
          title="Taux de Réussite"
          value={`${successRate}%`}
          icon={<CheckCircle2 className="size-6 text-violet-600 dark:text-violet-400" />}
          colorClass="text-violet-600 dark:text-violet-400"
          iconBgClass="bg-violet-100 dark:bg-violet-900/30"
          subtitle={`${stats.statusBreakdown.find((s) => s.status === 'completed')?.count ?? 0} complétés`}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="stats" className="w-full">
        <TabsList>
          <TabsTrigger value="stats">
            📊 Statistiques
          </TabsTrigger>
          <TabsTrigger value="sessions">
            📋 Sessions
          </TabsTrigger>
          <TabsTrigger value="tester">
            🔗 Tester
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Statistiques ──────────────────────────────────────────── */}
        <TabsContent value="stats" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="size-4 text-orange-500" />
                  Répartition par Statut
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats.statusBreakdown.map((item) => {
                  const total = stats.statusBreakdown.reduce((sum, s) => sum + s.count, 0)
                  const percentage = Math.round((item.count / total) * 100)
                  return (
                    <div key={item.status} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${getStatusColor(item.status)}`} />
                          <span className="text-sm font-medium">
                            {getStatusLabel(item.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{item.count}</span>
                          <span className="text-xs text-muted-foreground">({percentage}%)</span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getStatusBarColor(item.status)}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Total</span>
                    <span className="text-sm font-bold">
                      {stats.statusBreakdown.reduce((sum, s) => sum + s.count, 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Airline Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Plane className="size-4 text-orange-500" />
                  Répartition par Compagnie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats.airlineBreakdown.map((item) => {
                  const total = stats.airlineBreakdown.reduce((sum, s) => sum + s.count, 0)
                  const percentage = Math.round((item.count / total) * 100)
                  return (
                    <div key={item.airline} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${getAirlineColor(item.airline)}`} />
                          <span className="text-sm font-medium">{item.airline}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{item.count}</span>
                          <span className="text-xs text-muted-foreground">({percentage}%)</span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getAirlineColor(item.airline)}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Total</span>
                    <span className="text-sm font-bold">
                      {stats.airlineBreakdown.reduce((sum, s) => sum + s.count, 0)}
                    </span>
                  </div>
                </div>

                {/* Supported Airlines Info */}
                <div className="mt-4 rounded-lg border border-dashed border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 p-4">
                  <h4 className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-3 flex items-center gap-2">
                    <ShieldCheck className="size-4" />
                    Compagnies Supportées pour Auto Check-in
                  </h4>
                  <div className="space-y-2">
                    {SUPPORTED_AIRLINES.map((airline) => (
                      <div
                        key={airline.name}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Badge className={airline.color}>{airline.code}</Badge>
                          <span>{airline.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                          {airline.checkInDomain}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab: Sessions ──────────────────────────────────────────────── */}
        <TabsContent value="sessions" className="space-y-4 mt-4">
          {/* Header with search and refresh */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" />
                Sessions de Check-in
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Historique de toutes les sessions de check-in automatique
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une session..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
          </div>

          {/* Status Summary Badges */}
          <div className="flex flex-wrap gap-2">
            {stats.statusBreakdown.map((item) => (
              <Badge
                key={item.status}
                className={`${item.status === 'detected'
                    ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : item.status === 'link_generated'
                      ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
                      : item.status === 'checkin_initiated'
                        ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400'
                        : item.status === 'completed'
                          ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400'
                  } border px-3 py-1`}
              >
                {getStatusLabel(item.status)} ({item.count})
              </Badge>
            ))}
          </div>

          {/* Sessions Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="size-8 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
                  <span className="ml-2 text-muted-foreground">
                    Chargement des sessions...
                  </span>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Passager</TableHead>
                        <TableHead>Vol</TableHead>
                        <TableHead>Compagnie</TableHead>
                        <TableHead>Porte</TableHead>
                        <TableHead>Siège</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSessions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            Aucune session trouvée.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSessions.map((session) => (
                          <TableRow key={session.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">
                                  {session.passengerName || '—'}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {session.pnr}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono font-medium text-sm">
                              {session.flightNumber}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">
                                  {session.departureCode}→{session.arrivalCode}
                                </span>
                              </div>
                              <span className="text-xs">{session.airline}</span>
                            </TableCell>
                            <TableCell>
                              {session.gate ? (
                                <span className="font-mono text-sm">{session.gate}</span>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {session.seat ? (
                                <span className="font-mono text-sm">{session.seat}</span>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(session.status)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDateTime(session.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Tester ────────────────────────────────────────────────── */}
        <TabsContent value="tester" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Test Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Link2 className="size-4 text-orange-500" />
                  Simuler un Check-in
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test-airline">Compagnie Aérienne *</Label>
                  <Select
                    value={testForm.airline}
                    onValueChange={(value) =>
                      setTestForm((prev) => ({ ...prev, airline: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionner une compagnie" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_AIRLINES.map((airline) => (
                        <SelectItem key={airline.name} value={airline.name}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">
                              {airline.code}
                            </span>
                            <span>{airline.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="test-pnr">Numéro PNR *</Label>
                  <Input
                    id="test-pnr"
                    placeholder="Ex: XYZ123AB"
                    value={testForm.pnr}
                    onChange={(e) =>
                      setTestForm((prev) => ({ ...prev, pnr: e.target.value.toUpperCase() }))
                    }
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Numéro de réservation de 6 caractères (ex: XYZ123AB)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="test-phone">Numéro de Téléphone *</Label>
                  <Input
                    id="test-phone"
                    placeholder="Ex: +221 77 123 45 67"
                    value={testForm.phone}
                    onChange={(e) =>
                      setTestForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Numéro de téléphone du passager pour la notification
                  </p>
                </div>

                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={handleTestCheckIn}
                  disabled={isTesting || !testForm.airline || !testForm.pnr || !testForm.phone}
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Link2 className="size-4" />
                      Générer le Lien de Check-in
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Result Display */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ExternalLink className="size-4 text-orange-500" />
                  Résultat de la Génération
                </CardTitle>
              </CardHeader>
              <CardContent>
                {testResult ? (
                  <div className="space-y-4">
                    {/* Success Banner */}
                    <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 p-4 dark:bg-green-950/30 dark:border-green-800">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                        <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                          Lien généré avec succès
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-500">
                          Le lien de check-in a été créé pour {testResult.airline}
                        </p>
                      </div>
                    </div>

                    {/* Link Details */}
                    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <span className="text-xs text-muted-foreground">Compagnie</span>
                          <p className="text-sm font-medium">{testResult.airline}</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">PNR</span>
                          <p className="text-sm font-mono font-medium">{testResult.pnr}</p>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Lien de Check-in</span>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="flex-1 rounded-md border bg-background px-3 py-2 text-xs font-mono break-all text-blue-600 dark:text-blue-400">
                            {testResult.url}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleCopyLink(testResult.url)}
                        >
                          <Copy className="size-3.5" />
                          Copier le Lien
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                          onClick={() => window.open(testResult.url, '_blank')}
                        >
                          <ExternalLink className="size-3.5" />
                          Ouvrir le Lien
                        </Button>
                      </div>
                    </div>

                    {/* Info Note */}
                    <div className="flex items-start gap-2 rounded-lg border border-dashed border-orange-200 bg-orange-50/50 p-3 dark:bg-orange-950/20">
                      <AlertTriangle className="size-4 text-orange-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        Ce lien redirige vers la page de check-in officielle de la compagnie. Le passager
                        devra saisir son PNR et ses informations personnelles pour finaliser le check-in.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                      <Ticket className="size-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Remplissez le formulaire pour simuler la génération d&apos;un lien de check-in automatique
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
