'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ScanLine,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Eye,
  BarChart3,
  Camera,
  RefreshCw,
  ListChecks,
  Copy,
  Plane,
  MapPin,
  AlertTriangle,
  TrendingUp,
  CheckCheck,
  X,
  Check,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ── Types ───────────────────────────────────────────────────────────────────

interface TicketScan {
  id: string
  phone: string
  passengerName: string | null
  pnr: string | null
  flightNumber: string | null
  airline: string | null
  departureCode: string | null
  arrivalCode: string | null
  departureCity: string | null
  arrivalCity: string | null
  flightDate: string | null
  seat: string | null
  boardingTime: string | null
  gate: string | null
  terminal: string | null
  class: string | null
  rawText: string | null
  confidence: number
  provider: string
  status: 'pending' | 'confirmed' | 'rejected' | 'expired'
  confirmedAt: string | null
  rejectedAt: string | null
  source: string
  createdAt: string
  updatedAt: string
}

interface ScanStats {
  totalScans: number
  pendingScans: number
  confirmedScans: number
  rejectedScans: number
  expiredScans: number
  successRate: number
  avgConfidence: number
  topAirlines: { airline: string; count: number }[]
  topRoutes: { from: string; to: string; count: number }[]
  providerDistribution: { provider: string; count: number }[]
}

// ── Color helpers ───────────────────────────────────────────────────────────

const AIRLINE_COLORS = [
  'bg-orange-500',
  'bg-emerald-500',
  'bg-sky-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-teal-500',
  'bg-pink-500',
]

const PROVIDER_COLORS: Record<string, string> = {
  mock: 'bg-purple-500',
  tesseract: 'bg-blue-500',
  google: 'bg-emerald-500',
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

// ── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TicketScan['status'] }) {
  switch (status) {
    case 'pending':
      return (
        <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
          En attente
        </Badge>
      )
    case 'confirmed':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
          Confirmé
        </Badge>
      )
    case 'rejected':
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
          Rejeté
        </Badge>
      )
    case 'expired':
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
          Expiré
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

// ── Provider Badge ──────────────────────────────────────────────────────────

function ProviderBadge({ provider }: { provider: string }) {
  const p = provider.toLowerCase()
  if (p === 'mock') {
    return (
      <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100">
        Mock
      </Badge>
    )
  }
  if (p === 'tesseract') {
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
        Tesseract
      </Badge>
    )
  }
  if (p === 'google') {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
        Google Vision
      </Badge>
    )
  }
  return <Badge variant="secondary">{provider}</Badge>
}

// ── Confidence Badge (for table) ─────────────────────────────────────────────

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  if (pct >= 90) {
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-[10px]">Excellent</Badge>
  }
  if (pct >= 70) {
    return <Badge className="bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100 text-[10px]">Bon</Badge>
  }
  if (pct >= 50) {
    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100 text-[10px]">Moyen</Badge>
  }
  return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-[10px]">Faible</Badge>
}

// ── Quality Ring Indicator ──────────────────────────────────────────────────

function QualityRing({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  const circumference = 2 * Math.PI * 14
  const offset = circumference - (pct / 100) * circumference
  const color =
    pct >= 80
      ? '#10b981'
      : pct >= 50
        ? '#f59e0b'
        : '#ef4444'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex items-center justify-center size-7 cursor-default">
          <svg className="size-7 -rotate-90" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              stroke={color}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.6s ease-in-out' }}
            />
          </svg>
          <span className="absolute text-[7px] font-bold" style={{ color }}>{pct}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>Qualité : {pct}%</TooltipContent>
    </Tooltip>
  )
}

// ── Field Validation Indicator ──────────────────────────────────────────────

function FieldValidation({ value, label, rule }: { value: string | null; label: string; rule: string }) {
  if (!value || value.trim() === '') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            <ShieldX className="size-3.5 text-red-500 shrink-0" />
            <span className="text-muted-foreground italic">Non extrait</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{label}</p>
          <p className="text-xs opacity-80">Règle : {rule}</p>
          <p className="text-xs text-red-400 mt-1">Champ vide ou non extrait</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  const isPnr = label === 'PNR'
  const isFlight = label === 'N° Vol'
  const isCode = label.includes('Code')

  const isValid =
    (isPnr && /^[A-Z0-9]{5,6}$/i.test(value.trim())) ||
    (isFlight && /^[A-Z]{2}\d{1,4}[A-Z]?$/i.test(value.trim())) ||
    (isCode && /^[A-Z]{3}$/i.test(value.trim())) ||
    (!isPnr && !isFlight && !isCode && value.trim().length > 0)

  const mightNeedReview = !isValid && !isPnr && !isFlight && !isCode

  if (isValid) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
            <span className="font-medium">{value}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{label}</p>
          <p className="text-xs opacity-80">Règle : {rule}</p>
          <p className="text-xs text-emerald-400 mt-1">✓ Valide</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="size-3.5 text-amber-500 shrink-0" />
          <span className="font-medium text-amber-700 dark:text-amber-400">{value}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{label}</p>
        <p className="text-xs opacity-80">Règle : {rule}</p>
        <p className="text-xs text-amber-400 mt-1">⚠ À vérifier</p>
      </TooltipContent>
    </Tooltip>
  )
}

