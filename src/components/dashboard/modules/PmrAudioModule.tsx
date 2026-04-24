'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Eye,
  Volume2,
  Clock,
  Navigation,
  Megaphone,
  DoorOpen,
  AlertTriangle,
  Info,
  Trash2,
  Plus,
  RefreshCw,
  Loader2,
  Headphones,
  BarChart3,
  Languages,
  Play,
  CircleStop,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ── Types ───────────────────────────────────────────────────────────────────

interface AudioGeneration {
  id: string
  phone: string
  userId: string
  type: 'navigation' | 'announcement' | 'gate_info' | 'emergency' | 'general'
  inputText: string
  audioUrl: string | null
  language: string
  provider: string | null
  durationSec: number | null
  status: string
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

// ── Constants ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  navigation: '🧭 Navigation',
  announcement: '📢 Annonce',
  gate_info: '🚪 Info Porte',
  emergency: '🚨 Urgence',
  general: 'ℹ️ Général',
}

const TYPE_BADGE_CLASSES: Record<string, string> = {
  navigation: 'bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800',
  announcement: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  gate_info: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  emergency: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  general: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700',
}

const LANG_LABELS: Record<string, string> = {
  fr: '🇫🇷 Français',
  en: '🇬🇧 English',
  ar: '🇸🇦 العربية',
  wo: '🇸🇳 Wolof',
  es: '🇪🇸 Español',
  de: '🇩🇪 Deutsch',
  pt: '🇧🇷 Português',
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  pending: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  processing: 'bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800',
  failed: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
}

const STATUS_LABELS: Record<string, string> = {
  completed: '✅ Terminé',
  pending: '⏳ En attente',
  processing: '🔄 Traitement',
  failed: '❌ Échoué',
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function truncateText(text: string, maxLen: number = 50): string {
  if (!text) return '—'
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text
}

// ── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ title, value, icon, colorClass, iconBgClass }: {
  title: string
  value: number | string
  icon: React.ReactNode
  colorClass: string
  iconBgClass: string
}) {
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

// ── Spinner ─────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="size-8 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
    </div>
  )
}

// ── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Headphones className="size-10 mb-3 opacity-40" />
      <p>{message}</p>
    </div>
  )
}

// ── Type Badge ──────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  return (
    <Badge className={TYPE_BADGE_CLASSES[type] ?? 'bg-gray-100 text-gray-600 border-gray-200'}>
      {TYPE_LABELS[type] ?? type}
    </Badge>
  )
}

// ── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={STATUS_BADGE_CLASSES[status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  )
}

// ── Audio Player Button ─────────────────────────────────────────────────────

function AudioPlayer({ audioUrl }: { audioUrl: string | null }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  if (!audioUrl) {
    return (
      <span className="text-xs text-muted-foreground">—</span>
    )
  }

  const togglePlay = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl)
      audioRef.current.onended = () => setPlaying(false)
      audioRef.current.onerror = () => {
        setPlaying(false)
        toast.error('Erreur de lecture audio')
      }
    }
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play().catch(() => {
        toast.error('Impossible de lire le fichier audio')
      })
      setPlaying(true)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 text-xs gap-1 border-orange-200 text-orange-600 hover:bg-orange-50"
      onClick={togglePlay}
    >
      {playing ? <CircleStop className="size-3" /> : <Play className="size-3" />}
      {playing ? 'Stop' : 'Écouter'}
    </Button>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

