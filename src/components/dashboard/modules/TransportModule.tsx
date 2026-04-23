'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Car, Navigation, CheckCircle, Plus, Eye, Search, Pencil, Trash2, MapPin,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ── Types ───────────────────────────────────────────────────────────────────

interface TransportProvider {
  id: string
  name: string
  type: 'taxi' | 'vtc' | 'shuttle' | 'private'
  baseFare: number
  perKmRate: number
  minFare: number
  nightSurcharge?: number
  airportCode: string
  isActive?: boolean
  contacts?: string
}

interface TransportBooking {
  id: string
  ref: string
  passenger: string
  providerName?: string
  providerId?: string
  vehicleType: string
  pickup: string
  dropoff: string
  date: string
  time: string
  driver: string
  price: number
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
}

interface PriceBreakdown {
  baseFare: number
  distanceCost: number
  nightSurcharge: number
  total: number
  minFareApplied: boolean
}

interface ProviderForm {
  name: string
  type: string
  airportCode: string
  baseFare: number
  perKmRate: number
  minFare: number
  nightSurcharge: number
  contactPhone: string
  contactEmail: string
  whatsappNumber: string
}

interface BookingForm {
  providerId: string
  passengerName: string
  phone: string
  email: string
  pickupLocation: string
  dropoffLocation: string
  pickupDate: string
  pickupTime: string
  passengers: number
  distanceKm: number
}

// ── Constants ───────────────────────────────────────────────────────────────

const AIRPORT_OPTIONS = [
  { value: 'DSS', label: 'DSS — Dakar' },
  { value: 'ABJ', label: 'ABJ — Abidjan' },
  { value: 'BKO', label: 'BKO — Bamako' },
  { value: 'LOS', label: 'LOS — Lagos' },
  { value: 'ACC', label: 'ACC — Accra' },
]

const TYPE_OPTIONS = [
  { value: 'taxi', label: 'Taxi' },
  { value: 'vtc', label: 'VTC' },
  { value: 'shuttle', label: 'Navette' },
  { value: 'private', label: 'Véhicule Privé' },
]

const TYPE_EMOJIS: Record<string, string> = { taxi: '🚕', vtc: '🚕', shuttle: '🚌', private: '🚗' }

const DEFAULT_PROVIDER_FORM: ProviderForm = {
  name: '', type: 'taxi', airportCode: 'DSS', baseFare: 0, perKmRate: 0,
  minFare: 0, nightSurcharge: 0, contactPhone: '', contactEmail: '',
  whatsappNumber: '',
}

const DEFAULT_BOOKING_FORM: BookingForm = {
  providerId: '', passengerName: '', phone: '', email: '',
  pickupLocation: '', dropoffLocation: '', pickupDate: '',
  pickupTime: '', passengers: 1, distanceKm: 10,
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA'
}

// ── Badge Components ────────────────────────────────────────────────────────

