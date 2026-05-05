'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Building2,
  Bed,
  Bath,
  Clock,
  MapPin,
  Star,
  Search,
  Plus,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Wifi,
  Copy,
  Check,
  ArrowRightLeft,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'

// ─── Types ──────────────────────────────────────────────

interface Hotel {
  id: string
  name: string
  description: string | null
  starRating: number
  address: string
  distanceKm: number
  terminal: string
  imageUrl: string | null
  amenities: string
  rooms: HotelRoom[]
}

interface HotelRoom {
  id: string
  roomType: string
  name: string
  hourPrice: number
  minHours: number
  maxHours: number
  maxGuests: number
  availableRooms: number
  amenities?: string
}

interface DayUseBooking {
  id: string
  bookingRef: string
  passengerName: string
  phone: string
  hotelId: string
  bookingDate: string
  startTime: string
  durationHours: number
  totalPrice: number
  status: string
  hotel: { name: string; starRating: number } | null
}

interface Stats {
  totalHotels: number
  totalBookings: number
  activeBookings: number
  totalRevenue: number
  cancelledBookings?: number
  avgBookingPrice?: number
  statusBreakdown?: { status: string; count: number }[]
  popularHotels?: { hotelName: string; starRating: number; bookingCount: number; totalRevenue: number }[]
}

// ─── Booking Form State ─────────────────────────────────

interface BookingForm {
  hotelId: string
  roomId: string
  passengerName: string
  phone: string
  email: string
  flightNumber: string
  bookingDate: string
  startTime: string
  durationHours: number
  guests: number
}

const emptyForm: BookingForm = {
  hotelId: '',
  roomId: '',
  passengerName: '',
  phone: '',
  email: '',
  flightNumber: '',
  bookingDate: '',
  startTime: '',
  durationHours: 4,
  guests: 1,
}

// ─── Helpers ────────────────────────────────────────────

function getMinPrice(hotel: Hotel): number {
  if (!hotel.rooms || hotel.rooms.length === 0) return 0
  return Math.min(...hotel.rooms.map(r => r.hourPrice))
}

function formatPrice(price: number): string {
  return price.toLocaleString('fr-FR')
}

function roomTypeLabel(type: string): string {
  switch (type) {
    case 'standard': return 'Standard'
    case 'deluxe': return 'Deluxe'
    case 'suite': return 'Suite'
    case 'premium': return 'Premium'
    default: return type.charAt(0).toUpperCase() + type.slice(1)
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'confirmed': return 'Confirmée'
    case 'checked_in': return 'En cours'
    case 'completed': return 'Terminée'
    case 'cancelled': return 'Annulée'
    case 'pending': return 'En attente'
    default: return status
  }
}

// ─── Hotel Gallery Component ────────────────────────────

function HotelGallery({ hotel }: { hotel: Hotel }) {
  const [activeSlide, setActiveSlide] = useState(0)

  const slides = [
    { gradient: 'from-amber-600 via-orange-500 to-yellow-500', icon: Bed, label: 'Chambres confortables' },
    { gradient: 'from-sky-600 via-cyan-500 to-teal-400', icon: Bath, label: 'Salle de bain privée' },
    { gradient: 'from-violet-600 via-purple-500 to-fuchsia-400', icon: Wifi, label: 'Wi-Fi haut débit' },
  ]

  // Auto-advance
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % slides.length)
    }, 3500)
    return () => clearInterval(interval)
  }, [slides.length])

  const IconComp = slides[activeSlide].icon

  return (
    <div className="relative h-32 w-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSlide}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.4 }}
          className={`absolute inset-0 bg-gradient-to-br ${slides[activeSlide].gradient} flex items-center justify-center`}
        >
          <div className="flex flex-col items-center gap-1 text-white/90">
            <IconComp className="size-10 drop-shadow-lg" />
            <span className="text-xs font-medium drop-shadow">{slides[activeSlide].label}</span>
          </div>
          {/* Decorative circles */}
          <div className="absolute top-2 right-8 size-20 rounded-full bg-white/10 blur-xl" />
          <div className="absolute bottom-0 left-4 size-16 rounded-full bg-white/10 blur-lg" />
        </motion.div>
      </AnimatePresence>
      {/* Slide dots + nav */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <button
          className="flex size-5 items-center justify-center rounded-full bg-black/20 text-white/80 hover:bg-black/40 transition-colors"
          onClick={() => setActiveSlide(prev => (prev - 1 + slides.length) % slides.length)}
        >
          <ChevronLeft className="size-3" />
        </button>
        <div className="flex gap-1">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`size-1.5 rounded-full transition-all duration-300 ${
                i === activeSlide ? 'bg-white w-4' : 'bg-white/50'
              }`}
              onClick={() => setActiveSlide(i)}
            />
          ))}
        </div>
        <button
          className="flex size-5 items-center justify-center rounded-full bg-black/20 text-white/80 hover:bg-black/40 transition-colors"
          onClick={() => setActiveSlide(prev => (prev + 1) % slides.length)}
        >
          <ChevronRight className="size-3" />
        </button>
      </div>
      {/* Hotel name overlay top-left */}
      <div className="absolute top-2 left-3">
        <span className="text-[10px] font-medium text-white/80 bg-black/20 backdrop-blur-sm rounded px-1.5 py-0.5">
          {hotel.name}
        </span>
      </div>
    </div>
  )
}

