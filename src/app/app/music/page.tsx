'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Play,
  Pause,
  Music,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Loader2,
  Search,
  X,
  Heart,
  ListMusic,
  Headphones,
  ChevronRight,
  Radio,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  imageUrl: string | null
  trackCount?: number
}

interface Track {
  id: string
  title: string
  artist: string | null
  youtubeId: string
  thumbnailUrl: string | null
  duration: string | null
  playCount: number
  MusicCategory?: { name: string; slug: string } | null
}

type RepeatMode = 'off' | 'all' | 'one'

// ─── Helpers ────────────────────────────────────────────

function getYouTubeEmbedUrl(videoId: string, autoplay: boolean = false): string {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    autoplay: autoplay ? '1' : '0',
  })
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`
}

function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

function parseDurationToSeconds(duration: string | null): number {
  if (!duration) return 210
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

// ─── Equalizer Animation ────────────────────────────────

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

// ─── Music Page Component ───────────────────────────────

export default function MusicPage() {
  // Data state
  const [categories, setCategories] = useState<Category[]>([])
  const [allTracks, setAllTracks] = useState<Track[]>([])
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMobileQueue, setShowMobileQueue] = useState(false)

  // Playback state
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null)
  const [queue, setQueue] = useState<string[]>([])
  const [shuffleOn, setShuffleOn] = useState(false)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off')
  const [volume, setVolume] = useState(80)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  // Favorites (localStorage)
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem('smartly_music_favorites')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  // Simulated playback timer
  const playbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const playingTrack = allTracks.find((t) => t.id === playingTrackId) || null
  const totalDuration = playingTrack ? parseDurationToSeconds(playingTrack.duration) : 210

  // ─── Persist favorites ────────────────────────────────

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('smartly_music_favorites', JSON.stringify(favorites))
    }
  }, [favorites])

  // ─── Simulated Playback Progress ─────────────────────

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
  }, [queue, playingTrackId, shuffleOn, repeatMode])

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
  }, [playingTrackId, totalDuration, handleTrackEnd])

  // ─── Data Loading ────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [catRes, tracksRes] = await Promise.all([
        fetch('/api/music/categories'),
        fetch('/api/music/tracks'),
      ])

      if (!catRes.ok || !tracksRes.ok) {
        if (catRes.status === 401 || tracksRes.status === 401) {
          setError('auth')
        } else {
          setError('Erreur lors du chargement des données musicales')
        }
        return
      }

      const catData = await catRes.json()
      const tracksData = await tracksRes.json()

      const cats = catData.data || []
      const tracks = tracksData.data || []

      setCategories(cats)
      setAllTracks(tracks)
      setFilteredTracks(tracks)

      // Initialize queue with all tracks
      setQueue(tracks.map((t: Track) => t.id))
    } catch (err) {
      console.error('Failed to load music data:', err)
      setError('Erreur de connexion. Vérifiez votre connexion internet.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ─── Category & Search Filtering ─────────────────────

  useEffect(() => {
    let tracks = allTracks
    if (selectedCategory) {
      tracks = tracks.filter((t) => {
        const catId = t.MusicCategory ? categories.find(c => c.name === t.MusicCategory!.name)?.id : null
        return catId === selectedCategory
      })
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      tracks = tracks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.artist && t.artist.toLowerCase().includes(q)) ||
          (t.MusicCategory && t.MusicCategory.name.toLowerCase().includes(q))
      )
    }
    setFilteredTracks(tracks)
  }, [selectedCategory, searchQuery, allTracks, categories])

  // ─── Playback Controls ──────────────────────────────

  const handlePlayTrack = async (track: Track) => {
    if (playingTrackId === track.id) {
      setPlayingTrackId(null)
      return
    }
    setPlayingTrackId(track.id)
    setProgress(0)
    setCurrentTime(0)

    // Add to queue if not already there
    setQueue((prev) => {
      if (prev.includes(track.id)) return prev
      return [...prev, track.id]
    })

    // Record play count
    try {
      await fetch(`/api/music/tracks/${track.id}`, { method: 'POST' })
    } catch {
      // Silent fail
    }
  }

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

  const toggleFavorite = (trackId: string) => {
    setFavorites((prev) =>
      prev.includes(trackId) ? prev.filter((id) => id !== trackId) : [...prev, trackId]
    )
  }

  const playAllCategory = (catId: string) => {
    const catTracks = allTracks.filter((t) => {
      const trackCatId = t.MusicCategory ? categories.find(c => c.name === t.MusicCategory!.name)?.id : null
      return trackCatId === catId
    })
    if (catTracks.length > 0) {
      setQueue(catTracks.map((t) => t.id))
      setPlayingTrackId(catTracks[0].id)
      setProgress(0)
      setCurrentTime(0)
    }
  }

  // ─── Loading State ───────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black flex flex-col">
        {/* Header skeleton */}
        <header className="border-b border-white/10 px-4 sm:px-8 py-4">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 animate-pulse" />
            <div className="h-6 w-48 rounded bg-white/10 animate-pulse" />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="size-10 animate-spin text-orange-500" />
            <p className="text-white/60 text-sm">Chargement de la musique...</p>
          </div>
        </div>
      </div>
    )
  }

  // ─── Error State ─────────────────────────────────────

  if (error === 'auth') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black flex flex-col">
        <header className="border-b border-white/10 px-4 sm:px-8 py-4">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
              <Music className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Smartly Zen Music</h1>
              <p className="text-white/50 text-xs">Aéroport International Blaise Diagne</p>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-4">
          <Card className="bg-white/5 border-white/10 max-w-md w-full">
            <CardContent className="p-8 text-center">
              <Headphones className="size-12 text-orange-500 mx-auto mb-4" />
              <h2 className="text-white text-xl font-bold mb-2">Connexion requise</h2>
              <p className="text-white/60 text-sm mb-6">
                Connectez-vous pour accéder à la musique de l&apos;aéroport.
              </p>
              <a
                href="/auth/login"
                className="inline-flex items-center justify-center px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
              >
                Se connecter
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black flex flex-col">
        <header className="border-b border-white/10 px-4 sm:px-8 py-4">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
              <Music className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Smartly Zen Music</h1>
              <p className="text-white/50 text-xs">Aéroport International Blaise Diagne</p>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-4">
          <Card className="bg-white/5 border-white/10 max-w-md w-full">
            <CardContent className="p-8 text-center">
              <Radio className="size-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-white text-xl font-bold mb-2">Erreur de chargement</h2>
              <p className="text-white/60 text-sm mb-6">{error}</p>
              <Button onClick={loadData} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Réessayer
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ─── Main Render ─────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white flex flex-col">
      {/* ─── Header ─────────────────────────────────────── */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Music className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg tracking-tight">Smartly Zen Music</h1>
              <p className="text-white/50 text-xs hidden sm:block">Aéroport International Blaise Diagne — Dakar</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10 lg:hidden"
              onClick={() => setShowMobileQueue(!showMobileQueue)}
            >
              <ListMusic className="size-4 mr-1.5" />
              File
              {queue.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                  {queue.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Main Content ───────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 pb-40 lg:pb-8">
        <div className="flex gap-6">
          {/* ─── Left Column: Categories + Tracks ─────────── */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Categories */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Radio className="size-5 text-orange-500" />
                  Catégories
                </h2>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                    !selectedCategory
                      ? 'bg-orange-500 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  Tout
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(selectedCategory === cat.id ? null : cat.id)
                      playAllCategory(cat.id)
                    }}
                    className={`relative overflow-hidden rounded-xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                      selectedCategory === cat.id
                        ? 'ring-2 ring-orange-500 shadow-lg shadow-orange-500/20'
                        : 'ring-1 ring-white/10 hover:ring-white/20'
                    }`}
                    style={{
                      backgroundColor: selectedCategory === cat.id
                        ? `${cat.color || '#F97316'}22`
                        : `${cat.color || '#F97316'}11`,
                    }}
                  >
                    <div className="text-2xl mb-2">{cat.icon || '🎵'}</div>
                    <p className="text-sm font-semibold text-white truncate">{cat.name}</p>
                    <p className="text-[10px] text-white/50 mt-1">
                      {cat.trackCount || 0} piste{cat.trackCount !== 1 ? 's' : ''}
                    </p>
                    {selectedCategory === cat.id && (
                      <div
                        className="absolute inset-0 pointer-events-none opacity-10"
                        style={{
                          background: `linear-gradient(135deg, ${cat.color || '#F97316'}, transparent)`,
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
              <input
                type="text"
                placeholder="Rechercher un titre, artiste..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Tracks Grid */}
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Headphones className="size-5 text-orange-500" />
                {selectedCategory
                  ? categories.find(c => c.id === selectedCategory)?.name || 'Pistes'
                  : 'Toutes les Pistes'}
                <span className="text-sm font-normal text-white/40">
                  ({filteredTracks.length})
                </span>
              </h2>

              {filteredTracks.length === 0 ? (
                <div className="text-center py-12">
                  <Music className="size-10 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">Aucune piste trouvée</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredTracks.map((track) => {
                    const isPlaying = playingTrackId === track.id
                    const isFavorite = favorites.includes(track.id)

                    return (
                      <div key={track.id} className="group">
                        <div className="relative aspect-video overflow-hidden rounded-xl bg-white/5">
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
                            <img
                              src={track.thumbnailUrl || getYouTubeThumbnail(track.youtubeId)}
                              alt={track.title}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                          )}

                          {/* Play Overlay */}
                          {!isPlaying && (
                            <button
                              onClick={() => handlePlayTrack(track)}
                              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <div className="flex size-12 items-center justify-center rounded-full bg-orange-500 shadow-lg transition-transform group-hover:scale-110">
                                <Play className="size-5 text-white ml-0.5" />
                              </div>
                            </button>
                          )}

                          {/* Now Playing Indicator */}
                          {isPlaying && (
                            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
                              <EqualizerBars />
                              <span className="text-[10px] text-white font-medium">En lecture</span>
                            </div>
                          )}

                          {/* Favorite Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFavorite(track.id)
                            }}
                            className="absolute top-2 right-2 flex items-center justify-center size-8 rounded-full bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                          >
                            <Heart
                              className={`size-4 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-white'}`}
                            />
                          </button>
                        </div>

                        {/* Track Info */}
                        <div className="mt-2.5 px-1">
                          <p className={`text-sm font-semibold truncate ${isPlaying ? 'text-orange-400' : 'text-white'}`}>
                            {track.title}
                          </p>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-xs text-white/50 truncate">
                              {track.artist || 'Artiste inconnu'}
                            </p>
                            <span className="text-xs text-white/30 font-mono ml-2 shrink-0">
                              {track.duration || '3:30'}
                            </span>
                          </div>
                          {track.MusicCategory && (
                            <div className="flex items-center gap-1 mt-1">
                              <ChevronRight className="size-3 text-white/20" />
                              <span className="text-[10px] text-white/30">{track.MusicCategory.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          {/* ─── Right Column: Queue (desktop) ───────────── */}
          <aside className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-24">
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <ListMusic className="size-4 text-orange-500" />
                    File d&apos;attente
                    {queue.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                        {queue.length}
                      </Badge>
                    )}
                  </h3>
                </div>
                <div className="max-h-[60vh] overflow-y-auto divide-y divide-white/5">
                  {queue.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <ListMusic className="size-6 text-white/20 mx-auto mb-2" />
                      <p className="text-xs text-white/30">File vide</p>
                    </div>
                  ) : (
                    queue.map((trackId, idx) => {
                      const track = allTracks.find((t) => t.id === trackId)
                      if (!track) return null
                      const isCurrent = playingTrackId === track.id
                      return (
                        <div
                          key={track.id}
                          className={`flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/5 ${
                            isCurrent ? 'bg-orange-500/10' : ''
                          }`}
                        >
                          <div className="w-5 shrink-0 flex justify-center">
                            {isCurrent ? (
                              <EqualizerBars />
                            ) : (
                              <span className="text-[10px] text-white/30 font-mono">{idx + 1}</span>
                            )}
                          </div>
                          <img
                            src={track.thumbnailUrl || getYouTubeThumbnail(track.youtubeId)}
                            alt=""
                            className="size-9 rounded-md object-cover shrink-0"
                            loading="lazy"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate ${isCurrent ? 'text-orange-400' : 'text-white/80'}`}>
                              {track.title}
                            </p>
                            <p className="text-[10px] text-white/40 truncate">
                              {track.artist || '—'}
                            </p>
                          </div>
                          <span className="text-[10px] text-white/30 font-mono shrink-0">
                            {track.duration || '3:30'}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* ─── Mobile Queue Overlay ───────────────────────── */}
      {showMobileQueue && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileQueue(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-white/10 rounded-t-2xl max-h-[70vh] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <ListMusic className="size-4 text-orange-500" />
                File d&apos;attente ({queue.length})
              </h3>
              <button onClick={() => setShowMobileQueue(false)} className="text-white/50 hover:text-white">
                <X className="size-5" />
              </button>
            </div>
            <div className="overflow-y-auto divide-y divide-white/5 flex-1">
              {queue.map((trackId, idx) => {
                const track = allTracks.find((t) => t.id === trackId)
                if (!track) return null
                const isCurrent = playingTrackId === track.id
                return (
                  <button
                    key={track.id}
                    onClick={() => {
                      setPlayingTrackId(track.id)
                      setProgress(0)
                      setCurrentTime(0)
                      setShowMobileQueue(false)
                    }}
                    className={`flex items-center gap-3 px-4 py-3 w-full text-left transition-colors hover:bg-white/5 ${
                      isCurrent ? 'bg-orange-500/10' : ''
                    }`}
                  >
                    <div className="w-5 shrink-0 flex justify-center">
                      {isCurrent ? (
                        <EqualizerBars />
                      ) : (
                        <span className="text-[10px] text-white/30 font-mono">{idx + 1}</span>
                      )}
                    </div>
                    <img
                      src={track.thumbnailUrl || getYouTubeThumbnail(track.youtubeId)}
                      alt=""
                      className="size-10 rounded-md object-cover shrink-0"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isCurrent ? 'text-orange-400' : 'text-white'}`}>
                        {track.title}
                      </p>
                      <p className="text-xs text-white/40 truncate">{track.artist || '—'}</p>
                    </div>
                    <span className="text-xs text-white/30 font-mono shrink-0">
                      {track.duration || '3:30'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── Bottom Player Bar ──────────────────────────── */}
      {playingTrack && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-t border-white/10">
          {/* Progress bar (thin line at top of player) */}
          <div className="h-1 bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3">
            {/* Track Info + Main Controls */}
            <div className="flex items-center gap-4">
              {/* Track Info */}
              <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-none sm:w-72">
                <div className="relative size-12 rounded-lg overflow-hidden shrink-0 bg-white/10">
                  <img
                    src={playingTrack.thumbnailUrl || getYouTubeThumbnail(playingTrack.youtubeId)}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{playingTrack.title}</p>
                  <p className="text-xs text-white/50 truncate">{playingTrack.artist || 'Artiste inconnu'}</p>
                </div>
                <button
                  onClick={() => toggleFavorite(playingTrack.id)}
                  className="shrink-0 hidden sm:block"
                >
                  <Heart
                    className={`size-4 ${
                      favorites.includes(playingTrack.id) ? 'text-red-500 fill-red-500' : 'text-white/40'
                    }`}
                  />
                </button>
              </div>

              {/* Center Controls */}
              <div className="flex-1 flex flex-col items-center gap-2 max-w-xl mx-auto">
                <div className="flex items-center gap-2 sm:gap-4">
                  <button
                    onClick={() => setShuffleOn(!shuffleOn)}
                    className={`p-2 rounded-full transition-colors ${
                      shuffleOn ? 'text-orange-500' : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    <Shuffle className="size-4" />
                  </button>

                  <button
                    onClick={handlePrevious}
                    className="p-2 rounded-full text-white/70 hover:text-white transition-colors"
                  >
                    <SkipBack className="size-5" />
                  </button>

                  <button
                    onClick={() => {
                      if (playingTrackId) {
                        setPlayingTrackId(null)
                      } else if (playingTrack) {
                        setPlayingTrackId(playingTrack.id)
                      }
                    }}
                    className="flex items-center justify-center size-10 rounded-full bg-orange-500 hover:bg-orange-600 text-white transition-colors shadow-lg shadow-orange-500/30"
                  >
                    {playingTrackId ? (
                      <Pause className="size-5" />
                    ) : (
                      <Play className="size-5 ml-0.5" />
                    )}
                  </button>

                  <button
                    onClick={handleNext}
                    className="p-2 rounded-full text-white/70 hover:text-white transition-colors"
                  >
                    <SkipForward className="size-5" />
                  </button>

                  <button
                    onClick={() => {
                      if (repeatMode === 'off') setRepeatMode('all')
                      else if (repeatMode === 'all') setRepeatMode('one')
                      else setRepeatMode('off')
                    }}
                    className={`p-2 rounded-full transition-colors ${
                      repeatMode !== 'off' ? 'text-orange-500' : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    {repeatMode === 'one' ? <Repeat1 className="size-4" /> : <Repeat className="size-4" />}
                  </button>
                </div>

                {/* Seek + Time */}
                <div className="hidden sm:flex items-center gap-3 w-full">
                  <span className="text-[10px] text-white/40 font-mono w-8 text-right">
                    {formatSeconds(currentTime)}
                  </span>
                  <Slider
                    value={[progress]}
                    onValueChange={handleSeek}
                    max={100}
                    step={0.5}
                    className="flex-1 cursor-pointer [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-0 [&_[role=slider]]:bg-white [&>span:first-child]:h-1 [&>span:first-child]:bg-white/20"
                  />
                  <span className="text-[10px] text-white/40 font-mono w-8">
                    {playingTrack.duration || '3:30'}
                  </span>
                </div>
              </div>

              {/* Right: Volume */}
              <div className="hidden sm:flex items-center gap-2 w-36 shrink-0 justify-end">
                <button
                  onClick={() => setVolume(volume === 0 ? 80 : 0)}
                  className="p-2 rounded-full text-white/40 hover:text-white/70 transition-colors"
                >
                  {volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </button>
                <Slider
                  value={[volume]}
                  onValueChange={(v) => setVolume(v[0])}
                  max={100}
                  step={1}
                  className="w-20 cursor-pointer [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-0 [&_[role=slider]]:bg-white [&>span:first-child]:h-1 [&>span:first-child]:bg-white/20"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
