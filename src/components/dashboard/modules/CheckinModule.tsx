'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api-client'
import { useNavigationStore } from '@/lib/store'
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
  ScanLine,
  UserPlus,
  UserMinus,
  ChevronRight,
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
  status: 'detected' | 'link_generated' | 'checkin_initiated' | 'completed' | 'failed' | 'pending' | 'expired'
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
  passengers: Passenger[]
}

interface Passenger {
  id: string
  nom: string
  prenom: string
  siege: string
}

interface DetectedFlight {
  id: string
  airlineName: string
  airlineCode: string
  flightNumber: string
  departureDate: string
  departureCode: string
  arrivalCode: string
  pnr?: string
  passengerName?: string
}

// ─── Supported Airlines (18 West African & international carriers) ────────────

const SUPPORTED_AIRLINES = [
  { name: 'Air Sénégal', code: 'HC', checkInDomain: 'air-senegal.com/check-in' },
  { name: 'Air France', code: 'AF', checkInDomain: 'airfrance.com/check-in' },
  { name: 'Ethiopian Airlines', code: 'ET', checkInDomain: 'ethiopianairlines.com/check-in' },
  { name: 'Emirates', code: 'EK', checkInDomain: 'emirates.com/check-in' },
  { name: 'Turkish Airlines', code: 'TK', checkInDomain: 'turkishairlines.com/check-in' },
  { name: 'ASKY', code: 'KP', checkInDomain: 'flyasky.com/check-in' },
  { name: 'Royal Air Maroc', code: 'AT', checkInDomain: 'royalairmaroc.com/check-in' },
  { name: 'Brussels Airlines', code: 'SN', checkInDomain: 'brusselsairlines.com/check-in' },
  { name: 'Mauritania Airlines', code: 'MR', checkInDomain: 'mauritania-airlines.com/check-in' },
  { name: 'Tunisair', code: 'TU', checkInDomain: 'tunisair.com/check-in' },
  { name: 'Kenya Airways', code: 'KQ', checkInDomain: 'kenya-airways.com/check-in' },
  { name: 'South African Airways', code: 'SA', checkInDomain: 'flysaa.com/check-in' },
  { name: 'Iberia', code: 'IB', checkInDomain: 'iberia.com/check-in' },
  { name: 'Copa Airlines', code: 'CM', checkInDomain: 'copaair.com/check-in' },
  { name: 'Corsair', code: 'SS', checkInDomain: 'corsair.com/check-in' },
  { name: 'Transavia', code: 'TO', checkInDomain: 'transavia.com/check-in' },
  { name: 'Delta Air Lines', code: 'DL', checkInDomain: 'delta.com/check-in' },
  { name: 'Lufthansa', code: 'LH', checkInDomain: 'lufthansa.com/check-in' },
]

// ─── Dynamic Airline Color System ────────────────────────────────────────────

const AIRLINE_DOT_COLORS = [
  'bg-blue-400', 'bg-green-400', 'bg-amber-400', 'bg-rose-400',
  'bg-violet-400', 'bg-teal-400', 'bg-orange-400', 'bg-cyan-400',
  'bg-lime-400', 'bg-fuchsia-400', 'bg-sky-400', 'bg-emerald-400',
  'bg-pink-400', 'bg-indigo-400', 'bg-yellow-400', 'bg-red-400',
  'bg-purple-400', 'bg-stone-400',
]

const AIRLINE_BADGE_STYLES = [
  'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
  'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800',
  'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800',
  'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800',
  'bg-lime-100 text-lime-700 border-lime-200 dark:bg-lime-900/30 dark:text-lime-400 dark:border-lime-800',
  'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-400 dark:border-fuchsia-800',
  'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800',
  'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800',
  'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800',
  'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
  'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-900/30 dark:text-stone-400 dark:border-stone-800',
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit int
  }
  return Math.abs(hash)
}

function getAirlineColor(airline: string): string {
  return AIRLINE_DOT_COLORS[hashString(airline) % AIRLINE_DOT_COLORS.length]
}

