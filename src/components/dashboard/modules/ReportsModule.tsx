'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileText,
  Download,
  HardDrive,
  CalendarClock,
  Timer,
  FileDown,
  Table as TableIcon,
  Settings,
  Plus,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  Edit,
  Eye,
  Upload,
  TrendingUp,
  CalendarDays,
  X,
  BarChart3,
  Loader2,
  RefreshCw,
  AlertCircle,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReportType {
  id: string
  name: string
  description: string
  category: string
  icon: string
  endpoint: string | null
  supportedFormats: string[]
  requiredParams: string[]
  optionalParams?: string[]
  status?: string
}

interface DashboardStats {
  totalConversations: number
  messagesToday: number
  activeAlerts: number
  revenueToday: number
  totalFlightSearches: number
  totalLoungeBookings: number
  totalTransportBookings: number
}

interface ScheduledReport {
  id: string
  name: string
  frequency: 'Quotidien' | 'Hebdomadaire' | 'Mensuel'
  lastExecution: string
  nextExecution: string
  format: string
  recipients: string[]
  status: 'Actif' | 'En pause'
  reportType: string
  airportCode: string
}

interface GeneratedReport {
  id: string
  title: string
  subtitle: string
  badge: string
  size: string
  date: string
  reportTypeId: string
  airportCode: string
  dateFrom: string
  dateTo: string
  format: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getBadgeClasses(badge: string) {
  if (badge === 'PDF') return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
  if (badge === 'CSV') return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
  if (badge === 'PDF + CSV') return 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800'
  return ''
}

function getFrequencyBadge(frequency: string) {
  switch (frequency) {
    case 'Quotidien':
      return 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800'
    case 'Hebdomadaire':
      return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
    case 'Mensuel':
      return 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800'
    default:
      return ''
  }
}

function getInitials(email: string): string {
  return email
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase()
}

function getAvatarColor(index: number): string {
  const colors = [
    'bg-orange-500',
    'bg-sky-500',
    'bg-emerald-500',
    'bg-violet-500',
    'bg-rose-500',
    'bg-amber-500',
  ]
  return colors[index % colors.length]
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n)
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ReportsModule() {
  // ── Data state ─────────────────────────────────────────────────────────────
  const [reportTypes, setReportTypes] = useState<ReportType[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([])
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null)

  // ── Dialog / form state ────────────────────────────────────────────────────
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [exportFromDate, setExportFromDate] = useState<Date | undefined>(undefined)
  const [exportToDate, setExportToDate] = useState<Date | undefined>(undefined)
  const [recipientInput, setRecipientInput] = useState('')
  const [recipients, setRecipients] = useState<string[]>([])
  const [reportType, setReportType] = useState('')
  const [frequency, setFrequency] = useState('')
  const [format, setFormat] = useState('')
  const [exportReportType, setExportReportType] = useState('')
  const [exportAirport, setExportAirport] = useState('')
  const [exportFormat, setExportFormat] = useState('PDF')
  const [includeCharts, setIncludeCharts] = useState(true)
  const [includeDetails, setIncludeDetails] = useState(false)
  const [includeComparison, setIncludeComparison] = useState(false)
  const [exportReportName, setExportReportName] = useState('')

  // ── Preview state ──────────────────────────────────────────────────────────
  const [previewReport, setPreviewReport] = useState<GeneratedReport | null>(null)
  const [previewData, setPreviewData] = useState<Record<string, unknown> | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // ── Scheduled report editing state ─────────────────────────────────────────
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)