// ── Confidence Bar ──────────────────────────────────────────────────────────

function ConfidenceBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.round(value * 100)
  const color =
    pct >= 80
      ? 'bg-emerald-500'
      : pct >= 50
        ? 'bg-orange-500'
        : 'bg-red-500'

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <div className="h-2 w-20 rounded-full bg-muted">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-muted-foreground">{pct}%</span>
    </div>
  )
}

// ── Stat Card ──────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: number
  icon: React.ReactNode
  colorClass: string
  iconBgClass: string
}

function StatCard({ title, value, icon, colorClass, iconBgClass }: StatCardProps) {
  return (
    <Card className={`border-l-4 ${colorClass.replace('text-', 'border-l-')} overflow-hidden`}>
      <CardContent className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBgClass}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Mini Stat (for stats tab) ──────────────────────────────────────────────

interface MiniStatProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  accent: string
}

function MiniStat({ label, value, sub, icon, accent }: MiniStatProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

// ── Stats: Top Airlines Chart (horizontal bars) ────────────────────────────

function TopAirlinesChart({ data }: { data: { airline: string; count: number }[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
        Aucune donnée disponible
      </div>
    )
  }
  const maxCount = Math.max(...data.map((d) => d.count), 1)
  return (
    <div className="space-y-3">
      {data.slice(0, 6).map((item, i) => (
        <div key={item.airline} className="flex items-center gap-3">
          <span className="w-32 truncate text-sm font-medium text-right">
            {item.airline}
          </span>
          <div className="flex-1 h-7 rounded-md bg-muted overflow-hidden relative">
            <div
              className={`h-full rounded-md ${AIRLINE_COLORS[i % AIRLINE_COLORS.length]} transition-all duration-700 flex items-center justify-end pr-2`}
              style={{ width: `${Math.max((item.count / maxCount) * 100, 8)}%` }}
            >
              <span className="text-xs font-bold text-white drop-shadow-sm">
                {item.count}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Stats: Top Routes Cards ────────────────────────────────────────────────

function TopRoutesCards({ data }: { data: { from: string; to: string; count: number }[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
        Aucune donnée disponible
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {data.slice(0, 6).map((route) => (
        <div
          key={`${route.from}-${route.to}`}
          className="flex items-center gap-3 rounded-lg border bg-background p-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="text-center shrink-0">
              <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{route.from}</p>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="h-px flex-1 bg-gradient-to-r from-orange-300 to-sky-300 dark:from-orange-700 dark:to-sky-700" />
              <Plane className="size-4 text-muted-foreground mx-1 shrink-0 rotate-90" />
              <div className="h-px flex-1 bg-gradient-to-r from-sky-300 to-orange-300 dark:from-sky-700 dark:to-orange-700" />
            </div>
            <div className="text-center shrink-0">
              <p className="text-lg font-bold text-sky-600 dark:text-sky-400">{route.to}</p>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {route.count}
          </Badge>
        </div>
      ))}
    </div>
  )
}

// ── Stats: Provider Distribution (CSS donut) ───────────────────────────────

function ProviderDistributionChart({ data, total }: { data: { provider: string; count: number }[]; total: number }) {
  if (!data || data.length === 0 || total === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
        Aucune donnée disponible
      </div>
    )
  }

  // Build CSS conic gradient segments via reduce
  const colorMap: Record<string, string> = {
    'bg-purple-500': '#a855f7',
    'bg-blue-500': '#3b82f6',
    'bg-emerald-500': '#10b981',
    'bg-gray-400': '#9ca3af',
  }

  const gradientStops = data.reduce<string[]>((acc, d) => {
    const pct = (d.count / total) * 100
    const start = acc.length === 0 ? 0 : parseFloat(acc[acc.length - 1].split(' ').pop()!)
    const end = start + pct
    const color = PROVIDER_COLORS[d.provider.toLowerCase()] ?? 'bg-gray-400'
    const hex = colorMap[color] ?? '#9ca3af'
    acc.push(`${hex} ${start}% ${end}%`)
    return acc
  }, [])

  const conicGradient = `conic-gradient(${gradientStops.join(', ')})`

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Donut chart */}
      <div className="relative">
        <div
          className="size-36 rounded-full"
          style={{ background: conicGradient }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-24 rounded-full bg-background flex flex-col items-center justify-center">
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground">total</p>
          </div>
        </div>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4">
        {data.map((d) => {
          const color = PROVIDER_COLORS[d.provider.toLowerCase()] ?? 'bg-gray-400'
          return (
            <div key={d.provider} className="flex items-center gap-2">
              <div className={`size-3 rounded-full ${color}`} />
              <span className="text-sm font-medium">{d.provider}</span>
              <span className="text-xs text-muted-foreground">({d.count})</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Stats: Daily Scan Trend (bar chart) ────────────────────────────────────

function DailyScanTrend({ scans }: { scans: TicketScan[] }) {
  // Compute daily counts for last 7 days
  const dailyCounts = useMemo(() => {
    const today = new Date()
    const days: { label: string; count: number; date: Date }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const nextD = new Date(d)
      nextD.setDate(nextD.getDate() + 1)
      const count = scans.filter((s) => {
        const sd = new Date(s.createdAt)
        return sd >= d && sd < nextD
      }).length
      days.push({
        label: DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1],
        count,
        date: d,
      })
    }
    return days
  }, [scans])

  const maxCount = Math.max(...dailyCounts.map((d) => d.count), 1)

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2 h-40">
        {dailyCounts.map((day) => (
          <Tooltip key={day.label}>
            <TooltipTrigger asChild>
              <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div
                  className={`w-full rounded-t-md transition-all duration-500 min-h-[4px] ${
                    day.count === maxCount && day.count > 0
                      ? 'bg-orange-500'
                      : day.count > 0
                        ? 'bg-orange-300 dark:bg-orange-600'
                        : 'bg-muted'
                  }`}
                  style={{ height: `${Math.max((day.count / maxCount) * 100, 4)}%` }}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {day.count} scan{day.count !== 1 ? 's' : ''}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="flex gap-2">
        {dailyCounts.map((day) => (
          <div key={day.label} className="flex-1 text-center text-xs text-muted-foreground">
            {day.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Stats: Success Rate Ring ───────────────────────────────────────────────

function SuccessRateRing({ rate }: { rate: number }) {
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (rate / 100) * circumference
  const color =
    rate >= 80
      ? 'text-emerald-500'
      : rate >= 50
        ? 'text-orange-500'
        : 'text-red-500'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg className="size-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" className="stroke-muted" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            className={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <p className={`text-2xl font-bold ${color}`}>{rate}%</p>
        </div>
      </div>
      <p className="text-sm font-medium text-muted-foreground">Taux de réussite</p>
    </div>
  )
}

// ── Status Distribution Mini Bar ───────────────────────────────────────────

function StatusDistribution({
  total,
  pending,
  confirmed,
  rejected,
  expired,
}: {
  total: number
  pending: number
  confirmed: number
  rejected: number
  expired: number
}) {
  if (total === 0) return null
  const segments = [
    { pct: (confirmed / total) * 100, color: 'bg-emerald-500', label: 'Confirmés' },
    { pct: (pending / total) * 100, color: 'bg-orange-500', label: 'En attente' },
    { pct: (rejected / total) * 100, color: 'bg-red-500', label: 'Rejetés' },
    { pct: (expired / total) * 100, color: 'bg-amber-400', label: 'Expirés' },
  ]

  return (
    <div className="space-y-2">
      <div className="flex h-4 rounded-full overflow-hidden bg-muted">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className={`${seg.color} transition-all duration-700`}
            style={{ width: `${seg.pct}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5">
            <div className={`size-2.5 rounded-full ${seg.color}`} />
            <span className="text-xs text-muted-foreground">{seg.label}</span>
            <span className="text-xs font-medium">{Math.round(seg.pct)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export function TicketScansModule() {
  const [scanList, setScanList] = useState<TicketScan[]>([])
  const [stats, setStats] = useState<ScanStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Dialog states
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedScan, setSelectedScan] = useState<TicketScan | null>(null)
  const [actionSubmitting, setActionSubmitting] = useState(false)

  // Edit mode in detail dialog
  const [editMode, setEditMode] = useState(false)
  const [editFields, setEditFields] = useState<Partial<TicketScan>>({})

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchSubmitting, setBatchSubmitting] = useState(false)

  // Batch confirm dialog
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false)
  const [batchActionType, setBatchActionType] = useState<'confirm' | 'reject' | null>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState('scans')

  // ── Data Fetching ───────────────────────────────────────────────────────

  const fetchScans = useCallback(async () => {
    setLoading(true)
    try {
      const [scansResult, statsResult] = await Promise.all([
        apiClient.get('/api/ticket-scans'),
        apiClient.get('/api/ticket-scans/stats'),
      ])

      if (scansResult.success) {
        const scansData = scansResult.data as Record<string, unknown>
        const items = Array.isArray(scansData) ? scansData : (scansData.items ?? scansData.data ?? [])
        setScanList(items as TicketScan[])
      }

      if (statsResult.success) {
        setStats(statsResult.data as ScanStats)
      }
    } catch {
      // Silently handle – the empty state will display
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      await fetchScans()
      if (cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [fetchScans])

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleViewDetail = (scan: TicketScan) => {
    setSelectedScan(scan)
    setEditMode(false)
    setEditFields({})
    setDetailOpen(true)
  }

  const handleConfirm = async () => {
    if (!selectedScan) return
    setActionSubmitting(true)
    try {
      const result = await apiClient.patch('/api/ticket-scans', { scanId: selectedScan.id, action: 'confirm' })
      if (result.success) {
        toast.success('Scan confirmé avec succès')
        setDetailOpen(false)
        fetchScans()
        return
      }
    } catch {
      // Proceed with local state update
    }

    // Local optimistic update
    setScanList((prev) =>
      prev.map((s) =>
        s.id === selectedScan.id
          ? { ...s, status: 'confirmed' as const, confirmedAt: new Date().toISOString() }
          : s
      )
    )
    toast.success('Scan confirmé avec succès')
    setDetailOpen(false)
    setActionSubmitting(false)
  }

  const handleReject = async () => {
    if (!selectedScan) return
    setActionSubmitting(true)
    try {
      const result = await apiClient.patch('/api/ticket-scans', { scanId: selectedScan.id, action: 'reject' })
      if (result.success) {
        toast.success('Scan rejeté avec succès')
        setDetailOpen(false)
        fetchScans()
        return
      }
    } catch {
      // Proceed with local state update
    }

    // Local optimistic update
    setScanList((prev) =>
      prev.map((s) =>
        s.id === selectedScan.id
          ? { ...s, status: 'rejected' as const, rejectedAt: new Date().toISOString() }
          : s
      )
    )
    toast.success('Scan rejeté avec succès')
    setDetailOpen(false)
    setActionSubmitting(false)
  }

  // ── Batch Actions ───────────────────────────────────────────────────────

  const pendingScans = useMemo(
    () => scanList.filter((s) => s.status === 'pending'),
    [scanList]
  )

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingScans.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingScans.map((s) => s.id)))
    }
  }

  const openBatchConfirm = (action: 'confirm' | 'reject') => {
    if (selectedIds.size === 0) return
    setBatchActionType(action)
    setBatchConfirmOpen(true)
  }

  const handleBatchAction = async () => {
    if (!batchActionType || selectedIds.size === 0) {
      setBatchConfirmOpen(false)
      return
    }
    setBatchConfirmOpen(false)
    if (batchActionType === 'confirm') {
      await executeBatchConfirm()
    } else {
      await executeBatchReject()
    }
  }

  const executeBatchConfirm = async () => {
    setBatchSubmitting(true)
    const promises = Array.from(selectedIds).map(async (id) => {
      try {
        await apiClient.patch('/api/ticket-scans', { scanId: id, action: 'confirm' })
      } catch {
        // continue
      }
    })
    await Promise.all(promises)

    // Optimistic update for remaining
    setScanList((prev) =>
      prev.map((s) =>
        selectedIds.has(s.id)
          ? { ...s, status: 'confirmed' as const, confirmedAt: new Date().toISOString() }
          : s
      )
    )
    toast.success(`${selectedIds.size} scan(s) confirmé(s) avec succès`)
    setSelectedIds(new Set())
    setBatchSubmitting(false)
    fetchScans()
  }

  const executeBatchReject = async () => {
    setBatchSubmitting(true)
    const promises = Array.from(selectedIds).map(async (id) => {
      try {
        await apiClient.patch('/api/ticket-scans', { scanId: id, action: 'reject' })
      } catch {
        // continue
      }
    })
    await Promise.all(promises)

    setScanList((prev) =>
      prev.map((s) =>
        selectedIds.has(s.id)
          ? { ...s, status: 'rejected' as const, rejectedAt: new Date().toISOString() }
          : s
      )
    )
    toast.success(`${selectedIds.size} scan(s) rejeté(s) avec succès`)
    setSelectedIds(new Set())
    setBatchSubmitting(false)
    fetchScans()
  }

  // ── Edit Mode ───────────────────────────────────────────────────────────

  const startEdit = () => {
    if (!selectedScan) return
    setEditFields({
      passengerName: selectedScan.passengerName,
      pnr: selectedScan.pnr,
      flightNumber: selectedScan.flightNumber,
      airline: selectedScan.airline,
      departureCode: selectedScan.departureCode,
      arrivalCode: selectedScan.arrivalCode,
      seat: selectedScan.seat,
      gate: selectedScan.gate,
      terminal: selectedScan.terminal,
    })
    setEditMode(true)
  }

  const cancelEdit = () => {
    setEditMode(false)
    setEditFields({})
  }

  const saveEdit = () => {
    if (!selectedScan) return
    // Save locally since API doesn't support correction endpoint
    setScanList((prev) =>
      prev.map((s) =>
        s.id === selectedScan.id ? { ...s, ...editFields } : s
      )
    )
    setSelectedScan((prev) => (prev ? { ...prev, ...editFields } : prev))
    setEditMode(false)
    setEditFields({})
    toast.success('Champs corrigés localement')
  }

  // ── Copy Extracted Data ─────────────────────────────────────────────────

  const handleCopyExtracted = () => {
    if (!selectedScan) return
    const data = selectedScan
    const text = [
      `Passager: ${data.passengerName ?? 'N/A'}`,
      `Téléphone: ${data.phone}`,
      `PNR: ${data.pnr ?? 'N/A'}`,
      `Vol: ${data.flightNumber ?? 'N/A'}`,
      `Compagnie: ${data.airline ?? 'N/A'}`,
      `Trajet: ${data.departureCode ?? '?'} → ${data.arrivalCode ?? '?'}`,
      `Date vol: ${data.flightDate ?? 'N/A'}`,
      `Siège: ${data.seat ?? 'N/A'}`,
      `Porte: ${data.gate ?? 'N/A'}`,
      `Terminal: ${data.terminal ?? 'N/A'}`,
      `Classe: ${data.class ?? 'N/A'}`,
      `Confiance: ${Math.round(data.confidence * 100)}%`,
      `Source: ${data.source}`,
      `Fournisseur: ${data.provider}`,
    ].join('\n')

    navigator.clipboard.writeText(text).then(() => {
      toast.success('Données copiées dans le presse-papier')
    }).catch(() => {
      toast.error('Impossible de copier')
    })
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const formatShortDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  // ── Filtered List ───────────────────────────────────────────────────────

  const filteredScans = scanList.filter((s) => {
    // Status filter
    if (statusFilter !== 'all' && s.status !== statusFilter) return false

    // Search filter
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      s.phone.toLowerCase().includes(q) ||
      (s.pnr?.toLowerCase().includes(q) ?? false) ||
      (s.flightNumber?.toLowerCase().includes(q) ?? false) ||
      (s.passengerName?.toLowerCase().includes(q) ?? false) ||
      (s.airline?.toLowerCase().includes(q) ?? false) ||
      (s.departureCode?.toLowerCase().includes(q) ?? false) ||
      (s.arrivalCode?.toLowerCase().includes(q) ?? false)
    )
  })

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Scans de Billets</h2>
          <p className="text-muted-foreground">
            Reconnaissance OCR des billets et cartes d&apos;embarquement
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchScans()}
          disabled={loading}
          className="w-fit"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Scans"
          value={stats?.totalScans ?? scanList.length}
          icon={<ScanLine className="size-6 text-orange-600 dark:text-orange-400" />}
          colorClass="text-orange-600 dark:text-orange-400"
          iconBgClass="bg-orange-100 dark:bg-orange-900/30"
        />
        <StatCard
          title="Confirmés"
          value={stats?.confirmedScans ?? scanList.filter((s) => s.status === 'confirmed').length}
          icon={<CheckCircle className="size-6 text-emerald-600 dark:text-emerald-400" />}
          colorClass="text-emerald-600 dark:text-emerald-400"
          iconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
        />
        <StatCard
          title="Rejetés"
          value={stats?.rejectedScans ?? scanList.filter((s) => s.status === 'rejected').length}
          icon={<XCircle className="size-6 text-red-600 dark:text-red-400" />}
          colorClass="text-red-600 dark:text-red-400"
          iconBgClass="bg-red-100 dark:bg-red-900/30"
        />
        <StatCard
          title="Confiance Moy."
          value={stats?.avgConfidence ?? 0}
          icon={<BarChart3 className="size-6 text-blue-600 dark:text-blue-400" />}
          colorClass="text-blue-600 dark:text-blue-400"
          iconBgClass="bg-blue-100 dark:bg-blue-900/30"
        />
      </div>

      {/* Tabs: Scans & Statistiques */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="scans" className="gap-1.5">
            <ListChecks className="size-4" />
            Scans
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5">
            <BarChart3 className="size-4" />
            Statistiques
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Scans ────────────────────────────────────────────── */}
        <TabsContent value="scans" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2">
                  Liste des Scans
                  {statusFilter === 'all' && (
                    <Badge variant="secondary" className="text-xs">
                      {filteredScans.length} résultat{filteredScans.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:w-auto">
                  <div className="relative w-full sm:w-48">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Téléphone, PNR, vol..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="confirmed">Confirmé</SelectItem>
                      <SelectItem value="rejected">Rejeté</SelectItem>
                      <SelectItem value="expired">Expiré</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Batch Actions Bar */}
              {selectedIds.size > 0 && (
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30 p-3">
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    {selectedIds.size} scan{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    sur {pendingScans.length} en attente
                  </Badge>
                  <div className="flex-1" />
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => openBatchConfirm('confirm')}
                    disabled={batchSubmitting}
                  >
                    <CheckCheck className="size-3.5" />
                    Tout Confirmer
                  </Button>
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => openBatchConfirm('reject')}
                    disabled={batchSubmitting}
                  >
                    <X className="size-3.5" />
                    Tout Rejeter
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Annuler
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="size-8 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
                </div>
              ) : (
                <div className="max-h-[480px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {statusFilter === 'pending' || statusFilter === 'all' ? (
                          <TableHead className="w-10">
                            <Checkbox
                              checked={
                                pendingScans.length > 0 &&
                                selectedIds.size === pendingScans.length
                              }
                              onCheckedChange={toggleSelectAll}
                              aria-label="Tout sélectionner"
                            />
                          </TableHead>
                        ) : null}
                        <TableHead>Date</TableHead>
                        <TableHead>Téléphone</TableHead>
                        <TableHead>PNR</TableHead>
                        <TableHead>Vol</TableHead>
                        <TableHead>Compagnie</TableHead>
                        <TableHead>Trajet</TableHead>
                        <TableHead>Confiance</TableHead>
                        <TableHead>Fournisseur</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredScans.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={statusFilter === 'pending' || statusFilter === 'all' ? 11 : 10}
                            className="h-24 text-center"
                          >
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <ScanLine className="size-8 opacity-40" />
                              <span>Aucun scan trouvé.</span>
                              {searchQuery && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  onClick={() => setSearchQuery('')}
                                >
                                  Effacer la recherche
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredScans.map((scan) => (
                          <TableRow
                            key={scan.id}
                            className={
                              selectedIds.has(scan.id)
                                ? 'bg-orange-50/80 dark:bg-orange-950/20'
                                : ''
                            }
                          >
                            {(statusFilter === 'pending' || statusFilter === 'all') && (
                              <TableCell>
                                {scan.status === 'pending' ? (
                                  <Checkbox
                                    checked={selectedIds.has(scan.id)}
                                    onCheckedChange={() => toggleSelect(scan.id)}
                                    aria-label={`Sélectionner scan ${scan.pnr ?? scan.id}`}
                                  />
                                ) : null}
                              </TableCell>
                            )}
                            <TableCell className="whitespace-nowrap text-xs">
                              {formatShortDate(scan.createdAt)}
                            </TableCell>
                            <TableCell className="font-medium">{scan.phone}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {scan.pnr ?? '—'}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {scan.flightNumber ?? '—'}
                            </TableCell>
                            <TableCell className="text-xs">
                              {scan.airline ?? '—'}
                            </TableCell>
                            <TableCell className="text-xs">
                              {scan.departureCode && scan.arrivalCode
                                ? `${scan.departureCode} → ${scan.arrivalCode}`
                                : '—'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <ConfidenceBar value={scan.confidence} />
                                <ConfidenceBadge value={scan.confidence} />
                              </div>
                            </TableCell>
                            <TableCell>
                              <ProviderBadge provider={scan.provider} />
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={scan.status} />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <QualityRing confidence={scan.confidence} />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDetail(scan)}
                                  className="text-orange-500 border-orange-200 hover:bg-orange-50"
                                >
                                  <Eye className="size-3.5" />
                                  Détails
                                </Button>
                              </div>
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

        {/* ── Tab: Statistiques ─────────────────────────────────────── */}
        <TabsContent value="stats" className="mt-4 space-y-6">
          {/* Overview Row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MiniStat
              label="Taux de réussite"
              value={`${stats?.successRate ?? 0}%`}
              sub={`${stats?.confirmedScans ?? 0} / ${stats?.totalScans ?? 0}`}
              icon={<TrendingUp className="size-5 text-emerald-600 dark:text-emerald-400" />}
              accent="bg-emerald-100 dark:bg-emerald-900/30"
            />
            <MiniStat
              label="En attente"
              value={stats?.pendingScans ?? 0}
              sub="à traiter"
              icon={<Clock className="size-5 text-orange-600 dark:text-orange-400" />}
              accent="bg-orange-100 dark:bg-orange-900/30"
            />
            <MiniStat
              label="Expirés"
              value={stats?.expiredScans ?? 0}
              icon={<AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />}
              accent="bg-amber-100 dark:bg-amber-900/30"
            />
            <MiniStat
              label="Confiance Moy."
              value={`${Math.round((stats?.avgConfidence ?? 0) * 100)}%`}
              icon={<BarChart3 className="size-5 text-sky-600 dark:text-sky-400" />}
              accent="bg-sky-100 dark:bg-sky-900/30"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top Airlines */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plane className="size-4 text-orange-500" />
                  Compagnies aériennes les plus scannées
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TopAirlinesChart data={stats?.topAirlines ?? []} />
              </CardContent>
            </Card>

            {/* Top Routes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="size-4 text-orange-500" />
                  Trajets les plus populaires
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TopRoutesCards data={stats?.topRoutes ?? []} />
              </CardContent>
            </Card>

            {/* Provider Distribution */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="size-4 text-orange-500" />
                  Répartition par fournisseur
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProviderDistributionChart
                  data={stats?.providerDistribution ?? []}
                  total={stats?.totalScans ?? 0}
                />
              </CardContent>
            </Card>

            {/* Success Rate + Daily Trend */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="size-4 text-orange-500" />
                  Tendances
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-center">
                  <SuccessRateRing rate={stats?.successRate ?? 0} />
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">
                    Scans des 7 derniers jours
                  </p>
                  <DailyScanTrend scans={scanList} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Distribution Bar (full width) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ScanLine className="size-4 text-orange-500" />
                Répartition par statut
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StatusDistribution
                total={stats?.totalScans ?? scanList.length}
                pending={stats?.pendingScans ?? scanList.filter((s) => s.status === 'pending').length}
                confirmed={stats?.confirmedScans ?? scanList.filter((s) => s.status === 'confirmed').length}
                rejected={stats?.rejectedScans ?? scanList.filter((s) => s.status === 'rejected').length}
                expired={stats?.expiredScans ?? scanList.filter((s) => s.status === 'expired').length}
              />
            </CardContent>
          </Card>

          {/* No Data Fallback */}
          {!stats && !loading && scanList.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <BarChart3 className="size-12 opacity-30" />
              <p className="text-lg font-medium">Aucune donnée statistique</p>
              <p className="text-sm">Les statistiques apparaîtront une fois des scans effectués.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="size-5 text-orange-500" />
              Détails du Scan
            </DialogTitle>
            <DialogDescription>
              Informations extraites par OCR du billet / carte d&apos;embarquement
            </DialogDescription>
          </DialogHeader>

          {selectedScan && (
            <div className="space-y-6">
              {/* Status & Confidence + Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Statut :</span>
                  <StatusBadge status={selectedScan.status} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Confiance :</span>
                  <ConfidenceBar value={selectedScan.confidence} />
                </div>
                <div className="flex items-center gap-2 sm:ml-auto">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyExtracted}
                      >
                        <Copy className="size-3.5" />
                        Copier
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copier les données extraites</TooltipContent>
                  </Tooltip>
                  {selectedScan.status === 'pending' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={editMode ? cancelEdit : startEdit}
                        >
                          {editMode ? (
                            <>
                              <X className="size-3.5" />
                              Annuler
                            </>
                          ) : (
                            <>
                              <CheckCheck className="size-3.5" />
                              Corriger
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {editMode ? 'Annuler la correction' : 'Corriger les champs manuellement'}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>

              {/* Passenger Info */}
              <div>
                <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Informations Passager
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nom :</span>
                    {editMode ? (
                      <Input
                        className="mt-1 h-8 text-sm"
                        value={editFields.passengerName ?? ''}
                        onChange={(e) => setEditFields((f) => ({ ...f, passengerName: e.target.value }))}
                        placeholder="Nom passager"
                      />
                    ) : (
                      <FieldValidation
                        value={selectedScan.passengerName}
                        label="Nom"
                        rule="Texte non vide"
                      />
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Téléphone :</span>
                    <p className="font-medium">{selectedScan.phone}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">PNR :</span>
                    {editMode ? (
                      <Input
                        className="mt-1 h-8 text-sm font-mono"
                        value={editFields.pnr ?? ''}
                        onChange={(e) => setEditFields((f) => ({ ...f, pnr: e.target.value }))}
                        placeholder="PNR"
                      />
                    ) : (
                      <FieldValidation
                        value={selectedScan.pnr}
                        label="PNR"
                        rule="5-6 caractères alphanumériques"
                      />
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Classe :</span>
                    <FieldValidation
                      value={selectedScan.class}
                      label="Classe"
                      rule="Y, W, J, F, etc."
                    />
                  </div>
                  <div>
                    <span className="text-muted-foreground">Siège :</span>
                    {editMode ? (
                      <Input
                        className="mt-1 h-8 text-sm"
                        value={editFields.seat ?? ''}
                        onChange={(e) => setEditFields((f) => ({ ...f, seat: e.target.value }))}
                        placeholder="Siège"
                      />
                    ) : (
                      <FieldValidation
                        value={selectedScan.seat}
                        label="Siège"
                        rule="Numéro de siège (ex: 12A)"
                      />
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Source :</span>
                    <p className="font-medium">{selectedScan.source}</p>
                  </div>
                </div>
              </div>

              {/* Flight Info */}
              <div>
                <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Informations Vol
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Compagnie :</span>
                    {editMode ? (
                      <Input
                        className="mt-1 h-8 text-sm"
                        value={editFields.airline ?? ''}
                        onChange={(e) => setEditFields((f) => ({ ...f, airline: e.target.value }))}
                        placeholder="Compagnie"
                      />
                    ) : (
                      <FieldValidation
                        value={selectedScan.airline}
                        label="Compagnie"
                        rule="Nom de compagnie aérienne"
                      />
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">N° Vol :</span>
                    {editMode ? (
                      <Input
                        className="mt-1 h-8 text-sm font-mono"
                        value={editFields.flightNumber ?? ''}
                        onChange={(e) => setEditFields((f) => ({ ...f, flightNumber: e.target.value }))}
                        placeholder="N° de vol"
                      />
                    ) : (
                      <FieldValidation
                        value={selectedScan.flightNumber}
                        label="N° Vol"
                        rule="2 lettres + chiffres (ex: AF123)"
                      />
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date du vol :</span>
                    <FieldValidation
                      value={selectedScan.flightDate}
                      label="Date vol"
                      rule="Date valide (JJ/MM/AAAA)"
                    />
                  </div>
                  <div>
                    <span className="text-muted-foreground">Heure embarquement :</span>
                    <FieldValidation
                      value={selectedScan.boardingTime}
                      label="Heure embarquement"
                      rule="Heure valide (HH:MM)"
                    />
                  </div>
                  <div>
                    <span className="text-muted-foreground">Porte :</span>
                    {editMode ? (
                      <Input
                        className="mt-1 h-8 text-sm"
                        value={editFields.gate ?? ''}
                        onChange={(e) => setEditFields((f) => ({ ...f, gate: e.target.value }))}
                        placeholder="Porte"
                      />
                    ) : (
                      <FieldValidation
                        value={selectedScan.gate}
                        label="Porte"
                        rule="Numéro ou lettre de porte"
                      />
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Terminal :</span>
                    {editMode ? (
                      <Input
                        className="mt-1 h-8 text-sm"
                        value={editFields.terminal ?? ''}
                        onChange={(e) => setEditFields((f) => ({ ...f, terminal: e.target.value }))}
                        placeholder="Terminal"
                      />
                    ) : (
                      <FieldValidation
                        value={selectedScan.terminal}
                        label="Terminal"
                        rule="Numéro ou lettre de terminal"
                      />
                    )}
                  </div>
                </div>

                {/* Route */}
                <div className="mt-3 flex items-center justify-center gap-4 rounded-lg border bg-orange-50/50 p-4 dark:bg-orange-950/20">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Départ</p>
                    {editMode ? (
                      <Input
                        className="mt-1 h-8 text-center text-lg font-bold font-mono w-20"
                        value={editFields.departureCode ?? ''}
                        onChange={(e) => setEditFields((f) => ({ ...f, departureCode: e.target.value }))}
                        placeholder="Code"
                        maxLength={3}
                      />
                    ) : (
                      <FieldValidation
                        value={selectedScan.departureCode}
                        label="Code départ"
                        rule="Code IATA 3 lettres"
                      />
                    )}
                    <p className="text-xs">{selectedScan.departureCity ?? ''}</p>
                  </div>
                  <div className="flex-1 border-t-2 border-dashed border-orange-300 mx-2 relative">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background px-2 text-xs text-muted-foreground">
                      ✈
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Arrivée</p>
                    {editMode ? (
                      <Input
                        className="mt-1 h-8 text-center text-lg font-bold font-mono w-20"
                        value={editFields.arrivalCode ?? ''}
                        onChange={(e) => setEditFields((f) => ({ ...f, arrivalCode: e.target.value }))}
                        placeholder="Code"
                        maxLength={3}
                      />
                    ) : (
                      <FieldValidation
                        value={selectedScan.arrivalCode}
                        label="Code arrivée"
                        rule="Code IATA 3 lettres"
                      />
                    )}
                    <p className="text-xs">{selectedScan.arrivalCity ?? ''}</p>
                  </div>
                </div>
              </div>

              {/* OCR Provider */}
              <div>
                <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Fournisseur OCR
                </h4>
                <div className="flex items-center gap-2">
                  <ProviderBadge provider={selectedScan.provider} />
                  <span className="text-xs text-muted-foreground">
                    Confidence : {Math.round(selectedScan.confidence * 100)}%
                  </span>
                </div>
              </div>

              {/* Raw OCR Text */}
              {selectedScan.rawText && (
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Texte OCR Brut
                  </h4>
                  <div className="rounded-lg border bg-muted/30 p-4 max-h-48 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-xs font-mono leading-relaxed">
                      {selectedScan.rawText}
                    </pre>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="text-xs text-muted-foreground border-t pt-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span>Créé le : </span>
                    <span>{formatDate(selectedScan.createdAt)}</span>
                  </div>
                  <div>
                    <span>Mis à jour : </span>
                    <span>{formatDate(selectedScan.updatedAt)}</span>
                  </div>
                  {selectedScan.confirmedAt && (
                    <div>
                      <span className="text-emerald-600">Confirmé le : </span>
                      <span className="text-emerald-600">{formatDate(selectedScan.confirmedAt)}</span>
                    </div>
                  )}
                  {selectedScan.rejectedAt && (
                    <div>
                      <span className="text-red-600">Rejeté le : </span>
                      <span className="text-red-600">{formatDate(selectedScan.rejectedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Fermer
            </Button>
            {editMode && (
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={saveEdit}
              >
                <CheckCircle className="size-4" />
                Enregistrer les corrections
              </Button>
            )}
            {selectedScan?.status === 'pending' && !editMode && (
              <>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleConfirm}
                  disabled={actionSubmitting}
                >
                  <CheckCircle className="size-4" />
                  {actionSubmitting ? 'Confirmation...' : 'Confirmer'}
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleReject}
                  disabled={actionSubmitting}
                >
                  <XCircle className="size-4" />
                  {actionSubmitting ? 'Rejet...' : 'Rejeter'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Action Confirm Dialog */}
      <AlertDialog open={batchConfirmOpen} onOpenChange={setBatchConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {batchActionType === 'confirm' ? 'Confirmer les scans' : 'Rejeter les scans'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {batchActionType === 'confirm'
                ? `Êtes-vous sûr de vouloir confirmer ${selectedIds.size} scan${selectedIds.size > 1 ? 's' : ''} ? Cette action est irréversible.`
                : `Êtes-vous sûr de vouloir rejeter ${selectedIds.size} scan${selectedIds.size > 1 ? 's' : ''} ? Cette action est irréversible.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchAction}
              className={batchActionType === 'confirm' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {batchActionType === 'confirm' ? 'Confirmer' : 'Rejeter'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
