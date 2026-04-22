'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  MessageSquare,
  Plane,
  ShieldAlert,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Globe,
  Clock,
  Zap,
} from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAirportSocket } from '@/hooks/useAirportSocket'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'

// ─── Types ───────────────────────────────────────────────────────────────────

interface KpiData {
  totalConversations: number
  messagesToday: number
  activeAlerts: number
  revenueToday: number
  totalFlightSearches: number
  totalLoungeBookings: number
  totalTransportBookings: number
}

interface RecentConversation {
  id: string
  phone: string
  name: string
  intent: string
  language: string
  status: 'active' | 'closed' | 'escalated'
  time: string
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const fallbackKpi: KpiData = {
  totalConversations: 247,
  messagesToday: 89,
  activeAlerts: 3,
  revenueToday: 1245000,
  totalFlightSearches: 156,
  totalLoungeBookings: 34,
  totalTransportBookings: 78,
}

const trafficData = [
  { day: 'Lun', messages: 45 },
  { day: 'Mar', messages: 52 },
  { day: 'Mer', messages: 38 },
  { day: 'Jeu', messages: 65 },
  { day: 'Ven', messages: 72 },
  { day: 'Sam', messages: 48 },
  { day: 'Dim', messages: 55 },
]

const intentsData = [
  { name: 'vols', value: 45, fill: '#f97316' },
  { name: 'bagages', value: 15, fill: '#10b981' },
  { name: 'transport', value: 12, fill: '#0ea5e9' },
  { name: 'lounge', value: 8, fill: '#8b5cf6' },
  { name: 'paiements', value: 10, fill: '#f59e0b' },
  { name: 'urgences', value: 5, fill: '#f43f5e' },
  { name: 'autres', value: 5, fill: '#6b7280' },
]

const mockRecentConversations: RecentConversation[] = [
  {
    id: '1',
    phone: '+221 77 123 45 67',
    name: 'Aminata Diallo',
    intent: 'recherche_vol',
    language: 'FR',
    status: 'active',
    time: 'il y a 3 min',
  },
  {
    id: '2',
    phone: '+234 801 234 5678',
    name: 'Chukwuemeka Okafor',
    intent: 'bagages',
    language: 'EN',
    status: 'closed',
    time: 'il y a 12 min',
  },
  {
    id: '3',
    phone: '+225 07 89 01 23',
    name: 'Kouadio Yao',
    intent: 'transport',
    language: 'FR',
    status: 'active',
    time: 'il y a 25 min',
  },
  {
    id: '4',
    phone: '+221 76 456 78 90',
    name: 'Fatou Ndiaye',
    intent: 'urgence',
    language: 'WO',
    status: 'escalated',
    time: 'il y a 38 min',
  },
  {
    id: '5',
    phone: '+966 50 123 4567',
    name: 'Mohammed Al-Rashid',
    intent: 'lounge',
    language: 'AR',
    status: 'closed',
    time: 'il y a 1h',
  },
]

const languageData = [
  { code: 'FR', label: 'Français', pct: 65, color: 'bg-orange-500' },
  { code: 'EN', label: 'English', pct: 20, color: 'bg-sky-500' },
  { code: 'WO', label: 'Wolof', pct: 10, color: 'bg-amber-500' },
  { code: 'AR', label: 'العربية', pct: 5, color: 'bg-violet-500' },
]

// ─── Chart configs ───────────────────────────────────────────────────────────

const trafficChartConfig = {
  messages: {
    label: 'Messages',
    color: '#f97316',
  },
} satisfies ChartConfig

const intentsChartConfig = {
  value: {
    label: 'Pourcentage',
  },
  vols: { label: 'Vols', color: '#f97316' },
  bagages: { label: 'Bagages', color: '#10b981' },
  transport: { label: 'Transport', color: '#0ea5e9' },
  lounge: { label: 'Lounge', color: '#8b5cf6' },
  paiements: { label: 'Paiements', color: '#f59e0b' },
  urgences: { label: 'Urgences', color: '#f43f5e' },
  autres: { label: 'Autres', color: '#6b7280' },
} satisfies ChartConfig

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return (
        <Badge className="bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-800/30 dark:text-orange-400 dark:border-orange-700">
          Actif
        </Badge>
      )
    case 'closed':
      return (
        <Badge className="bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700">
          Fermé
        </Badge>
      )
    case 'escalated':
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
          Escaladé
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getIntentLabel(intent: string): string {
  const map: Record<string, string> = {
    recherche_vol: 'Recherche Vol',
    bagages: 'Bagages',
    transport: 'Transport',
    urgence: 'Urgence',
    lounge: 'Salon VIP',
    paiements: 'Paiement',
    autres: 'Autre',
  }
  return map[intent] || intent
}

// ─── Component ───────────────────────────────────────────────────────────────

export function OverviewModule() {
  const [kpi, setKpi] = useState<KpiData>(fallbackKpi)
  const [loading, setLoading] = useState(true)
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>(mockRecentConversations)

  // ── WebSocket temps réel ──────────────────────────────────────────────────
  const handleStatsUpdate = useCallback((data: unknown) => {
    const update = data as Partial<KpiData>
    setKpi((prev) => ({ ...prev, ...update }))
  }, [])

  const handleConversationNew = useCallback((data: unknown) => {
    const conv = data as RecentConversation
    setRecentConversations((prev) => [conv, ...prev].slice(0, 5))
  }, [])

  const { isConnected: wsConnected } = useAirportSocket('DSS', {
    onStatsUpdate: handleStatsUpdate,
    onConversationNew: handleConversationNew,
  })

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats')
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setKpi(data)
      } catch {
        setKpi(fallbackKpi)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const kpiCards = [
    {
      title: 'Total Conversations',
      value: loading ? '...' : kpi.totalConversations.toLocaleString('fr-FR'),
      change: '+12%',
      trend: 'up' as const,
      icon: MessageSquare,
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
      iconColor: 'text-orange-600 dark:text-orange-400',
      borderClass: 'border-l-orange-500',
      valueColor: 'text-orange-600 dark:text-orange-400',
    },
    {
      title: 'Recherche Vols Aujourd\'hui',
      value: loading ? '...' : kpi.totalFlightSearches.toLocaleString('fr-FR'),
      change: '+8%',
      trend: 'up' as const,
      icon: Plane,
      iconBg: 'bg-sky-100 dark:bg-sky-900/30',
      iconColor: 'text-sky-600 dark:text-sky-400',
      borderClass: 'border-l-sky-500',
      valueColor: 'text-sky-600 dark:text-sky-400',
    },
    {
      title: 'Alertes Actives',
      value: loading ? '...' : kpi.activeAlerts.toString(),
      change: '-25%',
      trend: 'down' as const,
      icon: ShieldAlert,
      iconBg: 'bg-rose-100 dark:bg-rose-900/30',
      iconColor: 'text-rose-600 dark:text-rose-400',
      borderClass: 'border-l-rose-500',
      valueColor: 'text-rose-600 dark:text-rose-400',
    },
    {
      title: 'Revenus Aujourd\'hui',
      value: loading ? '...' : formatCurrency(kpi.revenueToday),
      change: '+15%',
      trend: 'up' as const,
      icon: DollarSign,
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      borderClass: 'border-l-emerald-500',
      valueColor: 'text-emerald-600 dark:text-emerald-400',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Tableau de Bord</h1>
            {wsConnected && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700 text-xs">
                ● Temps réel
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Vue d&apos;ensemble de l&apos;activité du bot aéroport MAELLIS
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <Card key={card.title} className={`gap-4 border-l-4 ${card.borderClass} overflow-hidden`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-sm font-medium">
                {card.title}
              </CardDescription>
              <div className={`rounded-xl p-2.5 ${card.iconBg}`}>
                <card.icon className={`size-5 ${card.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.valueColor}`}>{card.value}</div>
              <div className="flex items-center gap-1 mt-1">
                {card.trend === 'up' ? (
                  <TrendingUp className="size-3.5 text-emerald-500" />
                ) : (
                  <TrendingDown className="size-3.5 text-rose-500" />
                )}
                <span
                  className={`text-xs font-medium ${
                    card.trend === 'up' && card.title === 'Alertes Actives'
                      ? 'text-rose-500'
                      : card.trend === 'up'
                        ? 'text-emerald-500'
                        : 'text-rose-500'
                  }`}
                >
                  {card.change}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  vs hier
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Messages Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trafic Messages</CardTitle>
            <CardDescription>Messages par jour — 7 derniers jours</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trafficChartConfig} className="h-[260px] w-full">
              <AreaChart
                data={trafficData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="fillMessages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={30}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => value}
                      formatter={(value, name) => (
                        <span>
                          {value} messages
                        </span>
                      )}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="messages"
                  stroke="#f97316"
                  fill="url(#fillMessages)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Intent Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition Intents</CardTitle>
            <CardDescription>Distribution des requêtes par catégorie</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={intentsChartConfig} className="h-[260px] w-full">
              <BarChart
                data={intentsData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={30}
                  unit="%"
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => <span>{value}%</span>}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {intentsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Languages */}
        <Card className="border-l-4 border-l-violet-500 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Globe className="size-4 text-violet-600 dark:text-violet-400" />
              </div>
              Langues Utilisées
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex h-3 rounded-full overflow-hidden bg-muted">
              {languageData.map((lang) => (
                <div
                  key={lang.code}
                  className={`${lang.color} transition-all`}
                  style={{ width: `${lang.pct}%` }}
                  title={`${lang.label}: ${lang.pct}%`}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {languageData.map((lang) => (
                <div key={lang.code} className="flex items-center gap-2 text-sm">
                  <div className={`size-2.5 rounded-full ${lang.color}`} />
                  <span className="text-muted-foreground">
                    {lang.code}
                  </span>
                  <span className="ml-auto font-medium">{lang.pct}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resolution Rate */}
        <Card className="border-l-4 border-l-emerald-500 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Zap className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              Taux de Résolution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center gap-2 py-2">
              <div className="relative size-28">
                <svg className="size-28 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted/30"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${94 * 2.51} ${100 * 2.51}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    94%
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                233 sur 247 résolues automatiquement
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Average Response Time */}
        <Card className="border-l-4 border-l-cyan-500 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                <Clock className="size-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              Temps de Réponse Moyen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center gap-3 py-2">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-cyan-600 dark:text-cyan-400">
                  1.2
                </span>
                <span className="text-lg text-muted-foreground">sec</span>
              </div>
              {/* Mini sparkline */}
              <div className="flex items-end gap-1 h-10">
                {[35, 28, 42, 22, 30, 18, 15, 20, 12, 14, 10, 12].map(
                  (height, i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-sm bg-cyan-400/70"
                      style={{ height: `${height}%` }}
                    />
                  )
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                En dessous de l&apos;objectif de 2 sec
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activité Récente</CardTitle>
          <CardDescription>
            Les 5 dernières conversations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Téléphone</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Intent</TableHead>
                <TableHead>Langue</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Heure</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentConversations.map((conv) => (
                <TableRow key={conv.id}>
                  <TableCell className="font-mono text-xs">
                    {conv.phone}
                  </TableCell>
                  <TableCell className="font-medium">{conv.name}</TableCell>
                  <TableCell>{getIntentLabel(conv.intent)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{conv.language}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(conv.status)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {conv.time}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
