'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
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
  Youtube,
  Loader2,
  X,
  Save,
  Disc3,
  Layers,
  Headphones,
  TrendingUp,
  Heart,
  ListMusic,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  ListPlus,
} from 'lucide-react'
import {
  getYouTubeEmbedUrl,
  getYouTubeThumbnail,
  getYouTubeWatchUrl,
  extractYouTubeId,
} from '@/lib/youtube'
import { apiClient } from '@/lib/api-client'

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

type RepeatMode = 'off' | 'all' | 'one'

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

// ─── localStorage helpers ───────────────────────────────

const STORAGE_KEYS = {
  queue: 'smartly_music_queue',
  favorites: 'smartly_music_favorites',
  volume: 'smartly_music_volume',
} as const

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or unavailable
  }
}

// ─── Equalizer Animation Component ──────────────────────

function EqualizerBars() {
  return (
    <div className="flex items-end gap-0.5 size-4">
      <div className="w-[3px] bg-orange-500 rounded-full animate-equalizer-bar-1" style={{ height: '60%', animationDelay: '0s' }} />
      <div className="w-[3px] bg-orange-400 rounded-full animate-equalizer-bar-2" style={{ height: '100%', animationDelay: '0.15s' }} />
      <div className="w-[3px] bg-orange-500 rounded-full animate-equalizer-bar-3" style={{ height: '40%', animationDelay: '0.3s' }} />
      <div className="w-[3px] bg-orange-400 rounded-full animate-equalizer-bar-4" style={{ height: '80%', animationDelay: '0.45s' }} />
    </div>
  )
}

// ─── Parse duration string to seconds ───────────────────

function parseDurationToSeconds(duration: string | null): number {
  if (!duration) return 210 // default 3:30
  const parts = duration.split(':')
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10)
    const secs = parseInt(parts[1], 10)
    if (!isNaN(mins) && !isNaN(secs)) return mins * 60 + secs
  }
  if (parts.length === 3) {
    const hrs = parseInt(parts[0], 10)
    const mins = parseInt(parts[1], 10)
    const secs = parseInt(parts[2], 10)
    if (!isNaN(hrs) && !isNaN(mins) && !isNaN(secs)) return hrs * 3600 + mins * 60 + secs
  }
  return 210
}