function VehicleTypeBadge({ type }: { type: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    taxi: { cls: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100', label: '🚕 Taxi' },
    vtc: { cls: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100', label: '🚕 VTC' },
    shuttle: { cls: 'bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-100', label: '🚌 Navette' },
    private: { cls: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100', label: '🚗 Privé' },
  }
  const cfg = map[type] ?? { cls: '', label: type }
  return <Badge className={cfg.cls}>{cfg.label}</Badge>
}

function TransportStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    pending: { cls: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100', label: 'En attente' },
    confirmed: { cls: 'bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-100', label: 'Confirmée' },
    in_progress: { cls: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100', label: 'En cours' },
    completed: { cls: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100', label: 'Terminée' },
    cancelled: { cls: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100', label: 'Annulée' },
  }
  const cfg = map[status] ?? { cls: '', label: status }
  return <Badge className={cfg.cls}>{cfg.label}</Badge>
}

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return isActive
    ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Actif</Badge>
    : <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">Inactif</Badge>
}

// ── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ title, value, icon, colorClass, iconBgClass }: {
  title: string; value: number | string; icon: React.ReactNode; colorClass: string; iconBgClass: string
}) {
  return (
    <Card className={`border-l-4 ${colorClass.replace('text-', 'border-l-')} overflow-hidden`}>
      <CardContent className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBgClass}`}>{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="size-8 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <MapPin className="size-10 mb-3 opacity-40" />
      <p>{message}</p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

export function TransportModule() {
  // ── Data ──────────────────────────────────────────────────────────────────
  const [providers, setProviders] = useState<TransportProvider[]>([])
  const [bookings, setBookings] = useState<TransportBooking[]>([])
  const [loadingProviders, setLoadingProviders] = useState(true)
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [searchBookings, setSearchBookings] = useState('')

  // ── Provider CRUD ─────────────────────────────────────────────────────────
  const [providerDialogOpen, setProviderDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<TransportProvider | null>(null)
  const [providerForm, setProviderForm] = useState<ProviderForm>(DEFAULT_PROVIDER_FORM)
  const [providerSubmitting, setProviderSubmitting] = useState(false)

  // ── Provider delete ───────────────────────────────────────────────────────
  const [deleteProviderDialogOpen, setDeleteProviderDialogOpen] = useState(false)
  const [deletingProvider, setDeletingProvider] = useState<TransportProvider | null>(null)

  // ── Booking create ────────────────────────────────────────────────────────
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false)
  const [bookingForm, setBookingForm] = useState<BookingForm>(DEFAULT_BOOKING_FORM)
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)

  // ── View dialog ───────────────────────────────────────────────────────────
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<TransportBooking | null>(null)

  // ── Derived ───────────────────────────────────────────────────────────────

  const selectedProvider = useMemo(
    () => providers.find((p) => p.id === bookingForm.providerId) ?? null,
    [providers, bookingForm.providerId],
  )

  // ── Fetch providers ───────────────────────────────────────────────────────

  const fetchProviders = useCallback(async () => {
    setLoadingProviders(true)
    try {
      const res = await fetch('/api/transport/providers?airport=DSS')
      if (res.ok) {
        const json = await res.json()
        const items = json.data ?? json.items ?? json ?? []
        setProviders(Array.isArray(items) ? items : [])
      } else {
        setProviders([])
      }
    } catch {
      setProviders([])
    } finally {
      setLoadingProviders(false)
    }
  }, [])

  // ── Fetch bookings ────────────────────────────────────────────────────────

  const normalizeBooking = (raw: Record<string, unknown>): TransportBooking => ({
    id: raw.id as string,
    ref: (raw.bookingRef ?? raw.ref) as string,
    passenger: (raw.passengerName ?? raw.passenger) as string,
    providerName: raw.providerName as string | undefined,
    providerId: raw.providerId as string | undefined,
    vehicleType: (raw.vehicleType ?? raw.type ?? 'taxi') as string,
    pickup: (raw.pickupLocation ?? raw.pickup) as string,
    dropoff: (raw.dropoffLocation ?? raw.dropoff) as string,
    date: (raw.pickupDate ?? raw.date) as string,
    time: (raw.pickupTime ?? raw.time) as string,
    driver: (raw.driverName ?? raw.driver ?? '—') as string,
    price: (raw.totalPrice ?? raw.estimatedPrice ?? raw.price ?? 0) as number,
    status: (raw.status ?? 'pending') as TransportBooking['status'],
  })

  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true)
    try {
      const res = await fetch('/api/transport/bookings')
      if (res.ok) {
        const json = await res.json()
        const items = json.data ?? json.items ?? json ?? []
        if (Array.isArray(items) && items.length > 0) {
          setBookings(items.map(normalizeBooking))
          return
        }
      }
    } catch {
      // fall through
    }
    // Fallback to legacy
    try {
      const res = await fetch('/api/transport')
      if (res.ok) {
        const json = await res.json()
        const items = Array.isArray(json) ? json : (json.items ?? json.data ?? [])
        if (Array.isArray(items) && items.length > 0) {
          setBookings(items.map(normalizeBooking))
          return
        }
      }
    } catch {
      // fall through
    }
    setBookings([])
  }, [])

  useEffect(() => {
    fetchProviders()
    fetchBookings()
  }, [fetchProviders, fetchBookings])

  // ── Live price calculation via API ────────────────────────────────────────

  useEffect(() => {
    if (!bookingForm.providerId || !bookingForm.distanceKm) {
      setPriceBreakdown(null)
      return
    }
    const calc = async () => {
      setPriceLoading(true)
      try {
        const res = await fetch('/api/transport/calculate-price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId: bookingForm.providerId,
            distanceKm: bookingForm.distanceKm,
            passengers: bookingForm.passengers,
            pickupTime: bookingForm.pickupTime || undefined,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.data) {
            setPriceBreakdown({
              baseFare: data.data.baseFare ?? 0,
              distanceCost: data.data.distanceCost ?? 0,
              nightSurcharge: data.data.nightSurcharge ?? 0,
              total: data.data.totalPrice ?? data.data.total ?? 0,
              minFareApplied: data.data.minFareApplied ?? false,
            })
          } else {
            setPriceBreakdown(null)
          }
        } else {
          setPriceBreakdown(null)
        }
      } catch {
        setPriceBreakdown(null)
      } finally {
        setPriceLoading(false)
      }
    }
    const timer = setTimeout(calc, 500)
    return () => clearTimeout(timer)
  }, [bookingForm.providerId, bookingForm.distanceKm, bookingForm.passengers, bookingForm.pickupTime])

  // ── Provider CRUD handlers ────────────────────────────────────────────────

  const openCreateProvider = () => {
    setEditingProvider(null)
    setProviderForm(DEFAULT_PROVIDER_FORM)
    setProviderDialogOpen(true)
  }

  const openEditProvider = (provider: TransportProvider) => {
    setEditingProvider(provider)
    setProviderForm({
      name: provider.name,
      type: provider.type,
      airportCode: provider.airportCode,
      baseFare: provider.baseFare,
      perKmRate: provider.perKmRate,
      minFare: provider.minFare,
      nightSurcharge: (provider as Record<string, unknown>).nightSurcharge as number ?? 0,
      contactPhone: '',
      contactEmail: '',
      whatsappNumber: '',
    })
    setProviderDialogOpen(true)
  }

  const handleSaveProvider = async () => {
    if (!providerForm.name) {
      toast.error('Le nom du partenaire est requis')
      return
    }
    setProviderSubmitting(true)
    try {
      const contacts = JSON.stringify({
        phone: providerForm.contactPhone || undefined,
        email: providerForm.contactEmail || undefined,
        whatsapp: providerForm.whatsappNumber || undefined,
      })
      const payload = {
        airportCode: providerForm.airportCode,
        name: providerForm.name,
        type: providerForm.type,
        baseFare: providerForm.baseFare,
        perKmRate: providerForm.perKmRate,
        minFare: providerForm.minFare,
        nightSurcharge: providerForm.nightSurcharge || undefined,
        contacts,
      }
      const url = editingProvider ? `/api/transport/providers/${editingProvider.id}` : '/api/transport/providers'
      const method = editingProvider ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.ok) {
        toast.success(editingProvider ? 'Partenaire mis à jour' : 'Partenaire ajouté avec succès')
        setProviderDialogOpen(false)
        fetchProviders()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? 'Erreur lors de l\'opération')
      }
    } catch {
      toast.error('Erreur réseau.')
    } finally {
      setProviderSubmitting(false)
    }
  }

  const confirmDeleteProvider = (provider: TransportProvider) => {
    setDeletingProvider(provider)
    setDeleteProviderDialogOpen(true)
  }

  const handleDeleteProvider = async () => {
    if (!deletingProvider) return
    try {
      const res = await fetch(`/api/transport/providers/${deletingProvider.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Partenaire supprimé avec succès')
        fetchProviders()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? 'Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur réseau.')
    } finally {
      setDeleteProviderDialogOpen(false)
      setDeletingProvider(null)
    }
  }

  // ── Booking handler ───────────────────────────────────────────────────────

  const resetBookingForm = () => {
    setBookingForm(DEFAULT_BOOKING_FORM)
    setPriceBreakdown(null)
    setBookingDialogOpen(false)
    setBookingSubmitting(false)
  }

  const handleCreateBooking = async () => {
    if (!bookingForm.passengerName || !bookingForm.providerId || !bookingForm.pickupLocation || !bookingForm.dropoffLocation || !bookingForm.pickupDate || !bookingForm.pickupTime) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }
    setBookingSubmitting(true)
    try {
      const res = await fetch('/api/transport/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: bookingForm.providerId,
          passengerName: bookingForm.passengerName,
          phone: bookingForm.phone || undefined,
          email: bookingForm.email || undefined,
          pickupLocation: bookingForm.pickupLocation,
          dropoffLocation: bookingForm.dropoffLocation,
          pickupDate: bookingForm.pickupDate,
          pickupTime: bookingForm.pickupTime,
          passengers: bookingForm.passengers,
          distanceKm: bookingForm.distanceKm,
        }),
      })
      if (res.ok) {
        toast.success('Réservation de transport créée avec succès')
        resetBookingForm()
        fetchBookings()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? 'Erreur lors de la réservation')
      }
    } catch {
      toast.error('Erreur réseau.')
    } finally {
      setBookingSubmitting(false)
    }
  }

  // ── Filtered ──────────────────────────────────────────────────────────────

  const filteredBookings = bookings.filter((b) => {
    if (!searchBookings) return true
    const q = searchBookings.toLowerCase()
    return b.passenger.toLowerCase().includes(q) || b.ref.toLowerCase().includes(q) || b.pickup.toLowerCase().includes(q) || b.dropoff.toLowerCase().includes(q)
  })

  // ══════════════════════════════════════════════════════════════════════════
  // ── RENDER ────────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Gestion du Transport</h2>
        <p className="text-muted-foreground text-sm">Partenaires de transport et réservations de courses</p>
      </div>

      <Tabs defaultValue="partenaires" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="partenaires" className="gap-1.5">
            <Car className="h-4 w-4" />
            <span className="hidden sm:inline">Partenaires</span>
          </TabsTrigger>
          <TabsTrigger value="courses" className="gap-1.5">
            <Navigation className="h-4 w-4" />
            <span className="hidden sm:inline">Courses</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════ TAB 1: Partenaires ═══════════════════ */}
        <TabsContent value="partenaires" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Partenaires Transport ({providers.length})</CardTitle>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={openCreateProvider}>
                  <Plus className="size-4" />
                  <span className="hidden sm:inline ml-1">Ajouter un partenaire</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingProviders ? <Spinner /> : providers.length === 0 ? (
                <EmptyState message="Aucun partenaire trouvé. Ajoutez votre premier partenaire." />
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Tarif Base</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Prix/km</TableHead>
                        <TableHead className="text-right hidden md:table-cell">Min.</TableHead>
                        <TableHead className="hidden lg:table-cell">Majoration nuit</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {providers.map((prov) => (
                        <TableRow key={prov.id}>
                          <TableCell className="font-medium">{TYPE_EMOJIS[prov.type] ?? ''} {prov.name}</TableCell>
                          <TableCell><VehicleTypeBadge type={prov.type} /></TableCell>
                          <TableCell className="text-right text-sm">{formatPrice(prov.baseFare)}</TableCell>
                          <TableCell className="text-right text-sm hidden sm:table-cell">{formatPrice(prov.perKmRate)}</TableCell>
                          <TableCell className="text-right text-sm hidden md:table-cell">{formatPrice(prov.minFare)}</TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">{(prov as Record<string, unknown>).nightSurcharge ? `${(prov as Record<string, unknown>).nightSurcharge}%` : '—'}</TableCell>
                          <TableCell><ActiveBadge isActive={prov.isActive !== false} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="outline" size="sm" className="h-7 text-xs text-orange-500 border-orange-200 hover:bg-orange-50" onClick={() => openEditProvider(prov)}>
                                <Pencil className="size-3" />
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50" onClick={() => confirmDeleteProvider(prov)}>
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
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

        {/* ═══════════════════ TAB 2: Courses ═══════════════════ */}
        <TabsContent value="courses" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard title="Courses Total" value={bookings.length} icon={<Car className="size-6 text-orange-600 dark:text-orange-400" />} colorClass="text-orange-600 dark:text-orange-400" iconBgClass="bg-orange-100 dark:bg-orange-900/30" />
            <StatCard title="En Cours" value={bookings.filter((b) => b.status === 'in_progress' || b.status === 'confirmed').length} icon={<Navigation className="size-6 text-sky-600 dark:text-sky-400" />} colorClass="text-sky-600 dark:text-sky-400" iconBgClass="bg-sky-100 dark:bg-sky-900/30" />
            <StatCard title="Terminées" value={bookings.filter((b) => b.status === 'completed').length} icon={<CheckCircle className="size-6 text-emerald-600 dark:text-emerald-400" />} colorClass="text-emerald-600 dark:text-emerald-400" iconBgClass="bg-emerald-100 dark:bg-emerald-900/30" />
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Courses ({bookings.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Rechercher..." className="pl-9 h-9 text-sm" value={searchBookings} onChange={(e) => setSearchBookings(e.target.value)} />
                  </div>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => { setBookingForm(DEFAULT_BOOKING_FORM); setPriceBreakdown(null); setBookingDialogOpen(true) }}>
                    <Plus className="size-4" />
                    <span className="hidden sm:inline ml-1">Nouvelle Course</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingBookings ? <Spinner /> : filteredBookings.length === 0 ? (
                <EmptyState message="Aucune course trouvée." />
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Réf</TableHead>
                        <TableHead>Passager</TableHead>
                        <TableHead className="hidden sm:table-cell">Fournisseur</TableHead>
                        <TableHead className="hidden lg:table-cell">Trajet</TableHead>
                        <TableHead className="hidden md:table-cell">Date/Heure</TableHead>
                        <TableHead className="hidden lg:table-cell">Chauffeur</TableHead>
                        <TableHead className="text-right">Prix</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono text-xs">{b.ref}</TableCell>
                          <TableCell className="font-medium">{b.passenger}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">{b.providerName ?? '—'}</TableCell>
                          <TableCell className="hidden lg:table-cell text-xs max-w-[160px] truncate">{b.pickup} → {b.dropoff}</TableCell>
                          <TableCell className="hidden md:table-cell text-xs">{b.date} {b.time}</TableCell>
                          <TableCell className="hidden lg:table-cell text-xs">{b.driver}</TableCell>
                          <TableCell className="text-right text-sm">{formatPrice(b.price)}</TableCell>
                          <TableCell><TransportStatusBadge status={b.status} /></TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" className="h-7 text-xs text-orange-500 border-orange-200 hover:bg-orange-50" onClick={() => { setSelectedBooking(b); setViewOpen(true) }}>
                              <Eye className="size-3" />
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
      </Tabs>

      {/* ═══════════════════ PROVIDER CREATE/EDIT DIALOG ═══════════════════ */}
      <Dialog open={providerDialogOpen} onOpenChange={(open) => { if (!open) setProviderDialogOpen(false) }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProvider ? 'Modifier le Partenaire' : 'Ajouter un Partenaire'}</DialogTitle>
            <DialogDescription>{editingProvider ? 'Modifiez les informations du partenaire.' : 'Configurez un nouveau fournisseur de transport.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nom *</Label>
              <Input placeholder="Ex: Taxi Dakar Express" value={providerForm.name} onChange={(e) => setProviderForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type *</Label>
                <Select value={providerForm.type} onValueChange={(v) => setProviderForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPE_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Aéroport</Label>
                <Select value={providerForm.airportCode} onValueChange={(v) => setProviderForm((f) => ({ ...f, airportCode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AIRPORT_OPTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tarif de base (FCFA)</Label>
                <Input type="number" min={0} value={providerForm.baseFare} onChange={(e) => setProviderForm((f) => ({ ...f, baseFare: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="grid gap-2">
                <Label>Prix / km (FCFA)</Label>
                <Input type="number" min={0} value={providerForm.perKmRate} onChange={(e) => setProviderForm((f) => ({ ...f, perKmRate: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tarif minimum (FCFA)</Label>
                <Input type="number" min={0} value={providerForm.minFare} onChange={(e) => setProviderForm((f) => ({ ...f, minFare: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="grid gap-2">
                <Label>Majoration nuit (%)</Label>
                <Input type="number" min={0} value={providerForm.nightSurcharge} onChange={(e) => setProviderForm((f) => ({ ...f, nightSurcharge: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Téléphone</Label>
                <Input placeholder="+221 77 123 45 67" value={providerForm.contactPhone} onChange={(e) => setProviderForm((f) => ({ ...f, contactPhone: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" placeholder="contact@taxi.sn" value={providerForm.contactEmail} onChange={(e) => setProviderForm((f) => ({ ...f, contactEmail: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>WhatsApp</Label>
              <Input placeholder="+221 77 123 45 67" value={providerForm.whatsappNumber} onChange={(e) => setProviderForm((f) => ({ ...f, whatsappNumber: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProviderDialogOpen(false)}>Annuler</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSaveProvider} disabled={providerSubmitting}>
              {providerSubmitting ? 'Enregistrement...' : editingProvider ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ PROVIDER DELETE DIALOG ═══════════════════ */}
      <AlertDialog open={deleteProviderDialogOpen} onOpenChange={setDeleteProviderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le partenaire</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer &laquo; {deletingProvider?.name} &raquo; ? Des courses existantes pourraient empêcher la suppression.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteProvider}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════════ BOOKING CREATE DIALOG ═══════════════════ */}
      <Dialog open={bookingDialogOpen} onOpenChange={(open) => { if (!open) resetBookingForm() }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle Course</DialogTitle>
            <DialogDescription>Réservez un transport pour un passager.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Fournisseur *</Label>
              <Select value={bookingForm.providerId} onValueChange={(v) => setBookingForm((f) => ({ ...f, providerId: v }))}>
                <SelectTrigger><SelectValue placeholder={providers.length === 0 ? 'Aucun fournisseur' : 'Sélectionner'} /></SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {TYPE_EMOJIS[p.type] ?? ''} {p.name} — à partir de {formatPrice(p.minFare)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Nom du passager *</Label>
              <Input placeholder="Ex: Omar Seck" value={bookingForm.passengerName} onChange={(e) => setBookingForm((f) => ({ ...f, passengerName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Téléphone</Label>
                <Input placeholder="+221 77 123 45 67" value={bookingForm.phone} onChange={(e) => setBookingForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" placeholder="email@exemple.com" value={bookingForm.email} onChange={(e) => setBookingForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Lieu de départ *</Label>
              <Input placeholder="Ex: Aéroport DSS - Arrivées" value={bookingForm.pickupLocation} onChange={(e) => setBookingForm((f) => ({ ...f, pickupLocation: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Destination *</Label>
              <Input placeholder="Ex: Dakar Plateau" value={bookingForm.dropoffLocation} onChange={(e) => setBookingForm((f) => ({ ...f, dropoffLocation: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Date *</Label>
                <Input type="date" value={bookingForm.pickupDate} onChange={(e) => setBookingForm((f) => ({ ...f, pickupDate: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Heure *</Label>
                <Input type="time" value={bookingForm.pickupTime} onChange={(e) => setBookingForm((f) => ({ ...f, pickupTime: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Passagers</Label>
                <Input type="number" min={1} max={50} value={bookingForm.passengers} onChange={(e) => setBookingForm((f) => ({ ...f, passengers: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Distance (km)</Label>
              <Input type="number" min={1} value={bookingForm.distanceKm} onChange={(e) => setBookingForm((f) => ({ ...f, distanceKm: parseInt(e.target.value) || 1 }))} />
            </div>
            {/* Price preview with breakdown */}
            {bookingForm.providerId && (
              <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
                <p className="text-sm text-orange-600 font-medium mb-2">Prix estimé</p>
                {priceLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="size-4 animate-spin rounded-full border-2 border-orange-300 border-t-orange-500" />
                    <span className="text-sm text-orange-400">Calcul en cours...</span>
                  </div>
                ) : priceBreakdown ? (
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-orange-600">
                      <span>Tarif de base</span>
                      <span>{formatPrice(priceBreakdown.baseFare)}</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>{bookingForm.distanceKm} km x {formatPrice(selectedProvider?.perKmRate ?? 0)}/km</span>
                      <span>{formatPrice(priceBreakdown.distanceCost)}</span>
                    </div>
                    {priceBreakdown.nightSurcharge > 0 && (
                      <div className="flex justify-between text-orange-500">
                        <span>Majoration nuit</span>
                        <span>+{formatPrice(priceBreakdown.nightSurcharge)}</span>
                      </div>
                    )}
                    {priceBreakdown.minFareApplied && (
                      <p className="text-xs text-amber-600 italic">* Tarif minimum appliqué</p>
                    )}
                    <div className="flex items-center justify-between pt-1.5 border-t border-orange-300">
                      <span className="font-medium text-orange-700">Total</span>
                      <p className="text-lg font-bold text-orange-700">{formatPrice(priceBreakdown.total)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-orange-400">Impossible de calculer le prix</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetBookingForm}>Annuler</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleCreateBooking} disabled={bookingSubmitting}>
              {bookingSubmitting ? 'Réservation...' : 'Réserver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ VIEW BOOKING DIALOG ═══════════════════ */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Détails de la Course</DialogTitle>
            <DialogDescription>Référence: {selectedBooking?.ref}</DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Passager:</span>
                  <p className="font-medium">{selectedBooking.passenger}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Fournisseur:</span>
                  <p className="font-medium">{selectedBooking.providerName ?? '—'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Trajet:</span>
                  <p className="font-medium">{selectedBooking.pickup} → {selectedBooking.dropoff}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date/Heure:</span>
                  <p className="font-medium">{selectedBooking.date} {selectedBooking.time}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Chauffeur:</span>
                  <p className="font-medium">{selectedBooking.driver}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Prix:</span>
                  <p className="font-bold text-orange-600">{formatPrice(selectedBooking.price)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Statut:</span>
                  <div className="mt-0.5"><TransportStatusBadge status={selectedBooking.status} /></div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
