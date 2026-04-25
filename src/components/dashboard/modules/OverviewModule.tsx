'use client'

import { useCallback } from 'react'
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
import { useAuth } from '@/components/auth/AuthGuard'
import {
  useDashboardKpis,
  useDashboardCharts,
  useDashboardPerformance,
  useDashboardActivity,
} from '@/hooks/useDashboardData'
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
  status: string
  time: string
}

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
    general: 'Général',
  }
  return map[intent] || intent
}

// ─── KPI Color Themes ────────────────────────────────────────────────────────

const kpiThemes = {
  orange: {
    cardBg: 'bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
    valueColor: 'text-white',
    titleColor: 'text-orange-100',
    trendUpColor: 'text-green-300',
    trendDownColor: 'text-red-200',
    vsColor: 'text-orange-200',
  },
  blue: {
    cardBg: 'bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
    valueColor: 'text-white',
    titleColor: 'text-blue-100',
    trendUpColor: 'text-green-300',
    trendDownColor: 'text-red-200',
    vsColor: 'text-blue-200',
  },
  green: {
    cardBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
    valueColor: 'text-white',
    titleColor: 'text-emerald-100',
    trendUpColor: 'text-green-300',
    trendDownColor: 'text-red-200',
    vsColor: 'text-emerald-200',
  },
  purple: {
    cardBg: 'bg-gradient-to-br from-violet-500 to-violet-600 dark:from-violet-600 dark:to-violet-700',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
    valueColor: 'text-white',
    titleColor: 'text-violet-100',
    trendUpColor: 'text-green-300',
    trendDownColor: 'text-red-200',
    vsColor: 'text-violet-200',
  },
} as const

// ─── Skeleton Components ─────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <Card className="bg-gradient-to-br from-gray-400 to-gray-500 dark:from-gray-500 dark:to-gray-600 overflow-hidden animate-pulse">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription className="text-sm font-medium bg-white/20 rounded h-4 w-24 text-transparent">
          Skeleton
        </CardDescription>
        <div className="rounded-xl p-2.5 bg-white/20 h-10 w-10" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-transparent bg-white/20 rounded h-7 w-20 mb-2" />
        <div className="flex items-center gap-1">
          <div className="h-3 w-12 bg-white/20 rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

function ChartSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <CardTitle className="text-base bg-muted rounded h-5 w-32" />
        <CardDescription className="bg-muted rounded h-4 w-48" />
      </CardHeader>
      <CardContent>
        <div className="h-[260px] bg-muted/50 rounded-lg" />
      </CardContent>
    </Card>
  )
}

function TableSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <CardTitle className="text-base bg-muted rounded h-5 w-40" />
        <CardDescription className="bg-muted rounded h-4 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 bg-muted rounded flex-1" />
              <div className="h-4 bg-muted rounded flex-1" />
              <div className="h-4 bg-muted rounded flex-1" />
              <div className="h-4 bg-muted rounded w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function OverviewModule() {
  // ── TanStack Query hooks ──────────────────────────────────────────────────
  const { data: kpi, isLoading: loadingKpi, isError: errorKpi } = useDashboardKpis()
  const { data: charts, isLoading: loadingCharts, isError: errorCharts } = useDashboardCharts()
  const { data: perf, isLoading: loadingPerf, isError: errorPerf } = useDashboardPerformance()
  const { data: activity, isLoading: loadingActivity } = useDashboardActivity(1, 5)

  // ── WebSocket temps réel ──────────────────────────────────────────────────
  const handleStatsUpdate = useCallback((_data: unknown) => {
    // TanStack Query refetch handles the update automatically via refetchInterval
    // WebSocket is used for instant push notifications (see RealTimeNotificationToast)
  }, [])

  const { airportCode } = useAuth()
  const { isConnected: wsConnected } = useAirportSocket(airportCode || 'DSS', {
    onStatsUpdate: handleStatsUpdate,
  })

  // ── Derived data ──────────────────────────────────────────────────────────
  const recentConversations = activity?.data || []

  const trafficData = charts?.traffic || []
  const intentsData = charts?.intents || []
  const languageData = charts?.languages || []
  const resolutionRate = perf?.resolutionRate ?? 0
  const avgResponseTime = perf?.avgResponseTime ?? 0
  const targetTime = perf?.targetTime ?? 2.0
  const totalConversations = perf?.totalConversations ?? kpi?.totalConversations ?? 0
  const resolvedConversations = perf?.resolvedConversations ?? 0
  const sparkline = perf?.sparkline || []

  const kpiCards = [
    {
      title: 'TOTAL CONVERSATIONS',
      value: loadingKpi ? '...' : (kpi?.totalConversations ?? 0).toLocaleString('fr-FR'),
      change: '+12%',
      trend: 'up' as const,
      icon: MessageSquare,
      theme: kpiThemes.orange,
    },
    {
      title: 'RECHERCHE VOLS AUJOURD\'HUI',
      value: loadingKpi ? '...' : (kpi?.totalFlightSearches ?? 0).toLocaleString('fr-FR'),
      change: '+8%',
      trend: 'up' as const,
      icon: Plane,
      theme: kpiThemes.blue,
    },
    {
      title: 'REVENUS AUJOURD\'HUI',
      value: loadingKpi ? '...' : formatCurrency(kpi?.revenueToday ?? 0),
      change: '+15%',
      trend: 'up' as const,
      icon: DollarSign,
      theme: kpiThemes.green,
    },
    {
      title: 'ALERTES ACTIVES',
      value: loadingKpi ? '...' : (kpi?.activeAlerts ?? 0).toString(),
      change: '-25%',
      trend: 'down' as const,
      icon: ShieldAlert,
      theme: kpiThemes.purple,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">TABLEAU DE BORD</h1>
            {wsConnected && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700 text-xs">
                ● TEMPS RÉEL
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Vue d&apos;ensemble de l&apos;activité du bot aéroport MAELLIS
          </p>
        </div>
      </div>

      {/* KPI Row — Colored Background Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingKpi
          ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
          : errorKpi
            ? <Card className="col-span-full"><CardContent className="py-8 text-center text-muted-foreground text-sm">Impossible de charger les KPIs — vérifiez la connexion au serveur</CardContent></Card>
            : kpiCards.map((card) => {
                const t = card.theme
                return (
                  <Card key={card.title} className={`${t.cardBg} overflow-hidden border-0 shadow-lg`}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardDescription className={`text-xs font-bold tracking-wider ${t.titleColor} uppercase`}>
                        {card.title}
                      </CardDescription>
                      <div className={`rounded-xl p-2.5 ${t.iconBg}`}>
                        <card.icon className={`size-5 ${t.iconColor}`} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${t.valueColor}`}>{card.value}</div>
                      <div className="flex items-center gap-1 mt-1">
                        {card.trend === 'up' ? (
                          <TrendingUp className="size-3.5 text-white" />
                        ) : (
                          <TrendingDown className="size-3.5 text-white" />
                        )}
                        <span className="text-xs font-semibold text-white">
                          {card.change}
                        </span>
                        <span className={`text-xs ${t.vsColor} ml-1`}>
                          vs hier
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Messages Chart */}
        {loadingCharts ? (
          <ChartSkeleton />
        ) : errorCharts ? (
          <Card><CardContent className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">Impossible de charger le graphique de trafic</CardContent></Card>
        ) : (
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
                        formatter={(value) => (
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
        )}

        {/* Intent Distribution Chart */}
        {loadingCharts ? (
          <ChartSkeleton />
        ) : intentsData.length === 0 ? (
          <Card><CardContent className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">Aucune donnée d&apos;intent disponible</CardContent></Card>
        ) : (
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
        )}
      </div>

      {/* Quick Stats Cards — Colored Backgrounds */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Languages — Violet */}
        {loadingCharts ? (
          <Card className="animate-pulse bg-gradient-to-br from-violet-500 to-violet-600"><CardContent className="py-8"><div className="h-3 bg-white/20 rounded-full w-full" /><div className="mt-4 grid grid-cols-2 gap-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-4 bg-white/20 rounded" />)}</div></CardContent></Card>
        ) : languageData.length === 0 ? (
          <Card className="bg-gradient-to-br from-violet-500 to-violet-600 dark:from-violet-600 dark:to-violet-700 border-0 shadow-lg overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-white">
                <div className="flex size-8 items-center justify-center rounded-lg bg-white/20">
                  <Globe className="size-4 text-white" />
                </div>
                <span className="uppercase text-xs font-bold tracking-wider">LANGUES UTILISÉES</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-8 text-white/80 text-sm">Aucune donnée</CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-br from-violet-500 to-violet-600 dark:from-violet-600 dark:to-violet-700 border-0 shadow-lg overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-white">
                <div className="flex size-8 items-center justify-center rounded-lg bg-white/20">
                  <Globe className="size-4 text-white" />
                </div>
                <span className="uppercase text-xs font-bold tracking-wider">LANGUES UTILISÉES</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex h-3 rounded-full overflow-hidden bg-white/20">
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
                    <span className="text-white/80">
                      {lang.code}
                    </span>
                    <span className="ml-auto font-semibold text-white">{lang.pct}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resolution Rate — Green */}
        {loadingPerf ? (
          <Card className="animate-pulse bg-gradient-to-br from-emerald-500 to-emerald-600"><CardContent className="py-8 flex justify-center"><div className="size-28 rounded-full bg-white/20" /></CardContent></Card>
        ) : (
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 border-0 shadow-lg overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-white">
                <div className="flex size-8 items-center justify-center rounded-lg bg-white/20">
                  <Zap className="size-4 text-white" />
                </div>
                <span className="uppercase text-xs font-bold tracking-wider">TAUX DE RÉSOLUTION</span>
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
                      className="text-white/20"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="white"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${resolutionRate * 2.51} ${100 * 2.51}`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {Math.round(resolutionRate * 100)}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-white/80">
                  {resolvedConversations} sur {totalConversations} résolues automatiquement
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Average Response Time — Blue */}
        {loadingPerf ? (
          <Card className="animate-pulse bg-gradient-to-br from-blue-500 to-blue-600"><CardContent className="py-8 flex flex-col items-center gap-3"><div className="h-10 w-24 bg-white/20 rounded" /><div className="flex items-end gap-1 h-10 w-32">{Array.from({ length: 12 }).map((_, i) => <div key={i} className="w-1.5 bg-white/20 rounded-sm" />)}</div></CardContent></Card>
        ) : (
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 border-0 shadow-lg overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-white">
                <div className="flex size-8 items-center justify-center rounded-lg bg-white/20">
                  <Clock className="size-4 text-white" />
                </div>
                <span className="uppercase text-xs font-bold tracking-wider">TEMPS DE RÉPONSE MOYEN</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center gap-3 py-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">
                    {avgResponseTime.toFixed(1)}
                  </span>
                  <span className="text-lg text-white/70">sec</span>
                </div>
                {/* Sparkline */}
                {sparkline.length > 0 ? (
                  <div className="flex items-end gap-1 h-10">
                    {sparkline.map((height, i) => (
                      <div
                        key={i}
                        className="w-1.5 rounded-sm bg-white/50"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-end gap-1 h-10">
                    {[35, 28, 42, 22, 30, 18, 15, 20, 12, 14, 10, 12].map(
                      (height, i) => (
                        <div
                          key={i}
                          className="w-1.5 rounded-sm bg-white/25"
                          style={{ height: `${height}%` }}
                        />
                      ),
                    )}
                  </div>
                )}
                <p className="text-xs text-white/80">
                  {avgResponseTime <= targetTime
                    ? `En dessous de l'objectif de ${targetTime} sec`
                    : `Au-dessus de l'objectif de ${targetTime} sec`}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activity Table */}
      {loadingActivity ? (
        <TableSkeleton />
      ) : recentConversations.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base uppercase tracking-wider font-bold">ACTIVITÉ RÉCENTE</CardTitle>
            <CardDescription>
              Les 5 dernières conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              Aucune conversation enregistrée
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base uppercase tracking-wider font-bold">ACTIVITÉ RÉCENTE</CardTitle>
            <CardDescription>
              Les 5 dernières conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="uppercase text-xs font-bold tracking-wider">Téléphone</TableHead>
                  <TableHead className="uppercase text-xs font-bold tracking-wider">Nom</TableHead>
                  <TableHead className="uppercase text-xs font-bold tracking-wider">Intent</TableHead>
                  <TableHead className="uppercase text-xs font-bold tracking-wider">Langue</TableHead>
                  <TableHead className="uppercase text-xs font-bold tracking-wider">Statut</TableHead>
                  <TableHead className="text-right uppercase text-xs font-bold tracking-wider">Heure</TableHead>
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
      )}
    </div>
  )
}