function getAirlineBadgeStyle(airline: string): string {
  return AIRLINE_BADGE_STYLES[hashString(airline) % AIRLINE_BADGE_STYLES.length]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusBadge(status: CheckInSession['status']) {
  switch (status) {
    case 'pending':
      return (
        <Badge className="bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800 flex items-center gap-1">
          <Clock className="size-3" />
          En attente
        </Badge>
      )
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
          Terminé
        </Badge>
      )
    case 'failed':
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 flex items-center gap-1">
          <XCircle className="size-3" />
          Échoué
        </Badge>
      )
    case 'expired':
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800 flex items-center gap-1">
          <AlertTriangle className="size-3" />
          Expiré
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'En attente'
    case 'detected': return 'Détecté'
    case 'link_generated': return 'Lien Généré'
    case 'checkin_initiated': return 'Check-in Lancé'
    case 'completed': return 'Terminé'
    case 'failed': return 'Échoué'
    case 'expired': return 'Expiré'
    default: return status
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending': return 'bg-gray-500'
    case 'detected': return 'bg-yellow-500'
    case 'link_generated': return 'bg-blue-500'
    case 'checkin_initiated': return 'bg-orange-500'
    case 'completed': return 'bg-green-500'
    case 'failed': return 'bg-red-500'
    case 'expired': return 'bg-yellow-500'
    default: return 'bg-gray-500'
  }
}