function formatSeconds(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = Math.floor(totalSeconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
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
    'lecteur' | 'categories' | 'tracks' | 'stats' | 'queue'
  >('lecteur')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null)
  const [thumbErrors, setThumbErrors] = useState<Set<string>>(new Set())

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>(() =>
    loadFromStorage<string[]>(STORAGE_KEYS.favorites, [])
  )

  // Queue state
  const [queue, setQueue] = useState<string[]>(() =>
    loadFromStorage<string[]>(STORAGE_KEYS.queue, [])
  )

  // Playback controls
  const [shuffleOn, setShuffleOn] = useState(false)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off')
  const [volume, setVolume] = useState(() => loadFromStorage<number>(STORAGE_KEYS.volume, 80))
  const [progress, setProgress] = useState(0) // 0-100 simulated
  const [currentTime, setCurrentTime] = useState(0) // seconds simulated

  // Track favorites filter
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

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

  // Simulated playback timer ref
  const playbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ─── Persist state to localStorage ────────────────────

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.favorites, favorites)
  }, [favorites])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.queue, queue)
  }, [queue])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.volume, volume)
  }, [volume])

  // ─── Simulated Playback Progress ─────────────────────

  const playingTrack = publicTracks.find((t) => t.id === playingTrackId) || null
  const totalDuration = playingTrack ? parseDurationToSeconds(playingTrack.duration) : 210

  useEffect(() => {
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current)
      playbackTimerRef.current = null
    }

    if (playingTrackId) {
      playbackTimerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 1
          if (next >= totalDuration) {
            // Track ended — handle next
            handleTrackEnd()
            return 0
          }
          setProgress((next / totalDuration) * 100)
          return next
        })
      }, 1000)
    } else {
      setProgress(0)
      setCurrentTime(0)
    }

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingTrackId, totalDuration])

  // ─── Data Loading ────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const [categoriesRes, tracksRes, publicCatRes, publicTracksRes, statsRes] =
        await Promise.all([
          apiClient.get<Category[]>('/api/music/categories?admin=true'),
          apiClient.get<Track[]>('/api/music/tracks?admin=true'),
          apiClient.get<Category[]>('/api/music/categories'),
          apiClient.get<Track[]>('/api/music/tracks'),
          apiClient.get<MusicStats>('/api/music/tracks?stats=true'),
        ])

      setCategories(categoriesRes.success ? categoriesRes.data : [])
      setTracks(tracksRes.success ? tracksRes.data : [])
      setPublicCategories(publicCatRes.success ? publicCatRes.data : [])
      setPublicTracks(publicTracksRes.success ? publicTracksRes.data : [])
      setStats(statsRes.success ? statsRes.data : null)
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

  const displayTracks = showFavoritesOnly
    ? filteredPublicTracks.filter((t) => favorites.includes(t.id))
    : filteredPublicTracks

  const handlePlayTrack = async (track: Track) => {
    if (playingTrackId === track.id) {
      setPlayingTrackId(null)
      return
    }
    setPlayingTrackId(track.id)
    setProgress(0)
    setCurrentTime(0)
    try {
      await apiClient.post(`/api/music/tracks/${track.id}`)
    } catch (error) {
      console.error('Failed to record play:', error)
    }
  }

  const handlePlayFromQueue = async (trackId: string) => {
    setPlayingTrackId(trackId)
    setProgress(0)
    setCurrentTime(0)
    const track = publicTracks.find((t) => t.id === trackId)
    if (track) {
      try {
        await apiClient.post(`/api/music/tracks/${track.id}`)
      } catch (error) {
        console.error('Failed to record play:', error)
      }
    }
  }

  const handleTrackEnd = useCallback(() => {
    if (queue.length === 0) {
      setPlayingTrackId(null)
      setProgress(0)
      setCurrentTime(0)
      return
    }

    const currentIdx = queue.indexOf(playingTrackId || '')
    let nextIdx: number

    if (shuffleOn) {
      nextIdx = Math.floor(Math.random() * queue.length)
    } else {
      nextIdx = currentIdx + 1
    }

    if (nextIdx >= queue.length) {
      if (repeatMode === 'all') {
        nextIdx = 0
      } else if (repeatMode === 'one') {
        nextIdx = currentIdx >= 0 ? currentIdx : 0
      } else {
        setPlayingTrackId(null)
        setProgress(0)
        setCurrentTime(0)
        return
      }
    }

    const nextTrackId = queue[nextIdx]
    if (nextTrackId) {
      setPlayingTrackId(nextTrackId)
      setProgress(0)
      setCurrentTime(0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, playingTrackId, shuffleOn, repeatMode])

  const handleNext = () => {
    if (queue.length === 0) return
    const currentIdx = queue.indexOf(playingTrackId || '')
    let nextIdx: number
    if (shuffleOn) {
      nextIdx = Math.floor(Math.random() * queue.length)
    } else {
      nextIdx = currentIdx + 1
      if (nextIdx >= queue.length) nextIdx = 0
    }
    const nextTrackId = queue[nextIdx]
    if (nextTrackId) {
      setPlayingTrackId(nextTrackId)
      setProgress(0)
      setCurrentTime(0)
    }
  }

  const handlePrevious = () => {
    if (queue.length === 0) return
    const currentIdx = queue.indexOf(playingTrackId || '')
    let prevIdx = currentIdx - 1
    if (prevIdx < 0) prevIdx = queue.length - 1
    const prevTrackId = queue[prevIdx]
    if (prevTrackId) {
      setPlayingTrackId(prevTrackId)
      setProgress(0)
      setCurrentTime(0)
    }
  }

  const handleSeek = (value: number[]) => {
    const pct = value[0]
    setProgress(pct)
    setCurrentTime((pct / 100) * totalDuration)
  }

  const handleThumbError = (trackId: string) => {
    setThumbErrors((prev) => new Set(prev).add(trackId))
  }

  // ─── Queue Management ────────────────────────────────

  const addToQueue = (trackId: string) => {
    setQueue((prev) => {
      if (prev.includes(trackId)) return prev
      return [...prev, trackId]
    })
  }

  const removeFromQueue = (trackId: string) => {
    setQueue((prev) => prev.filter((id) => id !== trackId))
  }

  const clearQueue = () => {
    setQueue([])
  }

  const moveInQueue = (fromIdx: number, direction: 'up' | 'down') => {
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1
    if (toIdx < 0 || toIdx >= queue.length) return
    setQueue((prev) => {
      const newQueue = [...prev]
      const temp = newQueue[fromIdx]
      newQueue[fromIdx] = newQueue[toIdx]
      newQueue[toIdx] = temp
      return newQueue
    })
  }

  // ─── Favorites Management ────────────────────────────

  const toggleFavorite = (trackId: string) => {
    setFavorites((prev) =>
      prev.includes(trackId)
        ? prev.filter((id) => id !== trackId)
        : [...prev, trackId]
    )
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
        await apiClient.put(`/api/music/categories/${editingCategoryId}`, categoryForm)
      } else {
        await apiClient.post('/api/music/categories', categoryForm)
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
      await apiClient.delete(`/api/music/categories/${id}`)
      loadData()
    } catch (error) {
      console.error('Failed to delete category:', error)
    }
  }

  const toggleCategoryActive = async (cat: Category) => {
    try {
      await apiClient.put(`/api/music/categories/${cat.id}`, { isActive: !cat.isActive })
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
      const payload = { ...trackForm } as Record<string, string | number>
      if (!(payload.title as string)?.trim()) delete payload.title
      if (!(payload.artist as string)?.trim()) delete payload.artist
      if (!(payload.duration as string)?.trim()) delete payload.duration

      if (editingTrackId) {
        await apiClient.put(`/api/music/tracks/${editingTrackId}`, payload)
      } else {
        await apiClient.post('/api/music/tracks', payload)
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
      await apiClient.delete(`/api/music/tracks/${id}`)
      loadData()
    } catch (error) {
      console.error('Failed to delete track:', error)
    }
  }

  const toggleTrackActive = async (track: Track) => {
    try {
      await apiClient.put(`/api/music/tracks/${track.id}`, { isActive: !track.isActive })
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

  // ─── Queue Tab Count Helper ─────────────────────────

  const queueTabLabel = queue.length > 0 ? `📋 File (${queue.length})` : '📋 File'

  const favoritesTabLabel = favorites.length > 0
    ? `❤️ Mes favoris (${favorites.length})`
    : '❤️ Mes favoris'

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
            { key: 'queue', label: queueTabLabel, icon: ListMusic },
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
      {/* TAB: File d&apos;attente (Queue)               */}
      {/* ═══════════════════════════════════════════════ */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Now Playing Bar */}
          {playingTrack && (
            <Card className="border-orange-500/30 bg-gradient-to-r from-orange-50/50 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="relative aspect-video overflow-hidden rounded-lg size-16 shrink-0">
                    <iframe
                      src={getYouTubeEmbedUrl(playingTrack.youtubeId, true)}
                      title={playingTrack.title}
                      className="absolute inset-0 size-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <EqualizerBars />
                      <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">En lecture</span>
                    </div>
                    <p className="text-sm font-semibold truncate mt-1">{playingTrack.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{playingTrack.artist || 'Artiste inconnu'}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setPlayingTrackId(null)}
                  >
                    <Pause className="size-4" />
                  </Button>
                </div>

                {/* Progress Bar */}
                <div className="mt-3 space-y-1">
                  <Slider
                    value={[progress]}
                    onValueChange={handleSeek}
                    max={100}
                    step={0.5}
                    className="cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatSeconds(currentTime)}</span>
                    <span>{playingTrack.duration || '3:30'}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="mt-3 flex items-center justify-between">
                  {/* Shuffle + Repeat */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 w-8 p-0 ${shuffleOn ? 'text-orange-500' : 'text-muted-foreground'}`}
                      onClick={() => setShuffleOn(!shuffleOn)}
                      title={shuffleOn ? 'Mélange activé' : 'Mélange désactivé'}
                    >
                      <Shuffle className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 w-8 p-0 ${repeatMode !== 'off' ? 'text-orange-500' : 'text-muted-foreground'}`}
                      onClick={() => {
                        if (repeatMode === 'off') setRepeatMode('all')
                        else if (repeatMode === 'all') setRepeatMode('one')
                        else setRepeatMode('off')
                      }}
                      title={repeatMode === 'off' ? 'Répétition désactivée' : repeatMode === 'all' ? 'Répéter tout' : 'Répéter un seul'}
                    >
                      {repeatMode === 'one' ? <Repeat1 className="size-4" /> : <Repeat className="size-4" />}
                    </Button>
                  </div>

                  {/* Prev / Next */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={handlePrevious}
                      disabled={queue.length === 0}
                    >
                      <SkipBack className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={handleNext}
                      disabled={queue.length === 0}
                    >
                      <SkipForward className="size-4" />
                    </Button>
                  </div>

                  {/* Volume */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setVolume(volume === 0 ? 80 : 0)}
                    >
                      {volume === 0 ? (
                        <VolumeX className="size-4 text-muted-foreground" />
                      ) : (
                        <Volume2 className="size-4" />
                      )}
                    </Button>
                    <div className="w-20">
                      <Slider
                        value={[volume]}
                        onValueChange={(v) => setVolume(v[0])}
                        max={100}
                        step={1}
                        className="cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Queue Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <ListMusic className="size-4 text-orange-500" />
              File d&apos;attente
              {queue.length > 0 && (
                <Badge variant="secondary">{queue.length}</Badge>
              )}
            </h3>
            {queue.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={clearQueue}
              >
                <Trash2 className="size-3.5 mr-1" />
                Vider la file
              </Button>
            )}
          </div>

          {/* Queue List */}
          <Card>
            <CardContent className="p-0">
              {queue.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <ListMusic className="size-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    La file d&apos;attente est vide
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ajoutez des pistes depuis l&apos;onglet Lecteur
                  </p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto divide-y">
                  {queue.map((trackId, idx) => {
                    const track = publicTracks.find((t) => t.id === trackId)
                    if (!track) return null
                    const isCurrent = playingTrackId === track.id
                    return (
                      <div
                        key={track.id}
                        className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30 ${isCurrent ? 'bg-orange-50/50 dark:bg-orange-950/10' : ''}`}
                      >
                        {/* Now playing indicator */}
                        <div className="w-6 shrink-0 flex justify-center">
                          {isCurrent ? (
                            <EqualizerBars />
                          ) : (
                            <span className="text-xs text-muted-foreground font-medium">{idx + 1}</span>
                          )}
                        </div>

                        {/* Thumbnail */}
                        <img
                          src={
                            track.thumbnailUrl ||
                            getYouTubeThumbnail(track.youtubeId)
                          }
                          alt=""
                          className="size-10 rounded object-cover shrink-0"
                          style={{ aspectRatio: '16/9' }}
                          loading="lazy"
                        />

                        {/* Track Info */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isCurrent ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                            {track.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {track.artist || 'Artiste inconnu'}
                          </p>
                        </div>

                        {/* Duration */}
                        <span className="text-xs text-muted-foreground font-mono shrink-0">
                          {track.duration || '3:30'}
                        </span>

                        {/* Reorder Buttons */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => moveInQueue(idx, 'up')}
                            disabled={idx === 0}
                          >
                            <ChevronUp className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => moveInQueue(idx, 'down')}
                            disabled={idx === queue.length - 1}
                          >
                            <ChevronDown className="size-3" />
                          </Button>
                        </div>

                        {/* Play / Remove */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          {!isCurrent && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handlePlayFromQueue(track.id)}
                            >
                              <Play className="size-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => removeFromQueue(track.id)}
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* TAB: Lecteur (Player View)                   */}
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
          {displayTracks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Music className="mb-3 size-12 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {showFavoritesOnly ? 'Aucun favori trouvé' : 'Aucune piste disponible'}
                </p>
                {showFavoritesOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setShowFavoritesOnly(false)}
                  >
                    Voir toutes les pistes
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {displayTracks.map((track) => {
                const isPlaying = playingTrackId === track.id
                const hasThumbError = thumbErrors.has(track.id)
                const isFavorite = favorites.includes(track.id)
                const isInQueue = queue.includes(track.id)
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

                          {/* Favorite Button (top-right) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFavorite(track.id)
                            }}
                            className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/60"
                          >
                            <Heart
                              className={`size-3.5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}`}
                            />
                          </button>

                          {/* Queue Button (top-left) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              addToQueue(track.id)
                            }}
                            className="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/60"
                            title="Ajouter à la file"
                          >
                            <ListPlus className={`size-3.5 ${isInQueue ? 'text-orange-400' : 'text-white'}`} />
                          </button>

                          {/* Now Playing Indicator */}
                          {isPlaying && (
                            <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1">
                              <EqualizerBars />
                              <span className="text-[10px] text-white font-medium">En lecture</span>
                            </div>
                          )}
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

                    {/* Bottom row: actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-[10px]">
                          <Play className="mr-1 size-2.5" />
                          {track.playCount}
                        </Badge>
                        <button
                          onClick={() => toggleFavorite(track.id)}
                          className="p-1 rounded hover:bg-muted/50 transition-colors"
                          title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        >
                          <Heart
                            className={`size-3.5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
                          />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => addToQueue(track.id)}
                          className="p-1 rounded hover:bg-muted/50 transition-colors"
                          title={isInQueue ? 'Déjà dans la file' : 'Ajouter à la file'}
                        >
                          <ListPlus className={`size-3.5 ${isInQueue ? 'text-orange-500' : 'text-muted-foreground'}`} />
                        </button>
                        <a
                          href={getYouTubeWatchUrl(track.youtubeId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-red-500 p-1"
                        >
                          <Youtube className="size-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* TAB: Catégories (Admin CRUD)                 */}
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
      {/* TAB: Tracks (Admin CRUD)                     */}
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
            <div className="flex items-center gap-2">
              {/* Favorites Filter Toggle */}
              <Button
                variant={showFavoritesOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={showFavoritesOnly ? 'bg-red-500 hover:bg-red-600 text-white' : ''}
              >
                <Heart className={`size-3.5 mr-1 ${showFavoritesOnly ? 'fill-white' : ''}`} />
                {favoritesTabLabel}
              </Button>
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
                          (adminCategoryFilter === 'all' ||
                            t.categoryId === adminCategoryFilter) &&
                          (!showFavoritesOnly || favorites.includes(t.id))
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
                                className="h-7 w-7 p-0"
                                onClick={() => toggleFavorite(track.id)}
                                title="Favori"
                              >
                                <Heart className={`size-3.5 ${favorites.includes(track.id) ? 'fill-red-500 text-red-500' : ''}`} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => openTrackForm(track)}
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
                        (adminCategoryFilter === 'all' ||
                          t.categoryId === adminCategoryFilter) &&
                        (!showFavoritesOnly || favorites.includes(t.id))
                    ).length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-muted-foreground">
                          {showFavoritesOnly ? 'Aucun favori trouvé' : 'Aucune piste trouvée'}
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
      {/* TAB: Statistiques (Analytics)                */}
      {/* ═══════════════════════════════════════════════ */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Disc3 className="size-7 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {stats.totalTracks}
                    </p>
                    <p className="text-xs text-muted-foreground">Pistes totales</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-teal-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Layers className="size-7 text-teal-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {stats.totalCategories}
                    </p>
                    <p className="text-xs text-muted-foreground">Catégories</p>
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