  // ─── Data Loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [reportTypesRes, statsRes] = await Promise.all([
        apiClient.get<{ reports: ReportType[] }>('/api/reports/list'),
        apiClient.get<DashboardStats>('/api/dashboard/stats'),
      ])

      if (reportTypesRes.success) {
        setReportTypes(reportTypesRes.data.reports || [])
      }

      if (statsRes.success) {
        setDashboardStats(statsRes.data)
      }
    } catch (error) {
      console.error('Failed to load reports data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Load saved data from localStorage
  useEffect(() => {
    try {
      const savedReports = localStorage.getItem('maellis_generated_reports')
      if (savedReports) {
        setGeneratedReports(JSON.parse(savedReports))
      }

      const savedScheduled = localStorage.getItem('maellis_scheduled_reports')
      if (savedScheduled) {
        setScheduledReports(JSON.parse(savedScheduled))
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  // ─── Report Generation ─────────────────────────────────────────────────────

  const handleGenerateReport = async () => {
    if (!exportReportType) {
      toast.error('Veuillez sélectionner un type de rapport')
      return
    }

    if (!exportFromDate || !exportToDate) {
      toast.error('Veuillez sélectionner une période (date de début et de fin)')
      return
    }

    const airportCode = exportAirport || 'DSS'
    const from = formatDateISO(exportFromDate)
    const to = formatDateISO(exportToDate)
    const fmt = exportFormat === 'Les deux' ? 'pdf' : exportFormat.toLowerCase()

    // Map report type to endpoint
    const typeToEndpoint: Record<string, string> = {
      activite: '/api/reports/activity',
      financier: '/api/reports/revenue',
      conversations: '/api/reports/activity',
      brutes: '/api/reports/activity',
    }

    const endpoint = typeToEndpoint[exportReportType]
    if (!endpoint) {
      toast.error('Ce type de rapport n\'est pas encore disponible')
      return
    }

    setGeneratingReport(true)
    try {
      // Download the report using apiClient.download
      const url = `${endpoint}?airportCode=${airportCode}&from=${from}&to=${to}&format=${fmt}`
      const result = await apiClient.download(url)

      if (result) {
        // Trigger browser download
        const link = document.createElement('a')
        link.href = URL.createObjectURL(result.blob)
        link.download = result.filename || `rapport-${exportReportType}-${from}-${to}.${fmt}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(link.href)

        // Calculate approximate file size
        const sizeKB = Math.round(result.blob.size / 1024)
        const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`

        // Add to generated reports list
        const typeLabel: Record<string, string> = {
          activite: "Rapport d'Activité",
          financier: 'Rapport Financier',
          conversations: 'Rapport Conversations',
          brutes: 'Données Brutes',
        }

        const newReport: GeneratedReport = {
          id: `gen_${Date.now()}`,
          title: typeLabel[exportReportType] || 'Rapport Généré',
          subtitle: `${airportCode} — ${formatDate(exportFromDate)} au ${formatDate(exportToDate)}`,
          badge: exportFormat === 'Les deux' ? 'PDF + CSV' : exportFormat.toUpperCase(),
          size: sizeStr,
          date: formatDate(new Date()),
          reportTypeId: exportReportType,
          airportCode,
          dateFrom: from,
          dateTo: to,
          format: fmt,
        }

        const updatedReports = [newReport, ...generatedReports].slice(0, 20)
        setGeneratedReports(updatedReports)
        localStorage.setItem('maellis_generated_reports', JSON.stringify(updatedReports))

        toast.success(`Rapport "${newReport.title}" téléchargé avec succès`)
      } else {
        toast.error('Erreur lors de la génération du rapport')
      }
    } catch (error) {
      console.error('Report generation error:', error)
      toast.error('Erreur lors de la génération du rapport')
    } finally {
      setGeneratingReport(false)
    }
  }

  // ─── Quick Export Handlers ─────────────────────────────────────────────────

  const handleQuickExportPDF = async () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    setGeneratingReport(true)
    try {
      const from = formatDateISO(yesterday)
      const to = formatDateISO(today)
      const url = `/api/reports/activity?airportCode=DSS&from=${from}&to=${to}&format=pdf`
      const result = await apiClient.download(url)

      if (result) {
        const link = document.createElement('a')
        link.href = URL.createObjectURL(result.blob)
        link.download = result.filename || `rapport-rapide-${from}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(link.href)
        toast.success('Export PDF rapide téléchargé')
      } else {
        toast.error('Erreur lors de l\'export')
      }
    } catch {
      toast.error('Erreur lors de l\'export')
    } finally {
      setGeneratingReport(false)
    }
  }

  const handleQuickExportCSV = async () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    setGeneratingReport(true)
    try {
      const from = formatDateISO(yesterday)
      const to = formatDateISO(today)
      const url = `/api/reports/activity?airportCode=DSS&from=${from}&to=${to}&format=csv`
      const result = await apiClient.download(url)

      if (result) {
        const link = document.createElement('a')
        link.href = URL.createObjectURL(result.blob)
        link.download = result.filename || `rapport-activite-${from}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(link.href)
        toast.success('Export CSV rapide téléchargé')
      } else {
        toast.error('Erreur lors de l\'export')
      }
    } catch {
      toast.error('Erreur lors de l\'export')
    } finally {
      setGeneratingReport(false)
    }
  }

  // ─── Download Individual Report ────────────────────────────────────────────

  const handleDownloadReport = async (report: GeneratedReport) => {
    setDownloadingReport(report.id)
    try {
      const typeToEndpoint: Record<string, string> = {
        activite: '/api/reports/activity',
        financier: '/api/reports/revenue',
        conversations: '/api/reports/activity',
        brutes: '/api/reports/activity',
      }

      const endpoint = typeToEndpoint[report.reportTypeId]
      if (!endpoint) {
        // For reports without an endpoint, generate a CSV from the report metadata
        const csvContent = `Titre,Sous-titre,Format,Taille,Date,Aéroport,Période\n"${report.title}","${report.subtitle}","${report.badge}","${report.size}","${report.date}","${report.airportCode}","${report.dateFrom} au ${report.dateTo}"`
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${report.title.replace(/\s+/g, '_')}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        toast.success('Rapport téléchargé')
        return
      }

      const fmt = report.format || 'csv'
      const url = `${endpoint}?airportCode=${report.airportCode}&from=${report.dateFrom}&to=${report.dateTo}&format=${fmt}`
      const result = await apiClient.download(url)

      if (result) {
        const link = document.createElement('a')
        link.href = URL.createObjectURL(result.blob)
        link.download = result.filename || `${report.title.replace(/\s+/g, '_')}.${fmt}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(link.href)
        toast.success('Rapport téléchargé')
      } else {
        toast.error('Erreur lors du téléchargement')
      }
    } catch {
      toast.error('Erreur lors du téléchargement')
    } finally {
      setDownloadingReport(null)
    }
  }

  // ─── Preview Report ────────────────────────────────────────────────────────

  const handlePreviewReport = async (report: GeneratedReport) => {
    const typeToEndpoint: Record<string, string> = {
      activite: '/api/reports/activity',
      financier: '/api/reports/revenue',
      conversations: '/api/reports/activity',
      brutes: '/api/reports/activity',
    }

    const endpoint = typeToEndpoint[report.reportTypeId]
    if (!endpoint) {
      toast.info(`Aperçu de « ${report.title} » — téléchargez le fichier pour voir le contenu`)
      return
    }

    setPreviewReport(report)
    setPreviewLoading(true)
    setPreviewData(null)

    try {
      // Fetch the CSV version for preview data
      const url = `${endpoint}?airportCode=${report.airportCode}&from=${report.dateFrom}&to=${report.dateTo}&format=csv`
      const result = await apiClient.download(url)

      if (result) {
        const text = await result.blob.text()
        const lines = text.split('\n').filter((l) => l.trim())
        if (lines.length > 0) {
          const headers = lines[0].split(',').map((h) => h.replace(/"/g, '').trim())
          const rows = lines.slice(1).map((line) => {
            const values = line.split(',').map((v) => v.replace(/"/g, '').trim())
            const row: Record<string, string> = {}
            headers.forEach((h, i) => {
              row[h] = values[i] || ''
            })
            return row
          })
          setPreviewData({ headers, rows, totalRows: rows.length })
        }
      }
    } catch {
      toast.error('Erreur lors du chargement de l\'aperçu')
    } finally {
      setPreviewLoading(false)
    }
  }

  // ─── Schedule Handlers ─────────────────────────────────────────────────────

  const handleScheduleReport = () => {
    if (!exportReportName.trim()) {
      toast.error('Veuillez saisir un nom pour le rapport')
      return
    }
    if (!reportType) {
      toast.error('Veuillez sélectionner un type de rapport')
      return
    }
    if (!frequency) {
      toast.error('Veuillez sélectionner une fréquence')
      return
    }
    if (!format) {
      toast.error('Veuillez sélectionner un format')
      return
    }

    const newSchedule: ScheduledReport = {
      id: `sched_${Date.now()}`,
      name: exportReportName,
      frequency: frequency as ScheduledReport['frequency'],
      lastExecution: '—',
      nextExecution: formatDate(new Date()),
      format,
      recipients: [...recipients],
      status: 'Actif',
      reportType,
      airportCode: exportAirport || 'DSS',
    }

    const updated = [...scheduledReports, newSchedule]
    setScheduledReports(updated)
    localStorage.setItem('maellis_scheduled_reports', JSON.stringify(updated))
    setScheduleDialogOpen(false)

    // Reset form
    setExportReportName('')
    setReportType('')
    setFrequency('')
    setFormat('')
    setRecipients([])
    setStartDate(undefined)

    toast.success(`Rapport "${newSchedule.name}" planifié avec succès (Fonctionnalité à venir — les exécutions automatiques seront bientôt disponibles)`)
  }

  // ─── Scheduled Report Actions ──────────────────────────────────────────────

  const handleEditSchedule = (report: ScheduledReport) => {
    toast.info(`Modification de "${report.name}" — Fonctionnalité à venir`)
  }

  const handleTogglePauseSchedule = (report: ScheduledReport) => {
    const updated = scheduledReports.map((r) =>
      r.id === report.id
        ? { ...r, status: r.status === 'Actif' ? 'En pause' as const : 'Actif' as const }
        : r
    )
    setScheduledReports(updated)
    localStorage.setItem('maellis_scheduled_reports', JSON.stringify(updated))
    toast.success(`Rapport "${report.name}" ${report.status === 'Actif' ? 'mis en pause' : 'réactivé'}`)
  }

  const handleDeleteSchedule = (report: ScheduledReport) => {
    if (!confirm(`Supprimer le rapport planifié "${report.name}" ?`)) return
    const updated = scheduledReports.filter((r) => r.id !== report.id)
    setScheduledReports(updated)
    localStorage.setItem('maellis_scheduled_reports', JSON.stringify(updated))
    toast.success(`Rapport "${report.name}" supprimé`)
  }

  // ─── Recipient helpers ─────────────────────────────────────────────────────

  function addRecipient() {
    const trimmed = recipientInput.trim()
    if (trimmed && !recipients.includes(trimmed) && recipients.length < 5) {
      setRecipients([...recipients, trimmed])
      setRecipientInput('')
    }
  }

  function removeRecipient(email: string) {
    setRecipients(recipients.filter((r) => r !== email))
  }

  function handleRecipientKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addRecipient()
    }
  }

  // ─── KPI Cards (real data) ─────────────────────────────────────────────────

  const kpiCards = [
    {
      title: 'Rapports Générés',
      value: dashboardStats ? String(generatedReports.length) : '—',
      change: dashboardStats ? `${formatNumber(dashboardStats.totalConversations)} conversations` : '',
      icon: FileText,
      iconBg: 'bg-sky-100 dark:bg-sky-900/30',
      iconColor: 'text-sky-600 dark:text-sky-400',
      borderClass: 'border-l-sky-500',
      valueColor: 'text-sky-600 dark:text-sky-400',
      changeIcon: TrendingUp,
      changeColor: 'text-emerald-500',
    },
    {
      title: 'Revenus Aujourd\'hui',
      value: dashboardStats ? formatCurrency(dashboardStats.revenueToday) : '—',
      change: '',
      icon: Download,
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      borderClass: 'border-l-emerald-500',
      valueColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Messages Aujourd\'hui',
      value: dashboardStats ? formatNumber(dashboardStats.messagesToday) : '—',
      change: dashboardStats?.activeAlerts ? `${dashboardStats.activeAlerts} alerte(s) active(s)` : '',
      icon: HardDrive,
      iconBg: 'bg-violet-100 dark:bg-violet-900/30',
      iconColor: 'text-violet-600 dark:text-violet-400',
      borderClass: 'border-l-violet-500',
      valueColor: 'text-violet-600 dark:text-violet-400',
    },
  ]

  const scheduleKpiCards = [
    {
      title: 'Rapports Planifiés',
      value: String(scheduledReports.length),
      icon: CalendarClock,
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      borderClass: 'border-l-amber-500',
      valueColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      title: 'Prochaine Exécution',
      value: scheduledReports.length > 0
        ? scheduledReports.filter((r) => r.status === 'Actif').sort((a, b) => a.nextExecution.localeCompare(b.nextExecution))[0]?.nextExecution || '—'
        : 'Aucune',
      icon: Timer,
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      borderClass: 'border-l-emerald-500',
      valueColor: 'text-emerald-600 dark:text-emerald-400',
    },
  ]

  const quickExportCards = [
    {
      title: 'Export Rapide PDF',
      subtitle: 'Dernières 24h — Rapport d\'activité',
      icon: FileDown,
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
      iconColor: 'text-orange-600 dark:text-orange-400',
      borderClass: 'border-l-orange-500',
      onClick: handleQuickExportPDF,
    },
    {
      title: 'Export Rapide CSV',
      subtitle: 'Données brutes conversations — 24h',
      icon: TableIcon,
      iconBg: 'bg-sky-100 dark:bg-sky-900/30',
      iconColor: 'text-sky-600 dark:text-sky-400',
      borderClass: 'border-l-sky-500',
      onClick: handleQuickExportCSV,
    },
    {
      title: 'Rapport Personnalisé',
      subtitle: 'Configurer et générer ci-dessous',
      icon: Settings,
      iconBg: 'bg-violet-100 dark:bg-violet-900/30',
      iconColor: 'text-violet-600 dark:text-violet-400',
      borderClass: 'border-l-violet-500',
      onClick: () => setExportReportType(''),
    },
  ]

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-orange-500" />
        <span className="ml-3 text-muted-foreground">Chargement des rapports...</span>
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exports &amp; Rapports</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Générez, planifiez et exportez les rapports d&apos;activité du bot MAELLIS
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`size-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rapports" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="rapports">Rapports</TabsTrigger>
          <TabsTrigger value="exports">Exports</TabsTrigger>
          <TabsTrigger value="planification">Planification</TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Rapports ────────────────────────────────────────────── */}
        <TabsContent value="rapports" className="mt-6 space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  {(card.change || card.changeIcon) && (
                    <div className="flex items-center gap-1 mt-1">
                      {card.changeIcon && (
                        <card.changeIcon className={`size-3.5 ${card.changeColor}`} />
                      )}
                      <span className={`text-xs font-medium ${card.changeColor || 'text-muted-foreground'}`}>
                        {card.change}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Available Report Types */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Types de Rapports Disponibles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportTypes.map((rt) => (
                <Card
                  key={rt.id}
                  className={`flex flex-col gap-0 overflow-hidden hover:shadow-md transition-shadow ${
                    rt.status === 'coming_soon' ? 'opacity-60' : ''
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-semibold leading-tight truncate">
                          {rt.name}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1 leading-relaxed line-clamp-2">
                          {rt.description}
                        </CardDescription>
                      </div>
                      <div className="flex size-9 items-center justify-center rounded-lg bg-muted shrink-0">
                        <BarChart3 className="size-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 pt-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="bg-muted/50 text-[10px] px-1.5 py-0">
                        {rt.category}
                      </Badge>
                      {rt.status === 'coming_soon' && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Bientôt
                        </Badge>
                      )}
                      <span className="ml-auto">
                        {rt.supportedFormats.map((f) => f.toUpperCase()).join(' + ')}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="w-full text-xs h-8"
                      disabled={rt.status === 'coming_soon' || !rt.endpoint}
                      onClick={() => {
                        setExportReportType(rt.id)
                        // Switch to exports tab programmatically is complex, so just show toast
                        toast.info('Configurez et générez ce rapport dans l\'onglet Exports')
                      }}
                    >
                      <Eye className="size-3.5 mr-1.5" />
                      {rt.status === 'coming_soon' ? 'Bientôt disponible' : 'Générer'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Generated Reports History */}
          {generatedReports.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Bibliothèque de Rapports Générés</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedReports.map((report) => (
                  <Card key={report.id} className="flex flex-col gap-0 overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm font-semibold leading-tight truncate">
                            {report.title}
                          </CardTitle>
                          <CardDescription className="text-xs mt-1 leading-relaxed line-clamp-2">
                            {report.subtitle}
                          </CardDescription>
                        </div>
                        <div className="flex size-9 items-center justify-center rounded-lg bg-muted shrink-0">
                          <BarChart3 className="size-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 pt-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getBadgeClasses(report.badge)}`}>
                          {report.badge}
                        </Badge>
                        <span>{report.size}</span>
                        <span className="ml-auto">{report.date}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 text-xs h-8"
                          onClick={() => handleDownloadReport(report)}
                          disabled={downloadingReport === report.id}
                        >
                          {downloadingReport === report.id ? (
                            <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Download className="size-3.5 mr-1.5" />
                          )}
                          Télécharger
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs h-8"
                          onClick={() => handlePreviewReport(report)}
                        >
                          <Eye className="size-3.5 mr-1.5" />
                          Aperçu
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {generatedReports.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="mb-3 size-12 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground font-medium">
                  Aucun rapport généré
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Utilisez l&apos;onglet Exports pour générer votre premier rapport
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Tab 2: Exports ─────────────────────────────────────────────── */}
        <TabsContent value="exports" className="mt-6 space-y-6">
          {/* Quick Export Cards */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Exports Rapides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {quickExportCards.map((card) => (
                <Card
                  key={card.title}
                  className={`gap-4 border-l-4 ${card.borderClass} overflow-hidden hover:shadow-md transition-shadow cursor-pointer`}
                  onClick={card.onClick}
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardDescription className="text-sm font-medium">
                      {card.title}
                    </CardDescription>
                    <div className={`rounded-xl p-2.5 ${card.iconBg}`}>
                      <card.icon className={`size-5 ${card.iconColor}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Export Builder Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Créer un Export Personnalisé</CardTitle>
              <CardDescription>
                Configurez et générez un rapport sur mesure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Type de Rapport */}
                  <div className="space-y-2">
                    <Label htmlFor="report-type">Type de Rapport</Label>
                    <Select value={exportReportType} onValueChange={setExportReportType}>
                      <SelectTrigger id="report-type">
                        <SelectValue placeholder="Sélectionnez un type" />
                      </SelectTrigger>
                      <SelectContent>
                        {reportTypes
                          .filter((rt) => rt.status !== 'coming_soon')
                          .map((rt) => (
                            <SelectItem key={rt.id} value={rt.id}>
                              {rt.name}
                            </SelectItem>
                          ))}
                        {reportTypes.filter((rt) => rt.status === 'coming_soon').map((rt) => (
                          <SelectItem key={rt.id} value={rt.id} disabled>
                            {rt.name} (Bientôt)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Période - Du */}
                  <div className="space-y-2">
                    <Label>Période — Du</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarDays className="mr-2 size-4" />
                          {exportFromDate ? (
                            exportFromDate.toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          ) : (
                            <span className="text-muted-foreground">Date de début</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={exportFromDate}
                          onSelect={setExportFromDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Période - Au */}
                  <div className="space-y-2">
                    <Label>Période — Au</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarDays className="mr-2 size-4" />
                          {exportToDate ? (
                            exportToDate.toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          ) : (
                            <span className="text-muted-foreground">Date de fin</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={exportToDate}
                          onSelect={setExportToDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Aéroport */}
                  <div className="space-y-2">
                    <Label htmlFor="airport">Aéroport</Label>
                    <Select value={exportAirport} onValueChange={setExportAirport}>
                      <SelectTrigger id="airport">
                        <SelectValue placeholder="Sélectionnez un aéroport" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DSS">DSS — Dakar (AIBD)</SelectItem>
                        <SelectItem value="CKY">CKY — Conakry</SelectItem>
                        <SelectItem value="ABJ">ABJ — Abidjan</SelectItem>
                        <SelectItem value="LOS">LOS — Lagos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {/* Format */}
                  <div className="space-y-2">
                    <Label>Format</Label>
                    <div className="flex gap-2">
                      {['PDF', 'CSV', 'Les deux'].map((fmt) => (
                        <Button
                          key={fmt}
                          type="button"
                          variant={exportFormat === fmt ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1"
                          onClick={() => setExportFormat(fmt)}
                        >
                          {fmt}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Inclure checkboxes */}
                  <div className="space-y-3">
                    <Label>Inclure</Label>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="include-charts"
                          checked={includeCharts}
                          onCheckedChange={(checked) => setIncludeCharts(checked === true)}
                        />
                        <Label htmlFor="include-charts" className="text-sm font-normal cursor-pointer">
                          Graphiques
                        </Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="include-details"
                          checked={includeDetails}
                          onCheckedChange={(checked) => setIncludeDetails(checked === true)}
                        />
                        <Label htmlFor="include-details" className="text-sm font-normal cursor-pointer">
                          Données détaillées
                        </Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="include-comparison"
                          checked={includeComparison}
                          onCheckedChange={(checked) => setIncludeComparison(checked === true)}
                        />
                        <Label htmlFor="include-comparison" className="text-sm font-normal cursor-pointer">
                          Comparaison période précédente
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Logo Upload */}
                  <div className="space-y-2">
                    <Label>Logo de l&apos;aéroport</Label>
                    <div className="flex items-center justify-center w-full h-24 border-2 border-dashed rounded-lg border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors cursor-pointer">
                      <div className="text-center space-y-1">
                        <Upload className="mx-auto size-6 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          Cliquez ou glissez pour uploader
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleGenerateReport}
                    disabled={generatingReport || !exportReportType || !exportFromDate || !exportToDate}
                  >
                    {generatingReport ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <FileDown className="size-4 mr-2" />
                    )}
                    {generatingReport ? 'Génération en cours...' : 'Générer le Rapport'}
                  </Button>

                  {/* Validation hints */}
                  {!exportReportType && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      Sélectionnez un type de rapport
                    </p>
                  )}
                  {exportReportType && (!exportFromDate || !exportToDate) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      Sélectionnez une période complète
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview Section */}
          {previewReport && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="size-4" />
                    Aperçu — {previewReport.title}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {previewReport.subtitle}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => {
                    setPreviewReport(null)
                    setPreviewData(null)
                  }}
                >
                  <X className="size-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {previewLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Chargement des données...</span>
                  </div>
                ) : previewData && Array.isArray(previewData.headers) ? (
                  <div className="overflow-x-auto max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {previewData.headers.map((h: string) => (
                            <TableHead key={h} className="text-xs whitespace-nowrap">
                              {h}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(previewData.rows as Record<string, string>[]).slice(0, 10).map((row, idx) => (
                          <TableRow key={idx}>
                            {(previewData.headers as string[]).map((h: string) => (
                              <TableCell key={h} className="text-xs whitespace-nowrap">
                                {row[h] || '—'}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <p className="text-xs text-muted-foreground mt-2">
                      Affichage des 10 premières lignes sur {String(previewData.totalRows)} au total
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Impossible de charger l&apos;aperçu des données
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Tab 3: Planification ────────────────────────────────────────── */}
        <TabsContent value="planification" className="mt-6 space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {scheduleKpiCards.map((card) => (
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
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Scheduled Reports Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Rapports Planifiés</CardTitle>
                <CardDescription>
                  Gérez vos rapports automatiques
                </CardDescription>
              </div>
              <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="size-4 mr-1.5" />
                    Planifier un Rapport
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Planifier un Rapport</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    {/* Nom */}
                    <div className="space-y-2">
                      <Label htmlFor="sched-name">Nom du Rapport</Label>
                      <Input
                        id="sched-name"
                        placeholder="Ex: Rapport Hebdomadaire AIBD"
                        value={exportReportName}
                        onChange={(e) => setExportReportName(e.target.value)}
                      />
                    </div>

                    {/* Type */}
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={reportType} onValueChange={setReportType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un type" />
                        </SelectTrigger>
                        <SelectContent>
                          {reportTypes
                            .filter((rt) => rt.status !== 'coming_soon')
                            .map((rt) => (
                              <SelectItem key={rt.id} value={rt.id}>
                                {rt.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Fréquence */}
                    <div className="space-y-2">
                      <Label>Fréquence</Label>
                      <Select value={frequency} onValueChange={setFrequency}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une fréquence" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Quotidien">Quotidien</SelectItem>
                          <SelectItem value="Hebdomadaire">Hebdomadaire</SelectItem>
                          <SelectItem value="Mensuel">Mensuel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Format */}
                    <div className="space-y-2">
                      <Label>Format</Label>
                      <Select value={format} onValueChange={setFormat}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PDF">PDF</SelectItem>
                          <SelectItem value="CSV">CSV</SelectItem>
                          <SelectItem value="PDF + CSV">PDF + CSV</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Destinataires avec chips */}
                    <div className="space-y-2">
                      <Label>Destinataires</Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {recipients.map((email) => (
                          <Badge key={email} variant="secondary" className="gap-1 pr-1">
                            <span>{email}</span>
                            <button
                              type="button"
                              onClick={() => removeRecipient(email)}
                              className="hover:bg-muted rounded-full p-0.5"
                            >
                              <X className="size-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="email@exemple.com"
                          value={recipientInput}
                          onChange={(e) => setRecipientInput(e.target.value)}
                          onKeyDown={handleRecipientKeyDown}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addRecipient}
                          disabled={!recipientInput.trim()}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                      {recipients.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {recipients.length} destinataire(s) ajouté(s)
                        </p>
                      )}
                    </div>

                    {/* Date de début */}
                    <div className="space-y-2">
                      <Label>Date de début</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarDays className="mr-2 size-4" />
                            {startDate ? (
                              startDate.toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })
                            ) : (
                              <span className="text-muted-foreground">Sélectionnez une date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setScheduleDialogOpen(false)}
                      >
                        Annuler
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleScheduleReport}
                        disabled={!exportReportName.trim() || !reportType || !frequency || !format}
                      >
                        Planifier
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom du Rapport</TableHead>
                      <TableHead>Fréquence</TableHead>
                      <TableHead className="hidden md:table-cell">Dernière Exécution</TableHead>
                      <TableHead className="hidden lg:table-cell">Prochaine Exécution</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead className="hidden xl:table-cell">Destinataires</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduledReports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <CalendarClock className="size-8 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">
                              Aucun rapport planifié
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setScheduleDialogOpen(true)}
                            >
                              <Plus className="size-4 mr-1.5" />
                              Planifier un rapport
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      scheduledReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium min-w-[180px]">
                            {report.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getFrequencyBadge(report.frequency)}`}>
                              {report.frequency}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                            {report.lastExecution}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                            {report.nextExecution}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getBadgeClasses(report.format)}`}>
                              {report.format}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            {/* Avatar group */}
                            <div className="flex -space-x-2">
                              {report.recipients.slice(0, 3).map((email, idx) => (
                                <Avatar key={email} className="size-7 border-2 border-background">
                                  <AvatarFallback className={`text-[9px] text-white font-semibold ${getAvatarColor(idx)}`}>
                                    {getInitials(email)}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {report.recipients.length > 3 && (
                                <Avatar className="size-7 border-2 border-background">
                                  <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                                    +{report.recipients.length - 3}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {report.status === 'Actif' ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                                Actif
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700">
                                En pause
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => handleEditSchedule(report)}
                              >
                                <Edit className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => handleTogglePauseSchedule(report)}
                              >
                                {report.status === 'Actif' ? (
                                  <Pause className="size-3.5" />
                                ) : (
                                  <Play className="size-3.5" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => handleDeleteSchedule(report)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
