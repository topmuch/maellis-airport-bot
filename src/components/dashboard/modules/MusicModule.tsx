'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Play,
  Pause,
  Music,
  Plus,
  Trash2,
  Edit3,
  BarChart3,
  Eye,
  EyeOff,
  ExternalLink,
  Youtube,
  Loader2,
  X,
  Save,
  Disc3,
  Layers,
  Headphones,
  TrendingUp,
} from 'lucide-react'
import {
  getYouTubeEmbedUrl,
  getYouTubeThumbnail,
  getYouTubeWatchUrl,
  extractYouTubeId,
} from '@/lib/youtube'

// ─── Types ──────────────────────────────────────────────

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  imageUrl: string | null
  isActive: boolean
  sortOrder: number
  _count?: { tracks: number }
}

interface Track {
  id: string
  title: string
  artist: string | null
  youtubeId: string
  youtubeUrl: string | null
  thumbnailUrl: string | null
  duration: string | null
  playCount: number
  sortOrder: number
  isActive: boolean
  categoryId: string
  category?: { name: string; slug: string } | null
}

interface MusicStats {
  totalCategories: number
  totalTracks: number
  activeTracks: number
  totalPlays: number
  topTracks: { id: string; title: string; artist: string | null; playCount: number }[]
  categoryBreakdown: {
    categoryId: string
    categoryName: string
    trackCount: number
    totalPlays: number
  }[]
}

interface CategoryFormData {
  name: string
  slug: string
  icon: string
  color: string
  description: string
  sortOrder: number
}

interface TrackFormData {
  categoryId: string
  youtubeUrl: string
  title: string
  artist: string
  duration: string
  sortOrder: number
}

const emptyCategoryForm: CategoryFormData = {
  name: '',
  slug: '',
  icon: '🎵',
  color: '#F97316',
  description: '',
  sortOrder: 0,
}

const emptyTrackForm: TrackFormData = {
  categoryId: '',
  youtubeUrl: '',
  title: '',
  artist: '',
  duration: '',
  sortOrder: 0,
}

// ─── Module Component ───────────────────────────────────

