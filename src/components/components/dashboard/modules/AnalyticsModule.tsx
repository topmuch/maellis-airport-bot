'use client'

import { useState } from 'react'
import {
  MessageSquare,
  Clock,
  Star,
  DollarSign,
  Zap,
  TrendingUp,
  TrendingDown,
  CalendarIcon,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type TimeRange = '7d' | '30d' | 'custom'

// ─── Mock Data ───────────────────────────────────────────────────────────────

// 30-day traffic data
const trafficData = Array.from({ length: 30 }, (_, i) => {
  const date = new Date()
  date.setDate(date.getDate() - (29 - i))
  const dayNum = date.getDate()
  return {
    date: `${dayNum}`,
    fullDate: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    messages: Math.floor(60 + Math.sin(i * 0.5) * 30 + Math.random() * 20),
  }
})

// Intents data for pie chart
const intentsData = [
  { name: 'Vols', value: 35, fill: '#f97316' },
  { name: 'Bagages', value: 15, fill: '#10b981' },
  { name: 'Transport', value: 14, fill: '#0ea5e9' },
  { name: 'Lounge', value: 10, fill: '#8b5cf6' },
  { name: 'Paiements', value: 12, fill: '#f59e0b' },
  { name: 'Urgences', value: 4, fill: '#f43f5e' },
  { name: 'Autres', value: 10, fill: '#6b7280' },
]

// Languages data for horizontal bar chart
const languagesData = [
  { name: 'Français', value: 65, fill: '#f97316' },
  { name: 'English', value: 20, fill: '#0ea5e9' },
  { name: 'Wolof', value: 10, fill: '#10b981' },
  { name: 'Arabe', value: 3, fill: '#8b5cf6' },
  { name: 'Espagnol', value: 2, fill: '#f59e0b' },
]

// 14-day revenue data
const revenueData = Array.from({ length: 14 }, (_, i) => {
  const date = new Date()
  date.setDate(date.getDate() - (13 - i))
  const dayNum = date.getDate()
  return {
    date: `${dayNum}`,
    fullDate: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    revenus: Math.floor(800 + Math.random() * 500),
  }
})

// KPI card definitions
const kpiCards = [
  {
    title: 'Trafic Messages',
    value: '2 847',
    change: '+18%',
    positive: true,
    icon: MessageSquare,
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    iconColor: 'text-orange-600 dark:text-orange-400',
    borderClass: 'border-l-orange-500',
    valueColor: 'text-orange-600 dark:text-orange-400',
  },
  {
    title: 'Temps Réponse Moyen',
    value: '1.2 sec',
    change: '-15%',
    positive: true,
    icon: Clock,
    iconBg: 'bg-cyan-100 dark:bg-cyan-900/30',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    borderClass: 'border-l-cyan-500',
    valueColor: 'text-cyan-600 dark:text-cyan-400',
  },
  {
    title: 'Taux Satisfaction NPS',
    value: '72',
    change: '+5%',
    positive: true,
    icon: Star,
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    borderClass: 'border-l-emerald-500',
    valueColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    title: 'Revenus du Jour',
    value: '1 245 000 FCFA',
    change: '+22%',
    positive: true,
    icon: DollarSign,
    iconBg: 'bg-violet-100 dark:bg-violet-900/30',
    iconColor: 'text-violet-600 dark:text-violet-400',
    borderClass: 'border-l-violet-500',
    valueColor: 'text-violet-600 dark:text-violet-400',
  },
  {
    title: 'Taux Résolution Auto',
    value: '94%',
    change: '+2%',
    positive: true,
    icon: Zap,
    iconBg: 'bg-sky-100 dark:bg-sky-900/30',
    iconColor: 'text-sky-600 dark:text-sky-400',
    borderClass: 'border-l-sky-500',
    valueColor: 'text-sky-600 dark:text-sky-400',
  },
]

// ─── Chart Configs ───────────────────────────────────────────────────────────

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

const languagesChartConfig = {
  value: {
    label: 'Pourcentage',
  },
  francais: { label: 'Français', color: '#f97316' },
  english: { label: 'English', color: '#0ea5e9' },
  wolof: { label: 'Wolof', color: '#10b981' },
  arabe: { label: 'Arabe', color: '#8b5cf6' },
  espagnol: { label: 'Espagnol', color: '#f59e0b' },
} satisfies ChartConfig

const revenueChartConfig = {
  revenus: {
    label: 'Revenus',
    color: '#10b981',
  },
} satisfies ChartConfig

// ─── Component ───────────────────────────────────────────────────────────────

export function AnalyticsModule() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined)
  const [calendarOpen, setCalendarOpen] = useState(false)

  const timeRangeButtons: { label: string; value: TimeRange }[] = [
    { label: '7 jours', value: '7d' },
    { label: '30 jours', value: '30d' },
    { label: 'Personnalisé', value: 'custom' },
  ]

  // NPS Score
  const npsScore = 72
  const circumference = 2 * Math.PI * 54
  const npsOffset = circumference - (npsScore / 100) * circumference

  // NPS breakdown data
  const npsBreakdown = [
    { label: 'Promoteurs', pct: 58, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500' },
    { label: 'Passifs', pct: 28, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500' },
    { label: 'Détracteurs', pct: 14, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics Avancés</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Analyses détaillées de l&apos;activité du bot aéroport MAELLIS
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          {timeRangeButtons.map((btn) => (
            <div key={btn.value}>
              {btn.value === 'custom' ? (
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={timeRange === 'custom' ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'gap-1.5',
                        timeRange === 'custom' && 'bg-orange-500 hover:bg-orange-600 text-white'
                      )}
                    >
                      <CalendarIcon className="size-3.5" />
                      {btn.label}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={customDate}
                      onSelect={(date) => {
                        setCustomDate(date)
                        if (date) {
                          setTimeRange('custom')
                          setCalendarOpen(false)
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <Button
                  variant={timeRange === btn.value ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    timeRange === btn.value && 'bg-orange-500 hover:bg-orange-600 text-white'
                  )}
                  onClick={() => setTimeRange(btn.value)}
                >
                  {btn.label}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpiCards.map((card) => (
          <Card key={card.title} className={`gap-4 border-l-4 ${card.borderClass} overflow-hidden`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-sm font-medium">
                {card.title}
              </CardDescription>
              <div className={cn('rounded-xl p-2.5', card.iconBg)}>
                <card.icon className={cn('size-5', card.iconColor)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={cn('text-2xl font-bold', card.valueColor)}>{card.value}</div>
              <div className="flex items-center gap-1 mt-1">
                {card.positive ? (
                  <TrendingUp className="size-3.5 text-emerald-500" />
                ) : (
                  <TrendingDown className="size-3.5 text-rose-500" />
                )}
                <span
                  className={cn(
                    'text-xs font-medium',
                    card.positive ? 'text-emerald-500' : 'text-rose-500'
                  )}
                >
                  {card.change}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  vs période préc.
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid 2x2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* a. Trafic Messages - Area Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trafic Messages</CardTitle>
            <CardDescription>Messages par jour — 30 derniers jours</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trafficChartConfig} className="h-[280px] w-full">
              <AreaChart
                data={trafficData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="fillTrafficAnalytics" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="fullDate"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                  interval={4}
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
                      labelFormatter={(value) => String(value)}
                      formatter={(value) => (
                        <span>{String(value)} messages</span>
                      )}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="messages"
                  stroke="#f97316"
                  fill="url(#fillTrafficAnalytics)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* b. Répartition Intents - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition Intents</CardTitle>
            <CardDescription>Distribution des requêtes par catégorie</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={intentsChartConfig} className="h-[280px] w-full">
              <PieChart>
                <Pie
                  data={intentsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {intentsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <span>{String(name)}: {String(value)}%</span>
                      )}
                    />
                  }
                />
              </PieChart>
            </ChartContainer>
            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
              {intentsData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 rounded-[2px] shrink-0"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* c. Langues Utilisées - Horizontal Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Langues Utilisées</CardTitle>
            <CardDescription>Répartition des langues de conversation</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={languagesChartConfig} className="h-[280px] w-full">
              <BarChart
                data={languagesData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={30}
                  unit="%"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={80}
                  fontSize={12}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => <span>{String(value)}%</span>}
                    />
                  }
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                  {languagesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* d. Revenus du Jour - Area Chart (Emerald) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenus du Jour</CardTitle>
            <CardDescription>Tendance quotidienne — 14 derniers jours</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueChartConfig} className="h-[280px] w-full">
              <AreaChart
                data={revenueData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="fullDate"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                  interval={2}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={55}
                  tickFormatter={(v) => `${v}K FCFA`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => String(value)}
                      formatter={(value) => (
                        <span>{new Intl.NumberFormat('fr-FR').format(Number(value) * 1000)} FCFA</span>
                      )}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenus"
                  stroke="#10b981"
                  fill="url(#fillRevenue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* NPS Score Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Score NPS (Net Promoter Score)</CardTitle>
          <CardDescription>Satisfaction client basée sur les retours utilisateurs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* NPS Gauge */}
            <div className="relative size-40 shrink-0">
              <svg className="size-40 -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-muted/20"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={npsOffset}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {npsScore}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">Promoteurs</span>
              </div>
            </div>

            {/* NPS Breakdown */}
            <div className="flex-1 w-full space-y-6">
              {npsBreakdown.map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn('h-3 w-3 rounded-full', item.bg)} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <span className={cn('text-sm font-bold', item.color)}>
                      {item.pct}%
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-700', item.bg)}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}

              {/* NPS info badges */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="outline" className="text-xs">
                  <Star className="size-3 mr-1 text-emerald-500" />
                  Score Excellent
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <MessageSquare className="size-3 mr-1 text-orange-500" />
                  Basé sur 1 243 réponses
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <TrendingUp className="size-3 mr-1 text-emerald-500" />
                  +5 pts vs mois dernier
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