function getStatusBarColor(status: string): string {
  switch (status) {
    case 'pending': return 'bg-gray-400'
    case 'detected': return 'bg-yellow-400'
    case 'link_generated': return 'bg-blue-400'
    case 'checkin_initiated': return 'bg-orange-400'
    case 'completed': return 'bg-green-400'
    case 'failed': return 'bg-red-400'
    case 'expired': return 'bg-yellow-400'
    default: return 'bg-gray-400'
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

function formatFlightDateTime(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

// ─── Status Timeline Component ────────────────────────────────────────────────

const STATUS_FLOW = ['pending', 'detected', 'link_generated', 'checkin_initiated', 'completed'] as const

function StatusTimeline({ status }: { status: string }) {
  // Map current status to an index in the flow
  const statusIndexMap: Record<string, number> = {
    pending: 0,
    detected: 1,
    link_generated: 2,
    checkin_initiated: 3,
    completed: 4,
    failed: -1,
    expired: -1,
  }

  const currentIndex = statusIndexMap[status] ?? 0
  const isFailed = status === 'failed'
  const isExpired = status === 'expired'

  return (
    <div className="flex items-center gap-1">
      {STATUS_FLOW.map((step, idx) => {
        const isActive = idx <= currentIndex
        const isCurrent = step === status || (isFailed && idx === currentIndex) || (isExpired && idx === currentIndex)
        const dotColor = isFailed
          ? 'bg-red-500'
          : isExpired
            ? 'bg-yellow-500'
            : isActive
              ? 'bg-green-500'
              : 'bg-gray-300 dark:bg-gray-600'

        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`size-2.5 rounded-full transition-all duration-300 ${dotColor} ${isCurrent ? 'ring-2 ring-offset-1 ring-offset-background ring-orange-400' : ''}`}
                title={getStatusLabel(step)}
              />
              {idx === STATUS_FLOW.length - 1 && (
                <span className="text-[8px] text-muted-foreground hidden lg:block w-6 text-center">
                  {isFailed ? 'Échoué' : isExpired ? 'Expiré' : 'Terminé'}
                </span>
              )}
            </div>
            {idx < STATUS_FLOW.length - 1 && (
              <div
                className={`h-0.5 w-4 transition-colors duration-300 ${
                  isActive && idx < currentIndex
                    ? 'bg-green-400'
                    : isFailed
                      ? 'bg-red-300 dark:bg-red-800'
                      : isExpired
                        ? 'bg-yellow-300 dark:bg-yellow-800'
                        : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
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
    passengers: [{ id: generateId(), nom: '', prenom: '', siege: '' }],
  })
  const [testResult, setTestResult] = useState<{
    url: string
    airline: string
    pnr: string
  } | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  // Detected flights state
  const [detectedFlights, setDetectedFlights] = useState<DetectedFlight[]>([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [showDetected, setShowDetected] = useState(false)

  // ── Data Fetching ───────────────────────────────────────────────────────
  const { activeModule } = useNavigationStore()

  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    setIsRefreshing(true)
    try {
      const [statsResult, sessionsResult] = await Promise.all([
        apiClient.get('/api/checkin?stats=true'),
        apiClient.get('/api/checkin'),
      ])

      if (statsResult.success) {
        const raw = statsResult.data as Record<string, unknown>
        if (raw.totalSessions != null) {
          setStats({
            totalSessions: raw.totalSessions as number,
            sessionsLast7Days: (raw.sessionsLast7Days as number) ?? 0,
            statusBreakdown: (raw.statusBreakdown as CheckInStats['statusBreakdown']) ?? [],
            airlineBreakdown: (raw.airlineBreakdown as CheckInStats['airlineBreakdown']) ?? [],
          })
        }
      }

      if (sessionsResult.success) {
        const raw = sessionsResult.data as unknown
        const items = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as Record<string, unknown>)?.data)
            ? ((raw as Record<string, unknown>).data as CheckInSession[])
            : Array.isArray((raw as Record<string, unknown>)?.items)
              ? ((raw as Record<string, unknown>).items as CheckInSession[])
              : []
        setSessions(items as CheckInSession[])
      }
    } catch {
      // API error — leave lists empty
    }
    setIsRefreshing(false)
    if (showLoading) setLoading(false)
  }, [])

  useEffect(() => {
    if (activeModule !== 'checkin') return
    let cancelled = false
    const load = async () => {
      await fetchData(true)
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [fetchData, activeModule])

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleRefresh = () => {
    fetchData(false)
  }

  const handleDetectFlights = async () => {
    setIsDetecting(true)
    setShowDetected(true)
    try {
      const result = await apiClient.get('/api/ticket-scans?limit=5')
      if (result.success) {
        const raw = result.data as unknown
        const items = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as Record<string, unknown>)?.data)
            ? ((raw as Record<string, unknown>).data as Record<string, unknown>[])
            : Array.isArray((raw as Record<string, unknown>)?.items)
              ? ((raw as Record<string, unknown>).items as Record<string, unknown>[])
              : []

        // Filter for flights within 48 hours
        const now = new Date()
        const fortyEightHoursLater = new Date(now.getTime() + 48 * 60 * 60 * 1000)

        const upcomingFlights = items
          .filter((item: Record<string, unknown>) => {
            const depDate = item.departureDate || item.flightDate || item.date
            if (!depDate) return false
            try {
              const date = new Date(depDate as string)
              return date >= now && date <= fortyEightHoursLater
            } catch {
              return false
            }
          })
          .map((item: Record<string, unknown>, idx: number) => ({
            id: (item.id as string) || `detected-${idx}`,
            airlineName: (item.airlineName || item.airline || '') as string,
            airlineCode: (item.airlineCode || item.carrierCode || '') as string,
            flightNumber: (item.flightNumber || '') as string,
            departureDate: (item.departureDate || item.flightDate || item.date || '') as string,
            departureCode: (item.departureCode || item.origin || '') as string,
            arrivalCode: (item.arrivalCode || item.destination || '') as string,
            pnr: (item.pnr || item.bookingReference || '') as string,
            passengerName: (item.passengerName || item.name || '') as string,
          })) as DetectedFlight[]

        setDetectedFlights(upcomingFlights)
        if (upcomingFlights.length === 0) {
          toast.info('Aucun vol à venir détecté dans les 48 prochaines heures')
        } else {
          toast.success(`${upcomingFlights.length} vol(s) à venir détecté(s)`)
        }
      } else {
        toast.error(result.error || 'Impossible de récupérer les scans de billets')
        setDetectedFlights([])
      }
    } catch {
      toast.error('Erreur lors de la détection des vols')
      setDetectedFlights([])
    }
    setIsDetecting(false)
  }

  const handlePrefillFromDetected = (flight: DetectedFlight) => {
    setTestForm({
      airline: flight.airlineName,
      pnr: flight.pnr || '',
      phone: testForm.phone,
      passengers: flight.passengerName
        ? [{ id: generateId(), nom: '', prenom: flight.passengerName, siege: '' }]
        : testForm.passengers,
    })
    setActiveTestTab('manual')
    toast.success('Formulaire pré-rempli avec les données du vol détecté')
  }

  const [activeTestTab, setActiveTestTab] = useState<string>('detect')

  // Passenger management
  const addPassenger = () => {
    setTestForm((prev) => ({
      ...prev,
      passengers: [...prev.passengers, { id: generateId(), nom: '', prenom: '', siege: '' }],
    }))
  }

  const removePassenger = (id: string) => {
    setTestForm((prev) => ({
      ...prev,
      passengers: prev.passengers.filter((p) => p.id !== id),
    }))
  }

  const updatePassenger = (id: string, field: keyof Passenger, value: string) => {
    setTestForm((prev) => ({
      ...prev,
      passengers: prev.passengers.map((p) =>
        p.id === id ? { ...p, [field]: value } : p,
      ),
    }))
  }

  const handleTestCheckIn = async () => {
    if (!testForm.airline || !testForm.pnr || !testForm.phone) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      const result = await apiClient.post('/api/checkin', {
        phone: testForm.phone,
        flightNumber: 'TEST',
        airline: testForm.airline,
        pnr: testForm.pnr,
        passengers: testForm.passengers.filter((p) => p.nom || p.prenom),
      })

      if (!result.success) {
        toast.error(result.error ?? 'Erreur serveur')
        setIsTesting(false)
        return
      }

      const data = result.data as Record<string, unknown>
      // Handle both { data: { checkInUrl } } and { checkInUrl } responses
      const checkInUrl = (data.data as Record<string, string>)?.checkInUrl ?? (data.checkInUrl as string)

      if (checkInUrl) {
        setTestResult({
          url: checkInUrl,
          airline: testForm.airline,
          pnr: testForm.pnr,
        })
        toast.success('Lien de check-in généré avec succès')
      } else {
        toast.error('Le serveur n\'a pas pu générer de lien de check-in pour cette compagnie. Veuillez vérifier que la compagnie est supportée.')
      }
    } catch {
      toast.error('Erreur de connexion au serveur. Veuillez réessayer.')
    }

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
          value={18}
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
                {stats.statusBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aucune donnée disponible pour le moment.
                  </p>
                ) : (
                  <>
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
                  </>
                )}
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
                {stats.airlineBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aucune donnée disponible pour le moment.
                  </p>
                ) : (
                  <>
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
                  </>
                )}

                {/* Supported Airlines Info */}
                <div className="mt-4 rounded-lg border border-dashed border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 p-4">
                  <h4 className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-3 flex items-center gap-2">
                    <ShieldCheck className="size-4" />
                    Compagnies Supportées pour Auto Check-in ({SUPPORTED_AIRLINES.length})
                  </h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {SUPPORTED_AIRLINES.map((airline) => (
                      <div
                        key={airline.code}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Badge className={getAirlineBadgeStyle(airline.name)}>{airline.code}</Badge>
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
                className={`${item.status === 'pending'
                    ? 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400'
                    : item.status === 'detected'
                      ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : item.status === 'link_generated'
                        ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
                        : item.status === 'checkin_initiated'
                          ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400'
                          : item.status === 'completed'
                            ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400'
                            : item.status === 'expired'
                              ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400'
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
                        <TableHead className="hidden lg:table-cell">Timeline</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSessions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
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
                            <TableCell className="hidden lg:table-cell">
                              <StatusTimeline status={session.status} />
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
          {/* Sub-tabs for Detect / Manual */}
          <div className="flex gap-2">
            <Button
              variant={activeTestTab === 'detect' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTestTab('detect')}
              className={activeTestTab === 'detect' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}
            >
              <ScanLine className="mr-1.5 size-4" />
              Détecter mes vols
            </Button>
            <Button
              variant={activeTestTab === 'manual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTestTab('manual')}
              className={activeTestTab === 'manual' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}
            >
              <Ticket className="mr-1.5 size-4" />
              Check-in manuel
            </Button>
          </div>

          {/* Detect Flights Section */}
          {activeTestTab === 'detect' && (
            <div className="space-y-4">
              {/* Detect Button */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-900/30">
                      <ScanLine className="size-8 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">Détection automatique des vols</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-md">
                        Scannez vos billets d&apos;avion via l&apos;OCR pour détecter automatiquement vos vols à venir dans les 48 prochaines heures.
                      </p>
                    </div>
                    <Button
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                      onClick={handleDetectFlights}
                      disabled={isDetecting}
                    >
                      {isDetecting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Détection en cours...
                        </>
                      ) : (
                        <>
                          <ScanLine className="size-4" />
                          Détecter mes vols
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Detected Flights List */}
              {showDetected && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Plane className="size-4 text-orange-500" />
                      Vols détectés
                      {detectedFlights.length > 0 && (
                        <Badge className="ml-2 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                          {detectedFlights.length}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {detectedFlights.length === 0 && !isDetecting ? (
                      <div className="flex flex-col items-center py-8 text-center">
                        <Plane className="size-10 text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Aucun vol à venir détecté dans les 48 prochaines heures.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Scannez vos billets pour permettre la détection.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {detectedFlights.map((flight) => (
                          <div
                            key={flight.id}
                            className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/30"
                          >
                            {/* Airline Color Indicator */}
                            <div
                              className={`size-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${getAirlineColor(flight.airlineName)}`}
                            >
                              {flight.airlineCode ? flight.airlineCode.substring(0, 2) : '?'}
                            </div>

                            {/* Flight Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">{flight.airlineName}</span>
                                <span className="font-mono text-sm text-muted-foreground">
                                  {flight.flightNumber}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {formatFlightDateTime(flight.departureDate)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-sm">
                                <span className="font-mono font-medium">{flight.departureCode}</span>
                                <ChevronRight className="size-3 text-muted-foreground" />
                                <span className="font-mono font-medium">{flight.arrivalCode}</span>
                              </div>
                              {flight.passengerName && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Passager : {flight.passengerName}
                                </p>
                              )}
                            </div>

                            {/* Action Button */}
                            <Button
                              size="sm"
                              className="bg-orange-500 hover:bg-orange-600 text-white shrink-0"
                              onClick={() => handlePrefillFromDetected(flight)}
                            >
                              <CheckCircle2 className="size-3.5 mr-1" />
                              Faire le check-in
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Manual Check-in Section */}
          {activeTestTab === 'manual' && (
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
                          <SelectItem key={airline.code} value={airline.name}>
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

                  {/* Multi-passenger Support */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        Passagers
                      </Label>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          <Users className="mr-1 size-2.5" />
                          {testForm.passengers.length} passager(s)
                        </Badge>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={addPassenger}
                        >
                          <UserPlus className="size-3 mr-1" />
                          Ajouter
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {testForm.passengers.map((passenger, index) => (
                        <div key={passenger.id} className="flex items-start gap-2">
                          <div className="grid grid-cols-3 gap-2 flex-1">
                            <div>
                              {index === 0 && (
                                <span className="text-[10px] text-muted-foreground">Nom</span>
                              )}
                              <Input
                                placeholder="Nom"
                                value={passenger.nom}
                                onChange={(e) => updatePassenger(passenger.id, 'nom', e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              {index === 0 && (
                                <span className="text-[10px] text-muted-foreground">Prénom</span>
                              )}
                              <Input
                                placeholder="Prénom"
                                value={passenger.prenom}
                                onChange={(e) => updatePassenger(passenger.id, 'prenom', e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              {index === 0 && (
                                <span className="text-[10px] text-muted-foreground">Siège (opt.)</span>
                              )}
                              <Input
                                placeholder="Ex: 12A"
                                value={passenger.siege}
                                onChange={(e) => updatePassenger(passenger.id, 'siege', e.target.value.toUpperCase())}
                                className="h-8 text-sm font-mono"
                              />
                            </div>
                          </div>
                          {testForm.passengers.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive shrink-0 mt-3"
                              onClick={() => removePassenger(passenger.id)}
                            >
                              <UserMinus className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
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

                      {/* Passengers Summary */}
                      {testForm.passengers.some((p) => p.nom || p.prenom) && (
                        <div className="rounded-lg border bg-muted/30 p-3">
                          <span className="text-xs text-muted-foreground font-medium">
                            Passagers ({testForm.passengers.filter((p) => p.nom || p.prenom).length})
                          </span>
                          <div className="mt-2 space-y-1">
                            {testForm.passengers
                              .filter((p) => p.nom || p.prenom)
                              .map((p) => (
                                <div key={p.id} className="flex items-center justify-between text-sm">
                                  <span>
                                    {p.prenom} {p.nom}
                                  </span>
                                  {p.siege && (
                                    <span className="font-mono text-xs text-muted-foreground">
                                      Siège {p.siege}
                                    </span>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

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
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