export function PmrAudioModule() {
  // ── Data ──────────────────────────────────────────────────────────────────
  const [audios, setAudios] = useState<AudioGeneration[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [search, setSearch] = useState('')

  // ── Generate form ─────────────────────────────────────────────────────────
  const [genText, setGenText] = useState(
    'Tournez à gauche et avancez de 50 mètres pour rejoindre la porte B12.'
  )
  const [genType, setGenType] = useState<'navigation' | 'announcement' | 'gate_info' | 'emergency' | 'general'>('navigation')
  const [genLanguage, setGenLanguage] = useState('fr')
  const [isGenerating, setIsGenerating] = useState(false)

  // ── Delete dialog ─────────────────────────────────────────────────────────
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingAudio, setDeletingAudio] = useState<AudioGeneration | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ── Fetch Audios ──────────────────────────────────────────────────────────
  const fetchAudios = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    setIsRefreshing(true)
    try {
      const res = await fetch('/api/pmr-audio')
      if (res.ok) {
        const json = await res.json()
        const items: AudioGeneration[] = Array.isArray(json)
          ? json
          : json.data ?? json.items ?? json.audios ?? []
        setAudios(items)
      } else {
        setAudios([])
      }
    } catch {
      setAudios([])
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchAudios(true)
  }, [fetchAudios])

  // ── Generate Audio ────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!genText.trim()) {
      toast.error('Veuillez saisir un texte pour la description audio')
      return
    }
    setIsGenerating(true)
    try {
      const res = await fetch('/api/pmr-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: genText.trim(),
          type: genType,
          language: genLanguage,
        }),
      })
      if (res.ok) {
        toast.success('Audio généré avec succès !')
        fetchAudios(false)
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? err.message ?? 'Erreur lors de la génération audio')
      }
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.')
    } finally {
      setIsGenerating(false)
    }
  }

  // ── Delete Audio ──────────────────────────────────────────────────────────
  const confirmDelete = (audio: AudioGeneration) => {
    setDeletingAudio(audio)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingAudio) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/pmr-audio/${deletingAudio.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Audio supprimé avec succès')
        setAudios((prev) => prev.filter((a) => a.id !== deletingAudio.id))
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? 'Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.')
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setDeletingAudio(null)
    }
  }

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filteredAudios = useMemo(() => {
    if (!search) return audios
    const q = search.toLowerCase()
    return audios.filter(
      (a) =>
        (a.inputText ?? '').toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q) ||
        a.language.toLowerCase().includes(q) ||
        a.status.toLowerCase().includes(q) ||
        (a.phone ?? '').toLowerCase().includes(q)
    )
  }, [audios, search])

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalAudios = audios.length
  const navigationCount = audios.filter((a) => a.type === 'navigation').length
  const announcementCount = audios.filter((a) => a.type === 'announcement').length
  const totalDurationSec = audios.reduce((sum, a) => sum + (a.durationSec ?? 0), 0)
  const totalDurationMin = (totalDurationSec / 60).toFixed(1)

  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    const types = ['navigation', 'announcement', 'gate_info', 'emergency', 'general']
    types.forEach((t) => {
      counts[t] = audios.filter((a) => a.type === t).length
    })
    return counts
  }, [audios])

  const languageBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    audios.forEach((a) => {
      const lang = a.language || 'unknown'
      counts[lang] = (counts[lang] || 0) + 1
    })
    return counts
  }, [audios])

  // ══════════════════════════════════════════════════════════════════════════
  // ── RENDER ────────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          👁️ Assistance Visuelle PMR
        </h2>
        <p className="text-muted-foreground text-sm">
          Audio-description pour passagers malvoyants — Navigation guidée et
          informations portes
        </p>
      </div>

      <Tabs defaultValue="historique" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="historique" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">📜 Historique</span>
            <span className="sm:hidden">📜</span>
          </TabsTrigger>
          <TabsTrigger value="statistiques" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">📊 Statistiques</span>
            <span className="sm:hidden">📊</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════ TAB 1: Historique ═══════════════════ */}
        <TabsContent value="historique" className="space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Générations"
              value={totalAudios}
              icon={<Volume2 className="size-6 text-orange-600 dark:text-orange-400" />}
              colorClass="text-orange-600 dark:text-orange-400"
              iconBgClass="bg-orange-100 dark:bg-orange-900/30"
            />
            <StatCard
              title="Navigation"
              value={navigationCount}
              icon={<Navigation className="size-6 text-sky-600 dark:text-sky-400" />}
              colorClass="text-sky-600 dark:text-sky-400"
              iconBgClass="bg-sky-100 dark:bg-sky-900/30"
            />
            <StatCard
              title="Annonces"
              value={announcementCount}
              icon={<Megaphone className="size-6 text-amber-600 dark:text-amber-400" />}
              colorClass="text-amber-600 dark:text-amber-400"
              iconBgClass="bg-amber-100 dark:bg-amber-900/30"
            />
            <StatCard
              title="Durée Totale"
              value={`${totalDurationMin} min`}
              icon={<Clock className="size-6 text-emerald-600 dark:text-emerald-400" />}
              colorClass="text-emerald-600 dark:text-emerald-400"
              iconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
            />
          </div>

          {/* Generate audio card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="size-4 text-orange-500" />
                Générer un Audio de Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                  <Label>Texte</Label>
                  <Input
                    placeholder="Texte à convertir en audio..."
                    value={genText}
                    onChange={(e) => setGenText(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={genType}
                    onValueChange={(v) =>
                      setGenType(v as AudioGeneration['type'])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Langue</Label>
                  <Select
                    value={genLanguage}
                    onValueChange={setGenLanguage}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LANG_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={handleGenerate}
                    disabled={isGenerating || !genText.trim()}
                  >
                    {isGenerating ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Volume2 className="size-4" />
                    )}
                    Générer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* History table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">
                  Historique des Générations ({audios.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-60">
                    <Eye className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      className="pl-9 h-9 text-sm"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchAudios(false)}
                    disabled={isRefreshing}
                  >
                    <RefreshCw
                      className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                    />
                    Actualiser
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Spinner />
              ) : filteredAudios.length === 0 ? (
                <EmptyState message="Aucune génération audio trouvée. Créez votre première description audio." />
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky top-0 bg-background z-10">Type</TableHead>
                        <TableHead className="sticky top-0 bg-background z-10">Texte</TableHead>
                        <TableHead className="sticky top-0 bg-background z-10 hidden sm:table-cell">Langue</TableHead>
                        <TableHead className="sticky top-0 bg-background z-10 hidden md:table-cell">Durée</TableHead>
                        <TableHead className="sticky top-0 bg-background z-10">Statut</TableHead>
                        <TableHead className="sticky top-0 bg-background z-10 hidden lg:table-cell">Audio</TableHead>
                        <TableHead className="sticky top-0 bg-background z-10 hidden sm:table-cell">Date</TableHead>
                        <TableHead className="sticky top-0 bg-background z-10 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAudios.map((audio) => (
                        <TableRow key={audio.id}>
                          <TableCell>
                            <TypeBadge type={audio.type} />
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <p
                              className="text-sm truncate"
                              title={audio.inputText ?? ''}
                            >
                              {truncateText(audio.inputText, 50)}
                            </p>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge className="bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700">
                              {LANG_LABELS[audio.language] ?? audio.language}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm text-muted-foreground">
                              {audio.durationSec
                                ? `${audio.durationSec}s`
                                : '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={audio.status} />
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <AudioPlayer audioUrl={audio.audioUrl} />
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {audio.createdAt
                              ? formatDate(audio.createdAt)
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50"
                              onClick={() => confirmDelete(audio)}
                            >
                              <Trash2 className="size-3" />
                            </Button>
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

        {/* ═══════════════════ TAB 2: Statistiques ═══════════════════ */}
        <TabsContent value="statistiques" className="space-y-6">
          {/* Type breakdown */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="size-4 text-orange-500" />
                  Répartition par Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(typeBreakdown).map(([type, count]) => {
                    const pct =
                      totalAudios > 0
                        ? Math.round((count / totalAudios) * 100)
                        : 0
                    const barColor =
                      type === 'navigation'
                        ? 'bg-sky-500'
                        : type === 'announcement'
                          ? 'bg-orange-500'
                          : type === 'gate_info'
                            ? 'bg-amber-500'
                            : type === 'emergency'
                              ? 'bg-red-500'
                              : 'bg-gray-500'
                    return (
                      <div key={type} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">
                            {TYPE_LABELS[type] ?? type}
                          </span>
                          <span className="text-muted-foreground">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                  {totalAudios === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      Aucune donnée disponible
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Language breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Languages className="size-4 text-orange-500" />
                  Répartition par Langue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(languageBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([lang, count]) => {
                      const pct =
                        totalAudios > 0
                          ? Math.round((count / totalAudios) * 100)
                          : 0
                      const langColors = [
                        'bg-orange-500',
                        'bg-sky-500',
                        'bg-emerald-500',
                        'bg-amber-500',
                        'bg-purple-500',
                        'bg-pink-500',
                        'bg-teal-500',
                      ]
                      const barColor =
                        langColors[
                          Object.keys(languageBreakdown).indexOf(lang) %
                            langColors.length
                        ]
                      return (
                        <div key={lang} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">
                              {LANG_LABELS[lang] ?? lang.toUpperCase()}
                            </span>
                            <span className="text-muted-foreground">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  {Object.keys(languageBreakdown).length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      Aucune donnée disponible
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="size-4 text-orange-500" />
                Résumé Global
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 bg-background z-10">Métrique</TableHead>
                      <TableHead className="sticky top-0 bg-background z-10 text-right">Valeur</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Total Générations</TableCell>
                      <TableCell className="text-right font-bold text-orange-600 dark:text-orange-400">{totalAudios}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Durée Totale</TableCell>
                      <TableCell className="text-right">{totalDurationMin} min ({totalDurationSec}s)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Durée Moyenne</TableCell>
                      <TableCell className="text-right">
                        {totalAudios > 0
                          ? (totalDurationSec / totalAudios).toFixed(1) + 's'
                          : '—'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Types Utilisés</TableCell>
                      <TableCell className="text-right">
                        {Object.entries(typeBreakdown).filter(([, c]) => c > 0).length} / {Object.keys(typeBreakdown).length}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Langues Utilisées</TableCell>
                      <TableCell className="text-right">
                        {Object.keys(languageBreakdown).length}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Générations Réussies</TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-medium">
                        {audios.filter((a) => a.status === 'completed').length}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Générations Échouées</TableCell>
                      <TableCell className="text-right text-red-600 dark:text-red-400 font-medium">
                        {audios.filter((a) => a.status === 'failed').length}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════ DELETE DIALOG ═══════════════════ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l&apos;audio</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette génération audio{' '}
              <span className="font-semibold">
                {TYPE_LABELS[deletingAudio?.type ?? ''] ?? ''}
              </span>{' '}
              ? Cette action est irréversible.
              {deletingAudio?.errorMessage && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400">
                  ⚠️ Erreur : {deletingAudio.errorMessage}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