export function MusicModule() {
  // Data state
  const [categories, setCategories] = useState<Category[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [publicCategories, setPublicCategories] = useState<Category[]>([])
  const [publicTracks, setPublicTracks] = useState<Track[]>([])
  const [stats, setStats] = useState<MusicStats | null>(null)
  const [loading, setLoading] = useState(true)

  // UI state
  const [activeTab, setActiveTab] = useState<
    'lecteur' | 'categories' | 'tracks' | 'stats'
  >('lecteur')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null)
  const [thumbErrors, setThumbErrors] = useState<Set<string>>(new Set())

  // Admin form state — categories
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>(emptyCategoryForm)
  const [savingCategory, setSavingCategory] = useState(false)

  // Admin form state — tracks
  const [showTrackForm, setShowTrackForm] = useState(false)
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null)
  const [trackForm, setTrackForm] = useState<TrackFormData>(emptyTrackForm)
  const [savingTrack, setSavingTrack] = useState(false)
  const [adminCategoryFilter, setAdminCategoryFilter] = useState<string>('all')

  // ─── Data Loading ────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const [categoriesRes, tracksRes, publicCatRes, publicTracksRes, statsRes] =
        await Promise.all([
          fetch('/api/music/categories?admin=true'),
          fetch('/api/music/tracks?admin=true'),
          fetch('/api/music/categories'),
          fetch('/api/music/tracks'),
          fetch('/api/music/tracks?stats=true'),
        ])

      const categoriesData = await categoriesRes.json()
      const tracksData = await tracksRes.json()
      const publicCatData = await publicCatRes.json()
      const publicTracksData = await publicTracksRes.json()
      const statsData = await statsRes.json()

      setCategories(categoriesData.data || [])
      setTracks(tracksData.data || [])
      setPublicCategories(publicCatData.data || [])
      setPublicTracks(publicTracksData.data || [])
      setStats(statsData.data || null)
    } catch (error) {
      console.error('Failed to load music data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ─── Player Helpers ──────────────────────────────────

  const filteredPublicTracks =
    selectedCategory === 'all'
      ? publicTracks
      : publicTracks.filter((t) => t.categoryId === selectedCategory)

  const handlePlayTrack = async (track: Track) => {
    if (playingTrackId === track.id) {
      setPlayingTrackId(null)
      return
    }
    setPlayingTrackId(track.id)
    try {
      await fetch(`/api/music/tracks/${track.id}`, { method: 'POST' })
    } catch (error) {
      console.error('Failed to record play:', error)
    }
  }

  const handleThumbError = (trackId: string) => {
    setThumbErrors((prev) => new Set(prev).add(trackId))
  }

  // ─── Category CRUD ──────────────────────────────────

  const openCategoryForm = (cat?: Category) => {
    if (cat) {
      setEditingCategoryId(cat.id)
      setCategoryForm({
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon || '🎵',
        color: cat.color || '#F97316',
        description: cat.description || '',
        sortOrder: cat.sortOrder,
      })
    } else {
      setEditingCategoryId(null)
      setCategoryForm(emptyCategoryForm)
    }
    setShowCategoryForm(true)
  }

  const closeCategoryForm = () => {
    setShowCategoryForm(false)
    setEditingCategoryId(null)
    setCategoryForm(emptyCategoryForm)
  }

  const saveCategory = async () => {
    if (!categoryForm.name.trim() || !categoryForm.slug.trim()) return
    setSavingCategory(true)
    try {
      if (editingCategoryId) {
        await fetch(`/api/music/categories/${editingCategoryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(categoryForm),
        })
      } else {
        await fetch('/api/music/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(categoryForm),
        })
      }
      closeCategoryForm()
      loadData()
    } catch (error) {
      console.error('Failed to save category:', error)
    } finally {
      setSavingCategory(false)
    }
  }

  const deleteCategory = async (id: string) => {
    if (!confirm('Supprimer cette catégorie et toutes ses pistes ?')) return
    try {
      await fetch(`/api/music/categories/${id}`, { method: 'DELETE' })
      loadData()
    } catch (error) {
      console.error('Failed to delete category:', error)
    }
  }

  const toggleCategoryActive = async (cat: Category) => {
    try {
      await fetch(`/api/music/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !cat.isActive }),
      })
      loadData()
    } catch (error) {
      console.error('Failed to toggle category:', error)
    }
  }

  // ─── Track CRUD ─────────────────────────────────────

  const openTrackForm = (track?: Track) => {
    if (track) {
      setEditingTrackId(track.id)
      setTrackForm({
        categoryId: track.categoryId,
        youtubeUrl: track.youtubeUrl || '',
        title: track.title || '',
        artist: track.artist || '',
        duration: track.duration || '',
        sortOrder: track.sortOrder,
      })
    } else {
      setEditingTrackId(null)
      setTrackForm(emptyTrackForm)
    }
    setShowTrackForm(true)
  }

  const closeTrackForm = () => {
    setShowTrackForm(false)
    setEditingTrackId(null)
    setTrackForm(emptyTrackForm)
  }

  const saveTrack = async () => {
    if (!trackForm.categoryId || !trackForm.youtubeUrl.trim()) return
    setSavingTrack(true)
    try {
      const payload = { ...trackForm }
      if (!payload.title.trim()) delete payload.title
      if (!payload.artist.trim()) delete payload.artist
      if (!payload.duration.trim()) delete payload.duration

      if (editingTrackId) {
        await fetch(`/api/music/tracks/${editingTrackId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch('/api/music/tracks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      closeTrackForm()
      loadData()
    } catch (error) {
      console.error('Failed to save track:', error)
    } finally {
      setSavingTrack(false)
    }
  }

  const deleteTrack = async (id: string) => {
    if (!confirm('Supprimer cette piste ?')) return
    try {
      await fetch(`/api/music/tracks/${id}`, { method: 'DELETE' })
      loadData()
    } catch (error) {
      console.error('Failed to delete track:', error)
    }
  }

  const toggleTrackActive = async (track: Track) => {
    try {
      await fetch(`/api/music/tracks/${track.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !track.isActive }),
      })
      loadData()
    } catch (error) {
      console.error('Failed to toggle track:', error)
    }
  }

  // ─── YouTube URL Preview ────────────────────────────

  const previewVideoId = extractYouTubeId(trackForm.youtubeUrl)

  // ─── Loading ────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-orange-500" />
        <span className="ml-3 text-muted-foreground">Chargement du module musique...</span>
      </div>
    )
  }

  // ─── Most Popular Category Helper ───────────────────

  const mostPopularCategory =
    stats?.categoryBreakdown && stats.categoryBreakdown.length > 0
      ? stats.categoryBreakdown.reduce((prev, curr) =>
          curr.totalPlays > prev.totalPlays ? curr : prev,
        )
      : null

  // ─── Render ─────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            🎵 Smartly Zen Music
          </h2>
          <p className="text-sm text-muted-foreground">
            Mini-player musical pour passagers — YouTube tracks
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {(
          [
            { key: 'lecteur', label: '🎧 Lecteur', icon: Headphones },
            { key: 'categories', label: '🏷️ Catégories', icon: Layers },
            { key: 'tracks', label: '🎵 Tracks', icon: Disc3 },
            { key: 'stats', label: '📊 Statistiques', icon: BarChart3 },
          ] as const
        ).map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.key)}
            className={
              activeTab === tab.key ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''
            }
          >
            <tab.icon className="mr-1.5 size-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* TAB 1: Lecteur (Player View)                   */}
      {/* ═══════════════════════════════════════════════ */}
      {activeTab === 'lecteur' && (
        <div className="space-y-4">
          {/* Category Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Tout
            </button>
            {publicCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'text-white shadow-sm'
                    : 'text-white/80 hover:text-white'
                }`}
                style={
                  selectedCategory === cat.id
                    ? { backgroundColor: cat.color || '#F97316' }
                    : { backgroundColor: `${cat.color || '#F97316'}33` }
                }
              >
                {cat.icon || '🎵'} {cat.name}
              </button>
            ))}
          </div>

          {/* Track Grid */}
          {filteredPublicTracks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Music className="mb-3 size-12 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Aucune piste disponible</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {filteredPublicTracks.map((track) => {
                const isPlaying = playingTrackId === track.id
                const hasThumbError = thumbErrors.has(track.id)
                return (
                  <div key={track.id} className="group space-y-2">
                    {/* Thumbnail / Iframe */}
                    <div className="relative aspect-video overflow-hidden rounded-lg">
                      {isPlaying ? (
                        <iframe
                          src={getYouTubeEmbedUrl(track.youtubeId, true)}
                          title={track.title}
                          className="absolute inset-0 size-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          loading="lazy"
                        />
                      ) : (
                        <>
                          {hasThumbError ? (
                            <div
                              className="flex h-full w-full items-center justify-center"
                              style={{
                                background: track.category
                                  ? `linear-gradient(135deg, ${track.category.slug === 'jazz' ? '#8B4513' : '#F97316'}, #1a1a2e)`
                                  : 'linear-gradient(135deg, #F97316, #1a1a2e)',
                              }}
                            >
                              <Music className="size-8 text-white/40" />
                            </div>
                          ) : (
                            <img
                              src={
                                track.thumbnailUrl ||
                                getYouTubeThumbnail(track.youtubeId)
                              }
                              alt={track.title}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={() => handleThumbError(track.id)}
                              loading="lazy"
                            />
                          )}
                          {/* Play Overlay */}
                          <button
                            onClick={() => handlePlayTrack(track)}
                            className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <div className="flex size-12 items-center justify-center rounded-full bg-orange-500/90 shadow-lg transition-transform group-hover:scale-110">
                              {isPlaying ? (
                                <Pause className="size-5 text-white" />
                              ) : (
                                <Play className="size-5 text-white" />
                              )}
                            </div>
                          </button>
                        </>
                      )}
                    </div>

                    {/* Title + Artist */}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {track.title}
                      </p>
                      {track.artist && (
                        <p className="truncate text-xs text-muted-foreground">
                          {track.artist}
                        </p>
                      )}
                    </div>

                    {/* Bottom row: play count + youtube link */}
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px]">
                        <Play className="mr-1 size-2.5" />
                        {track.playCount}
                      </Badge>
                      <a
                        href={getYouTubeWatchUrl(track.youtubeId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-red-500"
                      >
                        <Youtube className="size-3" />
                        YouTube
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* TAB 2: Catégories (Admin CRUD)                 */}
      {/* ═══════════════════════════════════════════════ */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          {/* Add Button */}
          {!showCategoryForm && (
            <Button
              onClick={() => openCategoryForm()}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus className="mr-2 size-4" />
              Ajouter catégorie
            </Button>
          )}

          {/* Inline Form */}
          {showCategoryForm && (
            <Card className="border-orange-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  {editingCategoryId ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Nom</Label>
                    <Input
                      placeholder="Ex: Jazz"
                      value={categoryForm.name}
                      onChange={(e) =>
                        setCategoryForm({ ...categoryForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Slug</Label>
                    <Input
                      placeholder="Ex: jazz"
                      value={categoryForm.slug}
                      onChange={(e) =>
                        setCategoryForm({ ...categoryForm, slug: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Icône (emoji)</Label>
                    <Input
                      placeholder="🎵"
                      value={categoryForm.icon}
                      onChange={(e) =>
                        setCategoryForm({ ...categoryForm, icon: e.target.value })
                      }
                      className="w-24"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Couleur</Label>
                    <div className="flex items-center gap-2">
                      <div
                        className="size-8 shrink-0 rounded-md border"
                        style={{ backgroundColor: categoryForm.color }}
                      />
                      <Input
                        placeholder="#F97316"
                        value={categoryForm.color}
                        onChange={(e) =>
                          setCategoryForm({ ...categoryForm, color: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    placeholder="Description de la catégorie..."
                    value={categoryForm.description}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, description: e.target.value })
                    }
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    onClick={saveCategory}
                    disabled={savingCategory || !categoryForm.name.trim() || !categoryForm.slug.trim()}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {savingCategory ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 size-4" />
                    )}
                    Enregistrer
                  </Button>
                  <Button variant="ghost" onClick={closeCategoryForm}>
                    <X className="mr-2 size-4" />
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Categories List */}
          <Card>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left text-xs font-medium">Catégorie</th>
                      <th className="p-3 text-left text-xs font-medium">Slug</th>
                      <th className="p-3 text-center text-xs font-medium">Icône</th>
                      <th className="p-3 text-center text-xs font-medium">Couleur</th>
                      <th className="p-3 text-center text-xs font-medium">Pistes</th>
                      <th className="p-3 text-center text-xs font-medium">Active</th>
                      <th className="p-3 text-right text-xs font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => (
                      <tr key={cat.id} className="border-t transition-colors hover:bg-muted/30">
                        <td className="p-3 font-medium">{cat.name}</td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">{cat.slug}</td>
                        <td className="p-3 text-center text-lg">{cat.icon || '🎵'}</td>
                        <td className="p-3 text-center">
                          <div
                            className="mx-auto size-6 rounded-full border border-white/20"
                            style={{ backgroundColor: cat.color || '#F97316' }}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="secondary" className="text-xs">
                            {cat._count?.tracks ?? 0}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Switch
                            checked={cat.isActive}
                            onCheckedChange={() => toggleCategoryActive(cat)}
                          />
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openCategoryForm(cat)}
                              className="h-7 w-7 p-0"
                            >
                              <Edit3 className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCategory(cat.id)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {categories.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-muted-foreground">
                          Aucune catégorie
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* TAB 3: Tracks (Admin CRUD)                     */}
      {/* ═══════════════════════════════════════════════ */}
      {activeTab === 'tracks' && (
        <div className="space-y-4">
          {/* Top Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:w-64">
              <Select value={adminCategoryFilter} onValueChange={setAdminCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrer par catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!showTrackForm && (
              <Button
                onClick={() => openTrackForm()}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Plus className="mr-2 size-4" />
                Ajouter track
              </Button>
            )}
          </div>

          {/* Inline Form */}
          {showTrackForm && (
            <Card className="border-orange-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  {editingTrackId ? 'Modifier la piste' : 'Nouvelle piste'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Catégorie</Label>
                    <Select
                      value={trackForm.categoryId}
                      onValueChange={(val) =>
                        setTrackForm({ ...trackForm, categoryId: val })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.icon} {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Titre (optionnel)</Label>
                    <Input
                      placeholder="Auto depuis YouTube si vide"
                      value={trackForm.title}
                      onChange={(e) =>
                        setTrackForm({ ...trackForm, title: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Artiste</Label>
                    <Input
                      placeholder="Nom de l'artiste"
                      value={trackForm.artist}
                      onChange={(e) =>
                        setTrackForm({ ...trackForm, artist: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Durée</Label>
                    <Input
                      placeholder="3:45"
                      value={trackForm.duration}
                      onChange={(e) =>
                        setTrackForm({ ...trackForm, duration: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">URL YouTube *</Label>
                  <Input
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={trackForm.youtubeUrl}
                    onChange={(e) =>
                      setTrackForm({ ...trackForm, youtubeUrl: e.target.value })
                    }
                  />
                  {/* Live Preview */}
                  {previewVideoId && (
                    <div className="mt-2 rounded-lg border bg-muted/30 p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Youtube className="size-3.5 text-red-500" />
                        <span>
                          ID:{' '}
                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                            {previewVideoId}
                          </code>
                        </span>
                      </div>
                      <div className="mt-2 overflow-hidden rounded-md">
                        <img
                          src={getYouTubeThumbnail(previewVideoId, 'mqdefault')}
                          alt="Aperçu"
                          className="h-auto w-full max-w-xs rounded-md"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    onClick={saveTrack}
                    disabled={
                      savingTrack ||
                      !trackForm.categoryId ||
                      !trackForm.youtubeUrl.trim() ||
                      !previewVideoId
                    }
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {savingTrack ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 size-4" />
                    )}
                    Enregistrer
                  </Button>
                  <Button variant="ghost" onClick={closeTrackForm}>
                    <X className="mr-2 size-4" />
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tracks Table */}
          <Card>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left text-xs font-medium">Miniature</th>
                      <th className="p-3 text-left text-xs font-medium">Titre</th>
                      <th className="p-3 text-left text-xs font-medium">Artiste</th>
                      <th className="p-3 text-left text-xs font-medium">Catégorie</th>
                      <th className="p-3 text-left text-xs font-medium">YouTube ID</th>
                      <th className="p-3 text-center text-xs font-medium">Plays</th>
                      <th className="p-3 text-center text-xs font-medium">Active</th>
                      <th className="p-3 text-right text-xs font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tracks
                      .filter(
                        (t) =>
                          adminCategoryFilter === 'all' ||
                          t.categoryId === adminCategoryFilter,
                      )
                      .map((track) => (
                        <tr
                          key={track.id}
                          className="border-t transition-colors hover:bg-muted/30"
                        >
                          <td className="p-3">
                            <img
                              src={
                                track.thumbnailUrl ||
                                getYouTubeThumbnail(track.youtubeId)
                              }
                              alt=""
                              className="size-12 rounded object-cover"
                              style={{ aspectRatio: '16/9' }}
                              loading="lazy"
                            />
                          </td>
                          <td className="max-w-[160px] truncate p-3 font-medium">
                            {track.title}
                          </td>
                          <td className="max-w-[120px] truncate p-3 text-muted-foreground">
                            {track.artist || '—'}
                          </td>
                          <td className="p-3">
                            <Badge variant="secondary" className="text-xs">
                              {track.category?.name || '—'}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono text-xs text-muted-foreground">
                            {track.youtubeId}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="secondary" className="text-xs">
                              <Play className="mr-1 size-2.5" />
                              {track.playCount}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Switch
                              checked={track.isActive}
                              onCheckedChange={() => toggleTrackActive(track)}
                            />
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openTrackForm(track)}
                                className="h-7 w-7 p-0"
                              >
                                <Edit3 className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteTrack(track.id)}
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {tracks.filter(
                      (t) =>
                        adminCategoryFilter === 'all' ||
                        t.categoryId === adminCategoryFilter,
                    ).length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-muted-foreground">
                          Aucune piste trouvée
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* TAB 4: Statistiques (Analytics)                */}
      {/* ═══════════════════════════════════════════════ */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Layers className="size-7 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.totalCategories}</p>
                    <p className="text-xs text-muted-foreground">Catégories</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-teal-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Disc3 className="size-7 text-teal-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.totalTracks}</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.activeTracks} actives
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-rose-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Play className="size-7 text-rose-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {stats.totalPlays.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Lectures totales</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="size-7 text-amber-500" />
                  <div>
                    <p className="text-lg font-bold truncate">
                      {mostPopularCategory?.categoryName || '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">Top catégorie</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Top 5 Tracks */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BarChart3 className="size-4 text-orange-500" />
                  Top 5 pistes les plus jouées
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topTracks.map((track, idx) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
                    >
                      <div
                        className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                          idx === 0
                            ? 'bg-amber-500'
                            : idx === 1
                              ? 'bg-gray-400'
                              : idx === 2
                                ? 'bg-amber-700'
                                : 'bg-muted-foreground/30'
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{track.title}</p>
                        {track.artist && (
                          <p className="truncate text-xs text-muted-foreground">
                            {track.artist}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {track.playCount}
                      </Badge>
                    </div>
                  ))}
                  {stats.topTracks.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      Aucune lecture enregistrée
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Layers className="size-4 text-teal-500" />
                  Répartition par catégorie
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.categoryBreakdown.map((cat) => (
                    <div
                      key={cat.categoryId}
                      className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{cat.categoryName}</p>
                        <p className="text-xs text-muted-foreground">
                          {cat.trackCount} {cat.trackCount > 1 ? 'pistes' : 'piste'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">
                          {cat.totalPlays.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-muted-foreground">lectures</p>
                      </div>
                    </div>
                  ))}
                  {stats.categoryBreakdown.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      Aucune catégorie
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