// ─── Module Component ───────────────────────────────────

export function HotelsModule() {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [bookings, setBookings] = useState<DayUseBooking[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'hotels' | 'bookings' | 'stats'>('hotels')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedHotel, setExpandedHotel] = useState<string | null>(null)

  // Search filters
  const [filterDate, setFilterDate] = useState('')
  const [filterHours, setFilterHours] = useState('')
  const [filterGuests, setFilterGuests] = useState('')

  // Booking dialog state
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false)
  const [bookingForm, setBookingForm] = useState<BookingForm>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  // Confirmation dialog state
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false)
  const [confirmationData, setConfirmationData] = useState<{
    bookingRef: string
    hotelName: string
    roomName: string
    bookingDate: string
    startTime: string
    durationHours: number
    guests: number
    totalPrice: number
    passengerName: string
  } | null>(null)
  const [copiedRef, setCopiedRef] = useState(false)

  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<DayUseBooking | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  // ─── Data Loading ──────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      // Build search params with filters
      const params = new URLSearchParams({ airportCode: 'DSS' })
      if (filterDate) params.set('date', filterDate)
      if (filterHours) params.set('hours', filterHours)
      if (filterGuests) params.set('guests', filterGuests)

      const [hotelsRes, bookingsRes] = await Promise.all([
        apiClient.get<Hotel[]>(`/api/hotels?${params.toString()}`),
        apiClient.get<Stats & { bookings: DayUseBooking[] }>('/api/hotels/bookings?stats=true'),
      ])
      setHotels(hotelsRes.success ? hotelsRes.data : [])
      const bookingsData = bookingsRes.success ? bookingsRes.data : null
      setBookings(bookingsData?.bookings || [])
      setStats(bookingsData)
    } catch (error) {
      console.error('Failed to load hotels data:', error)
    } finally {
      setLoading(false)
    }
  }, [filterDate, filterHours, filterGuests])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ─── Hotel filtering ──────────────────────────────────

  const filteredHotels = hotels.filter(h =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ─── Booking form helpers ─────────────────────────────

  const selectedHotel = hotels.find(h => h.id === bookingForm.hotelId)
  const availableRooms = selectedHotel?.rooms || []
  const selectedRoom = availableRooms.find(r => r.id === bookingForm.roomId)

  const handleFormChange = (field: keyof BookingForm, value: string | number) => {
    setBookingForm(prev => {
      const next = { ...prev, [field]: value }
      // Reset roomId when hotel changes
      if (field === 'hotelId') {
        next.roomId = ''
      }
      return next
    })
  }

  const resetForm = () => {
    setBookingForm(emptyForm)
  }

  const handleSubmitBooking = async () => {
    // Validation
    if (!bookingForm.hotelId) {
      toast.error('Veuillez sélectionner un hôtel')
      return
    }
    if (!bookingForm.roomId) {
      toast.error('Veuillez sélectionner un type de chambre')
      return
    }
    if (!bookingForm.passengerName.trim()) {
      toast.error('Le nom du passager est requis')
      return
    }
    if (!bookingForm.phone.trim()) {
      toast.error('Le numéro de téléphone est requis')
      return
    }
    if (!bookingForm.bookingDate) {
      toast.error('La date de réservation est requise')
      return
    }
    if (!bookingForm.startTime) {
      toast.error('L\'heure de début est requise')
      return
    }

    setSubmitting(true)
    try {
      const res = await apiClient.post('/api/hotels', {
        hotelId: bookingForm.hotelId,
        roomId: bookingForm.roomId,
        passengerName: bookingForm.passengerName.trim(),
        phone: bookingForm.phone.trim(),
        email: bookingForm.email.trim() || undefined,
        flightNumber: bookingForm.flightNumber.trim() || undefined,
        bookingDate: bookingForm.bookingDate,
        startTime: bookingForm.startTime,
        durationHours: bookingForm.durationHours,
        guests: bookingForm.guests,
      })

      if (res.success) {
        const ref = (res.data as { bookingRef?: string })?.bookingRef || 'N/A'
        toast.success(`Réservation créée — Réf: ${ref}`)
        setBookingDialogOpen(false)
        // Show confirmation dialog
        setConfirmationData({
          bookingRef: ref,
          hotelName: selectedHotel?.name || '',
          roomName: selectedRoom?.name || '',
          bookingDate: bookingForm.bookingDate,
          startTime: bookingForm.startTime,
          durationHours: bookingForm.durationHours,
          guests: bookingForm.guests,
          totalPrice: selectedRoom ? selectedRoom.hourPrice * bookingForm.durationHours : 0,
          passengerName: bookingForm.passengerName.trim(),
        })
        setConfirmationDialogOpen(true)
        setCopiedRef(false)
        resetForm()
        loadData()
      } else {
        toast.error(res.error || 'Erreur lors de la création de la réservation')
      }
    } catch {
      toast.error('Erreur réseau — impossible de créer la réservation')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Cancel booking ───────────────────────────────────

  const openCancelDialog = (booking: DayUseBooking) => {
    setCancelTarget(booking)
    setCancelReason('')
    setCancelDialogOpen(true)
  }

  const handleCancelBooking = async () => {
    if (!cancelTarget) return
    if (!cancelReason.trim()) {
      toast.error('Veuillez indiquer une raison d\'annulation')
      return
    }

    setCancelling(true)
    try {
      const res = await fetch(`/api/hotels/bookings/${cancelTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success(`Réservation ${cancelTarget.bookingRef} annulée`)
        setCancelDialogOpen(false)
        setCancelTarget(null)
        loadData()
      } else {
        toast.error(data.error || 'Erreur lors de l\'annulation')
      }
    } finally {
      setCancelling(false)
    }
  }

  // ─── Status colors ────────────────────────────────────

  const statusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'checked_in': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    }
  }

  const canCancel = (status: string) => {
    return status === 'confirmed' || status === 'pending' || status === 'checked_in'
  }

  // ─── Today's date for default ─────────────────────────
  const today = new Date().toISOString().split('T')[0]

  // ─── Render ───────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🏨 Marketplace Hôtels Day-Use</h1>
          <p className="text-sm text-muted-foreground">
            Réservation de chambres pour escales — à proximité de l&apos;aéroport
          </p>
        </div>
        <Button
          onClick={() => { resetForm(); setBookingDialogOpen(true) }}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Plus className="mr-2 size-4" />
          Nouvelle Réservation
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Building2 className="size-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalHotels}</p>
                  <p className="text-xs text-muted-foreground">Hôtels Partenaires</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="size-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalBookings}</p>
                  <p className="text-xs text-muted-foreground">Réservations Totales</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="size-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.activeBookings}</p>
                  <p className="text-xs text-muted-foreground">En Cours</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-teal-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-teal-500">FCFA</span>
                <div>
                  <p className="text-2xl font-bold">{formatPrice(stats.totalRevenue || 0)}</p>
                  <p className="text-xs text-muted-foreground">Chiffre d&apos;Affaires</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {(['hotels', 'bookings', 'stats'] as const).map(tab => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? 'bg-orange-500 hover:bg-orange-600' : ''}
          >
            {tab === 'hotels' ? '🏨 Hôtels' : tab === 'bookings' ? '📋 Réservations' : '📊 Statistiques'}
          </Button>
        ))}
      </div>

      {/* Hotels Tab */}
      {activeTab === 'hotels' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un hôtel..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  min={today}
                  className="w-full sm:w-40"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Durée (h)</Label>
                <Select value={filterHours} onValueChange={setFilterHours}>
                  <SelectTrigger className="w-full sm:w-28">
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3h</SelectItem>
                    <SelectItem value="4">4h</SelectItem>
                    <SelectItem value="5">5h</SelectItem>
                    <SelectItem value="6">6h</SelectItem>
                    <SelectItem value="8">8h</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Voyageurs</Label>
                <Select value={filterGuests} onValueChange={setFilterGuests}>
                  <SelectTrigger className="w-full sm:w-28">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(filterDate || filterHours || filterGuests) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-auto"
                  onClick={() => { setFilterDate(''); setFilterHours(''); setFilterGuests('') }}
                  title="Réinitialiser les filtres"
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Hotels Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-orange-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredHotels.map(hotel => {
                const isExpanded = expandedHotel === hotel.id
                const minPrice = getMinPrice(hotel)
                const amenities = JSON.parse(hotel.amenities || '[]') as string[]

                // Availability indicators per room
                const totalAvailable = (hotel.rooms || []).reduce((s, r) => s + r.availableRooms, 0)
                const hasFew = (hotel.rooms || []).some(r => r.availableRooms > 0 && r.availableRooms <= 2)
                const allSoldOut = (hotel.rooms || []).length > 0 && totalAvailable === 0

                return (
                  <Card key={hotel.id} className="overflow-hidden">
                    {/* ── Mini Image Gallery ── */}
                    <div className="relative h-32 w-full overflow-hidden">
                      <HotelGallery hotel={hotel} />
                      {/* Star Rating Overlay */}
                      <div className="absolute bottom-2 left-3 flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`size-4 ${i < hotel.starRating ? 'fill-amber-400 text-amber-400 drop-shadow' : 'fill-white/30 text-white/30'}`}
                          />
                        ))}
                      </div>
                      {/* Availability Indicator */}
                      <div className="absolute top-2 right-2">
                        <Badge
                          className={`text-[10px] border backdrop-blur-sm ${
                            allSoldOut
                              ? 'bg-red-500/80 text-white border-red-400/50'
                              : hasFew
                                ? 'bg-yellow-500/80 text-white border-yellow-400/50'
                                : 'bg-green-500/80 text-white border-green-400/50'
                          }`}
                        >
                          <span className={`inline-block size-1.5 rounded-full mr-1 ${
                            allSoldOut ? 'bg-red-200' : hasFew ? 'bg-yellow-200' : 'bg-green-200'
                          }`} />
                          {allSoldOut ? 'Complet' : hasFew ? 'Peu de places' : 'Disponible'}
                        </Badge>
                      </div>
                    </div>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{hotel.name}</CardTitle>
                          <div className="flex items-center gap-1 mt-1">
                            {Array.from({ length: hotel.starRating }).map((_, i) => (
                              <Star key={i} className="size-3 fill-yellow-400 text-yellow-400" />
                            ))}
                            <span className="text-xs text-muted-foreground ml-1">{hotel.starRating}/5</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="mr-1 size-3" /> {hotel.distanceKm} km
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-xs text-muted-foreground">{hotel.address}</p>
                      <div className="flex flex-wrap gap-1">
                        {amenities.slice(0, 4).map((a: string) => (
                          <Badge key={a} variant="secondary" className="text-[10px]">
                            {a}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs">
                        À partir de{' '}
                        <span className="font-bold text-orange-600">
                          {minPrice > 0 ? `${formatPrice(minPrice)} FCFA` : '—'}
                        </span>
                        /heure
                      </p>

                      {/* Expand/Collapse Rooms Button */}
                      {hotel.rooms && hotel.rooms.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20 mt-1"
                          onClick={() => setExpandedHotel(isExpanded ? null : hotel.id)}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="mr-1 size-3" />
                              Masquer les chambres
                            </>
                          ) : (
                            <>
                              <ChevronDown className="mr-1 size-3" />
                              Voir {hotel.rooms.length} chambre{hotel.rooms.length > 1 ? 's' : ''} disponible{hotel.rooms.length > 1 ? 's' : ''}
                            </>
                          )}
                        </Button>
                      )}

                      {/* Expanded Rooms */}
                      {isExpanded && hotel.rooms && hotel.rooms.length > 0 && (
                        <div className="mt-2 space-y-2 rounded-md border bg-muted/30 p-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Chambres disponibles
                          </p>
                          {hotel.rooms.map(room => {
                            const roomAmenities = JSON.parse((room as HotelRoom & { amenities?: string }).amenities || '[]') as string[]
                            return (
                              <div
                                key={room.id}
                                className="rounded-md border bg-background p-3 space-y-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Bed className="size-3.5 text-muted-foreground" />
                                    <span className="text-sm font-medium">{room.name}</span>
                                  </div>
                                  <Badge variant="outline" className="text-[10px]">
                                    {roomTypeLabel(room.roomType)}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="size-3" />
                                    {room.minHours}h – {room.maxHours}h
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Users className="size-3" />
                                    Max {room.maxGuests}
                                  </span>
                                  <span>
                                    <span className="font-semibold text-orange-600">
                                      {formatPrice(room.hourPrice)} FCFA
                                    </span>
                                    /h
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <span className={`inline-block size-2 rounded-full ${
                                      room.availableRooms === 0 ? 'bg-red-500' : room.availableRooms <= 2 ? 'bg-yellow-500' : 'bg-green-500'
                                    }`} />
                                    <span className={`${
                                      room.availableRooms === 0 ? 'text-red-600' : room.availableRooms <= 2 ? 'text-yellow-600' : 'text-green-600'
                                    }`}>{room.availableRooms === 0 ? 'Complet' : `${room.availableRooms} dispo${room.availableRooms > 1 ? 's' : ''}`}</span>
                                  </span>
                                </div>
                                {roomAmenities.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pt-0.5">
                                    {roomAmenities.slice(0, 5).map((a: string) => (
                                      <span key={a} className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                                        {a}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                          <Button
                            size="sm"
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white mt-1"
                            onClick={() => {
                              setBookingForm(prev => ({
                                ...prev,
                                hotelId: hotel.id,
                                roomId: hotel.rooms?.[0]?.id || '',
                                bookingDate: filterDate || today,
                              }))
                              setBookingDialogOpen(true)
                            }}
                          >
                            <Plus className="mr-1 size-3" />
                            Réserver dans cet hôtel
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
              {!loading && filteredHotels.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  Aucun hôtel trouvé
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-3 text-left">Réf</th>
                    <th className="p-3 text-left">Passager</th>
                    <th className="p-3 text-left">Téléphone</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-right">Montant</th>
                    <th className="p-3 text-center">Statut</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id} className="border-t">
                      <td className="p-3 font-mono text-xs">{b.bookingRef}</td>
                      <td className="p-3">
                        <div>
                          <span className="font-medium">{b.passengerName}</span>
                          {b.hotel && (
                            <p className="text-xs text-muted-foreground">{b.hotel.name}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-3">{b.phone}</td>
                      <td className="p-3">
                        <div>
                          <span>{b.bookingDate}</span>
                          <p className="text-xs text-muted-foreground">
                            {b.startTime} · {b.durationHours}h
                          </p>
                        </div>
                      </td>
                      <td className="p-3 text-right font-medium">{formatPrice(b.totalPrice)} FCFA</td>
                      <td className="p-3 text-center">
                        <Badge className={statusColor(b.status)} variant="secondary">
                          {statusLabel(b.status)}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        {canCancel(b.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 h-7 px-2 text-xs"
                            onClick={() => openCancelDialog(b)}
                          >
                            Annuler
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">
                        Aucune réservation
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm">Répartition par Statut</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {stats.statusBreakdown && stats.statusBreakdown.length > 0 ? (
                  stats.statusBreakdown.map(s => (
                    <div key={s.status} className="flex justify-between">
                      <span>{statusLabel(s.status)}</span>
                      <span className="font-bold">{s.count}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex justify-between"><span>Confirmées</span><span className="font-bold">{stats.activeBookings}</span></div>
                    <div className="flex justify-between"><span>Annulées</span><span className="font-bold">{stats.cancelledBookings || 0}</span></div>
                    <div className="flex justify-between"><span>Terminées</span><span className="font-bold">{stats.totalBookings - stats.activeBookings - (stats.cancelledBookings || 0)}</span></div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Performance</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Revenu Moyen</span><span className="font-bold">
                  {stats.totalBookings > 0 ? formatPrice(Math.round((stats.totalRevenue || 0) / stats.totalBookings)) : '0'} FCFA
                </span></div>
                <div className="flex justify-between"><span>Revenu Total</span><span className="font-bold text-teal-600">{formatPrice(stats.totalRevenue || 0)} FCFA</span></div>
                {stats.avgBookingPrice !== undefined && stats.avgBookingPrice > 0 && (
                  <div className="flex justify-between"><span>Prix Moyen (payées)</span><span className="font-bold">{formatPrice(Math.round(stats.avgBookingPrice))} FCFA</span></div>
                )}
              </div>
            </CardContent>
          </Card>
          {/* Popular Hotels */}
          {stats.popularHotels && stats.popularHotels.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-sm">Hôtels Populaires</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Hôtel</th>
                        <th className="p-2 text-center">Réservations</th>
                        <th className="p-2 text-right">Revenu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.popularHotels.map((h, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <span>{h.hotelName}</span>
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: h.starRating }).map((_, j) => (
                                  <Star key={j} className="size-2.5 fill-yellow-400 text-yellow-400" />
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="p-2 text-center font-medium">{h.bookingCount}</td>
                          <td className="p-2 text-right font-medium">{formatPrice(h.totalRevenue)} FCFA</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══ Booking Creation Dialog ═══ */}
      <Dialog open={bookingDialogOpen} onOpenChange={open => {
        setBookingDialogOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle Réservation Day-Use</DialogTitle>
            <DialogDescription>
              Remplissez les informations pour créer une réservation d&apos;hôtel.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Hotel selector */}
            <div className="space-y-1.5">
              <Label htmlFor="hotel-select">Hôtel *</Label>
              <Select
                value={bookingForm.hotelId}
                onValueChange={v => handleFormChange('hotelId', v)}
              >
                <SelectTrigger id="hotel-select">
                  <SelectValue placeholder="Sélectionner un hôtel" />
                </SelectTrigger>
                <SelectContent>
                  {hotels.map(h => (
                    <SelectItem key={h.id} value={h.id}>
                      <div className="flex items-center gap-2">
                        <span>{h.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({h.rooms?.length || 0} chambres)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Room type selector */}
            <div className="space-y-1.5">
              <Label htmlFor="room-select">Type de chambre *</Label>
              <Select
                value={bookingForm.roomId}
                onValueChange={v => handleFormChange('roomId', v)}
                disabled={!selectedHotel || availableRooms.length === 0}
              >
                <SelectTrigger id="room-select">
                  <SelectValue placeholder={
                    !selectedHotel
                      ? 'Sélectionnez d\'abord un hôtel'
                      : availableRooms.length === 0
                        ? 'Aucune chambre disponible'
                        : 'Sélectionner une chambre'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableRooms.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      <div className="flex items-center justify-between gap-4">
                        <span>{r.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatPrice(r.hourPrice)} FCFA/h · {r.minHours}h–{r.maxHours}h
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Passenger Name */}
            <div className="space-y-1.5">
              <Label htmlFor="passenger-name">Nom du passager *</Label>
              <Input
                id="passenger-name"
                placeholder="ex: Amadou Diallo"
                value={bookingForm.passengerName}
                onChange={e => handleFormChange('passengerName', e.target.value)}
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">Téléphone *</Label>
              <Input
                id="phone"
                placeholder="ex: +221 77 123 45 67"
                value={bookingForm.phone}
                onChange={e => handleFormChange('phone', e.target.value)}
              />
            </div>

            {/* Email (optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="email">
                Email <span className="text-muted-foreground text-xs">(optionnel)</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="ex: amadou@email.com"
                value={bookingForm.email}
                onChange={e => handleFormChange('email', e.target.value)}
              />
            </div>

            {/* Flight Number (optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="flight">
                N° de vol <span className="text-muted-foreground text-xs">(optionnel)</span>
              </Label>
              <Input
                id="flight"
                placeholder="ex: AF722"
                value={bookingForm.flightNumber}
                onChange={e => handleFormChange('flightNumber', e.target.value)}
              />
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="booking-date">Date *</Label>
                <Input
                  id="booking-date"
                  type="date"
                  value={bookingForm.bookingDate}
                  min={today}
                  onChange={e => handleFormChange('bookingDate', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="start-time">Heure de début *</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={bookingForm.startTime}
                  onChange={e => handleFormChange('startTime', e.target.value)}
                />
              </div>
            </div>

            {/* Duration + Guests */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="duration">Durée (heures) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min={3}
                  max={8}
                  value={bookingForm.durationHours}
                  onChange={e => handleFormChange('durationHours', Math.max(3, Math.min(8, parseInt(e.target.value) || 3)))}
                />
                <p className="text-[10px] text-muted-foreground">Min 3h, max 8h</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="guests">Nombre de voyageurs *</Label>
                <Input
                  id="guests"
                  type="number"
                  min={1}
                  max={10}
                  value={bookingForm.guests}
                  onChange={e => handleFormChange('guests', Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            </div>

            {/* Estimated price */}
            {selectedRoom && (
              <div className="rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 p-3">
                <p className="text-xs text-muted-foreground">Prix estimé</p>
                <p className="text-lg font-bold text-orange-600">
                  {formatPrice(selectedRoom.hourPrice * bookingForm.durationHours)} FCFA
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedRoom.name} × {bookingForm.durationHours}h
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setBookingDialogOpen(false); resetForm() }}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmitBooking}
              disabled={submitting}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {submitting ? 'Création...' : 'Confirmer la réservation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Booking Confirmation Dialog ═══ */}
      <Dialog open={confirmationDialogOpen} onOpenChange={setConfirmationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Check className="size-5 text-green-600" />
              </div>
              Réservation Confirmée
            </DialogTitle>
            <DialogDescription>
              Votre réservation day-use a été enregistrée avec succès.
            </DialogDescription>
          </DialogHeader>
          {confirmationData && (
            <div className="space-y-4">
              {/* Booking Reference */}
              <div className="rounded-lg border bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800 p-3">
                <p className="text-xs text-muted-foreground mb-1">Référence de réservation</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-mono font-bold tracking-wider text-orange-600">
                    {confirmationData.bookingRef}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-orange-500"
                    onClick={() => {
                      navigator.clipboard.writeText(confirmationData.bookingRef)
                      setCopiedRef(true)
                      toast.success('Référence copiée dans le presse-papier')
                      setTimeout(() => setCopiedRef(false), 2000)
                    }}
                  >
                    {copiedRef ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>

              {/* Details */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-muted-foreground" />
                  <span className="font-semibold">{confirmationData.hotelName}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Chambre :</span>
                    <p className="font-medium">{confirmationData.roomName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Passager :</span>
                    <p className="font-medium">{confirmationData.passengerName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date :</span>
                    <p className="font-medium">{confirmationData.bookingDate}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Heure :</span>
                    <p className="font-medium">{confirmationData.startTime}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Durée :</span>
                    <p className="font-medium">{confirmationData.durationHours}h</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Voyageurs :</span>
                    <p className="font-medium">{confirmationData.guests}</p>
                  </div>
                </div>

                {/* Price Summary */}
                <div className="pt-2 border-t space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Prix total</span>
                    <span className="font-bold text-orange-600">{formatPrice(confirmationData.totalPrice)} FCFA</span>
                  </div>
                </div>
              </div>

              {/* Check-in / Check-out Reminders */}
              <div className="flex gap-3">
                <div className="flex-1 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-3 text-center">
                  <ArrowRightLeft className="size-5 text-green-600 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400">Check-in</p>
                  <p className="text-sm font-bold">{confirmationData.startTime}</p>
                  <p className="text-[10px] text-muted-foreground">{confirmationData.bookingDate}</p>
                </div>
                <div className="flex-1 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-3 text-center">
                  <ArrowRightLeft className="size-5 text-red-600 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400">Check-out</p>
                  <p className="text-sm font-bold">{confirmationData.startTime}</p>
                  <p className="text-[10px] text-muted-foreground">Apres {confirmationData.durationHours}h</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() => toast.info('Fonctionnalité PDF à venir')}
                >
                  Télécharger le reçu
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs"
                  onClick={() => setConfirmationDialogOpen(false)}
                >
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ Cancel Booking Confirmation Dialog ═══ */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la réservation</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget && (
                <>
                  Vous êtes sur le point d&apos;annuler la réservation{' '}
                  <span className="font-mono font-semibold">{cancelTarget.bookingRef}</span>
                  {' '}pour{' '}
                  <span className="font-semibold">{cancelTarget.passengerName}</span>.
                  Cette action est irréversible.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2 space-y-1.5">
            <Label htmlFor="cancel-reason">Raison de l&apos;annulation *</Label>
            <Input
              id="cancel-reason"
              placeholder="ex: Vol annulé, changement de plan..."
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Retour</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.preventDefault()
                handleCancelBooking()
              }}
              disabled={cancelling || !cancelReason.trim()}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {cancelling && <Loader2 className="mr-2 size-4 animate-spin" />}
              {cancelling ? 'Annulation...' : 'Confirmer l\'annulation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
