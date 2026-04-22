'use client'

import { useState } from 'react'
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReportFile {
  id: string
  title: string
  subtitle: string
  badge: string
  size: string
  date: string
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
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockReports: ReportFile[] = [
  {
    id: '1',
    title: 'Rapport Hebdomadaire',
    subtitle: 'Résumé d\'activité semaine 24',
    badge: 'PDF',
    size: '2.4 MB',
    date: '22 Juin 2025',
  },
  {
    id: '2',
    title: 'Rapport Mensuel Mai',
    subtitle: 'Performance complète mai 2025',
    badge: 'PDF',
    size: '5.1 MB',
    date: '1 Juin 2025',
  },
  {
    id: '3',
    title: 'Analytics Conversations',
    subtitle: 'Tendance et intents Q2 2025',
    badge: 'PDF',
    size: '3.2 MB',
    date: '15 Juin 2025',
  },
  {
    id: '4',
    title: 'Rapport Financier',
    subtitle: 'Revenus et paiements mai 2025',
    badge: 'PDF + CSV',
    size: '1.8 MB',
    date: '5 Juin 2025',
  },
  {
    id: '5',
    title: 'Rapport Urgences Q1',
    subtitle: 'Incidents et résolutions',
    badge: 'PDF',
    size: '4.2 MB',
    date: '2 Avril 2025',
  },
  {
    id: '6',
    title: 'Export Données Brutes',
    subtitle: 'Toutes les conversations mai 2025',
    badge: 'CSV',
    size: '12.5 MB',
    date: '1 Juin 2025',
  },
]

const mockScheduledReports: ScheduledReport[] = [
  {
    id: '1',
    name: 'Rapport Hebdomadaire AIBD',
    frequency: 'Hebdomadaire',
    lastExecution: '23 Juin 2025',
    nextExecution: '30 Juin 2025',
    format: 'PDF',
    recipients: ['admin@aibd.sn', 'ops@maellis.com'],
    status: 'Actif',
  },
  {
    id: '2',
    name: 'Rapport Mensuel Global',
    frequency: 'Mensuel',
    lastExecution: '1 Juin 2025',
    nextExecution: '1 Juil 2025',
    format: 'PDF + CSV',
    recipients: ['dg@aibd.sn', 'finance@aibd.sn', 'ops@maellis.com'],
    status: 'Actif',
  },
  {
    id: '3',
    name: 'Export Quotidien Conversations',
    frequency: 'Quotidien',
    lastExecution: '24 Juin 2025',
    nextExecution: '25 Juin 2025',
    format: 'CSV',
    recipients: ['data@maellis.com'],
    status: 'Actif',
  },
  {
    id: '4',
    name: 'Rapport Financier Mensuel',
    frequency: 'Mensuel',
    lastExecution: '1 Mai 2025',
    nextExecution: '1 Juil 2025',
    format: 'PDF',
    recipients: ['finance@aibd.sn', 'dg@aibd.sn'],
    status: 'En pause',
  },
  {
    id: '5',
    name: 'Analytics Hebdo Par Aéroport',
    frequency: 'Hebdomadaire',
    lastExecution: '22 Juin 2025',
    nextExecution: '29 Juin 2025',
    format: 'PDF',
    recipients: ['ops@maellis.com', 'analytics@aibd.sn', 'ckg@maellis.com'],
    status: 'Actif',
  },
]

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

// ─── Component ───────────────────────────────────────────────────────────────

export function ReportsModule() {
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

  // Export tab form state
  const [exportReportName, setExportReportName] = useState('')

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

  const kpiCards = [
    {
      title: 'Rapports Générés',
      value: '48',
      change: '+12',
      icon: FileText,
      iconBg: 'bg-sky-100 dark:bg-sky-900/30',
      iconColor: 'text-sky-600 dark:text-sky-400',
      borderClass: 'border-l-sky-500',
      valueColor: 'text-sky-600 dark:text-sky-400',
      changeIcon: TrendingUp,
      changeColor: 'text-emerald-500',
    },
    {
      title: 'Dernier Export',
      value: 'il y a 2h',
      change: '',
      icon: Download,
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      borderClass: 'border-l-emerald-500',
      valueColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Stockage Utilisé',
      value: '2.4 GB',
      change: 'sur 10 GB',
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
      value: '5',
      icon: CalendarClock,
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      borderClass: 'border-l-amber-500',
      valueColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      title: 'Prochaine Exécution',
      value: 'Demain 08:00',
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
      subtitle: 'Dernières 24h, toutes les données',
      icon: FileDown,
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
      iconColor: 'text-orange-600 dark:text-orange-400',
      borderClass: 'border-l-orange-500',
    },
    {
      title: 'Export Rapide CSV',
      subtitle: 'Données brutes conversations',
      icon: TableIcon,
      iconBg: 'bg-sky-100 dark:bg-sky-900/30',
      iconColor: 'text-sky-600 dark:text-sky-400',
      borderClass: 'border-l-sky-500',
    },
    {
      title: 'Rapport Personnalisé',
      subtitle: 'Configurer et générer',
      icon: Settings,
      iconBg: 'bg-violet-100 dark:bg-violet-900/30',
      iconColor: 'text-violet-600 dark:text-violet-400',
      borderClass: 'border-l-violet-500',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Exports &amp; Rapports</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Générez, planifiez et exportez les rapports d&apos;activité du bot MAELLIS
        </p>
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

          {/* Reports Grid */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Bibliothèque de Rapports</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockReports.map((report) => (
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
                      <Button size="sm" className="flex-1 text-xs h-8">
                        <Download className="size-3.5 mr-1.5" />
                        Télécharger
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 text-xs h-8">
                        <Eye className="size-3.5 mr-1.5" />
                        Aperçu
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ─── Tab 2: Exports ─────────────────────────────────────────────── */}
        <TabsContent value="exports" className="mt-6 space-y-6">
          {/* Quick Export Cards */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Exports Rapides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {quickExportCards.map((card) => (
                <Card key={card.title} className={`gap-4 border-l-4 ${card.borderClass} overflow-hidden hover:shadow-md transition-shadow cursor-pointer`}>
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
                        <SelectItem value="activite">Rapport d&apos;Activité</SelectItem>
                        <SelectItem value="financier">Rapport Financier</SelectItem>
                        <SelectItem value="conversations">Rapport Conversations</SelectItem>
                        <SelectItem value="brutes">Données Brutes</SelectItem>
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
                        <SelectItem value="AIBD">AIBD — Dakar</SelectItem>
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
                  <Button className="w-full" size="lg">
                    <FileDown className="size-4 mr-2" />
                    Générer le Rapport
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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
                          <SelectItem value="activite">Rapport d&apos;Activité</SelectItem>
                          <SelectItem value="financier">Rapport Financier</SelectItem>
                          <SelectItem value="conversations">Rapport Conversations</SelectItem>
                          <SelectItem value="brutes">Données Brutes</SelectItem>
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
                        onClick={() => setScheduleDialogOpen(false)}
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
                    {mockScheduledReports.map((report) => (
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
                            <Button variant="ghost" size="icon" className="size-8">
                              <Edit className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="size-8">
                              {report.status === 'Actif' ? (
                                <Pause className="size-3.5" />
                              ) : (
                                <Play className="size-3.5" />
                              )}
                            </Button>
                            <Button variant="ghost" size="icon" className="size-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
