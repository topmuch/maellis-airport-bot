'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Crown, CheckCircle, Clock, Plus, Eye, Search, Pencil, Trash2, DoorOpen,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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

interface Lounge {
  id: string
  name: string
  airportCode: string
  terminal?: string
  gateLocation?: string
  description?: string
  location?: string
  priceStandard: number
  priceBusiness: number | null
  priceFirstClass?: number
  priceChild?: number
  maxCapacity: number
  currentOccupancy: number
  isOpen: boolean
  openingHours?: string
  openingTime?: string
  closingTime?: string
  amenities?: string[]
  accessLevel?: string
}

interface LoungeBooking {
  id: string
  ref: string
  passenger: string
  lounge: string
  loungeId?: string
  airport: string
  date: string
  time: string
  guests: number
  ticketClass?: string
  price: number
  payment: 'paid' | 'pending' | 'failed'
  status: 'confirmed' | 'pending' | 'checked_in' | 'completed' | 'cancelled'
  flightNumber?: string
}

interface LoungeForm {
  name: string
  airportCode: string
  terminal: string
  gateLocation: string
  description: string
  priceStandard: number
  priceBusiness: number
  priceFirstClass: number
  priceChild: number
  maxCapacity: number
  openingTime: string
  closingTime: string
  amenities: string[]
}

interface BookingForm {
  loungeId: string
  passengerName: string
  phone: string
  email: string
  ticketClass: string
  flightNumber: string
  bookingDate: string
  startTime: string
  guests: number
}

// ── Constants ───────────────────────────────────────────────────────────────

const AIRPORT_OPTIONS = [
  { value: 'DSS', label: 'DSS — Aéroport AIBD Dakar' },
  { value: 'ABJ', label: 'ABJ — Aéroport Félix Houphouët-Boigny' },
  { value: 'BKO', label: 'BKO — Aéroport Modibo Keita' },
  { value: 'LOS', label: 'LOS — Aéroport Murtala Muhammed' },
  { value: 'ACC', label: 'ACC — Aéroport Kotoka' },
]

const AMENITY_OPTIONS = [
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'shower', label: 'Douche' },
  { value: 'food', label: 'Restauration' },
  { value: 'bar', label: 'Bar' },
  { value: 'workspace', label: 'Espace de travail' },
]

const CLASS_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'Première Classe' },
  { value: 'child', label: 'Enfant' },
]

const DEFAULT_LOUNGE_FORM: LoungeForm = {
  name: '', airportCode: 'DSS', terminal: '', gateLocation: '',
  description: '', priceStandard: 0, priceBusiness: 0, priceFirstClass: 0,
  priceChild: 0, maxCapacity: 50, openingTime: '06:00', closingTime: '22:00',
  amenities: [],
}

const DEFAULT_BOOKING_FORM: BookingForm = {
  loungeId: '', passengerName: '', phone: '', email: '',
  ticketClass: 'standard', flightNumber: '', bookingDate: '',
  startTime: '', guests: 1,
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA'
}

// ── Badge Components ────────────────────────────────────────────────────────

function PaymentBadge({ payment }: { payment: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    paid: { cls: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100', label: 'Payé' },
    pending: { cls: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100', label: 'En attente' },
    failed: { cls: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100', label: 'Échoué' },
  }
  const cfg = map[payment] ?? { cls: '', label: payment }
  return <Badge className={cfg.cls}>{cfg.label}</Badge>
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    confirmed: { cls: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100', label: 'Confirmée' },
    pending: { cls: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100', label: 'En attente' },
    checked_in: { cls: 'bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-100', label: 'Enregistré' },
    completed: { cls: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100', label: 'Terminée' },
    cancelled: { cls: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100', label: 'Annulée' },
  }
  const cfg = map[status] ?? { cls: '', label: status }
  return <Badge className={cfg.cls}>{cfg.label}</Badge>
}

function ClassBadge({ ticketClass }: { ticketClass?: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    standard: { cls: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100', label: 'Standard' },
    business: { cls: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100', label: 'Business' },
    first: { cls: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100', label: '1ère Classe' },
    child: { cls: 'bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-100', label: 'Enfant' },
  }
  const cfg = map[ticketClass ?? ''] ?? { cls: 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100', label: ticketClass ?? '—' }
  return <Badge className={cfg.cls}>{cfg.label}</Badge>
}

function LoungeStatusBadge({ isOpen }: { isOpen: boolean }) {
  if (isOpen) {
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Ouvert</Badge>
  }
  return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">Fermé</Badge>
}

// ── Capacity Bar ────────────────────────────────────────────────────────────

function CapacityBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{current}/{max}</span>
    </div>
  )
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
      <DoorOpen className="size-10 mb-3 opacity-40" />
      <p>{message}</p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

export function LoungeModule() {
  // ── Data ──────────────────────────────────────────────────────────────────
  const [lounges, setLounges] = useState<Lounge[]>([])
  const [bookings, setBookings] = useState<LoungeBooking[]>([])
  const [loadingLounges, setLoadingLounges] = useState(true)
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [searchLounges, setSearchLounges] = useState('')
  const [searchBookings, setSearchBookings] = useState('')

  // ── Lounge CRUD dialog ────────────────────────────────────────────────────
  const [loungeDialogOpen, setLoungeDialogOpen] = useState(false)
  const [editingLounge, setEditingLounge] = useState<Lounge | null>(null)
  const [loungeForm, setLoungeForm] = useState<LoungeForm>(DEFAULT_LOUNGE_FORM)
  const [loungeSubmitting, setLoungeSubmitting] = useState(false)

  // ── Lounge delete dialog ──────────────────────────────────────────────────
  const [deleteLoungeDialogOpen, setDeleteLoungeDialogOpen] = useState(false)
  const [deletingLounge, setDeletingLounge] = useState<Lounge | null>(null)

  // ── Booking create dialog ─────────────────────────────────────────────────
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false)
  const [bookingForm, setBookingForm] = useState<BookingForm>(DEFAULT_BOOKING_FORM)
  const [bookingSubmitting, setBookingSubmitting] = useState(false)

  // ── View dialog ───────────────────────────────────────────────────────────
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<LoungeBooking | null>(null)

  // ── Derived ───────────────────────────────────────────────────────────────

  const selectedLoungeForBooking = useMemo(
    () => lounges.find((l) => l.id === bookingForm.loungeId) ?? null,
    [lounges, bookingForm.loungeId],
  )

  const livePrice = useMemo(() => {
    if (!selectedLoungeForBooking) return 0
    const cls = bookingForm.ticketClass
    let unitPrice: number
    if (cls === 'first') {
      unitPrice = selectedLoungeForBooking.priceFirstClass ?? selectedLoungeForBooking.priceBusiness ?? selectedLoungeForBooking.priceStandard * 2
    } else if (cls === 'business') {
      unitPrice = selectedLoungeForBooking.priceBusiness ?? selectedLoungeForBooking.priceStandard
    } else if (cls === 'child') {
      unitPrice = selectedLoungeForBooking.priceChild ?? Math.round(selectedLoungeForBooking.priceStandard * 0.5)
    } else {
      unitPrice = selectedLoungeForBooking.priceStandard
    }
    return unitPrice * bookingForm.guests
  }, [selectedLoungeForBooking, bookingForm.ticketClass, bookingForm.guests])

  const liveUnitPrice = useMemo(() => {
    if (!selectedLoungeForBooking) return 0
    const cls = bookingForm.ticketClass
    if (cls === 'first') {
      return selectedLoungeForBooking.priceFirstClass ?? selectedLoungeForBooking.priceBusiness ?? selectedLoungeForBooking.priceStandard * 2
    } else if (cls === 'business') {
      return selectedLoungeForBooking.priceBusiness ?? selectedLoungeForBooking.priceStandard
    } else if (cls === 'child') {
      return selectedLoungeForBooking.priceChild ?? Math.round(selectedLoungeForBooking.priceStandard * 0.5)
    }
    return selectedLoungeForBooking.priceStandard
  }, [selectedLoungeForBooking, bookingForm.ticketClass])

  // ── Fetch Lounges ─────────────────────────────────────────────────────────

  const fetchLounges = useCallback(async () => {
    setLoadingLounges(true)
    try {
      const res = await fetch('/api/lounges?airport=DSS')
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          setLounges(json.data as Lounge[])
        } else {
          setLounges([])
        }
      } else {
        setLounges([])
      }
    } catch {
      setLounges([])
    } finally {
      setLoadingLounges(false)
    }
  }, [])

  // ── Fetch Bookings ────────────────────────────────────────────────────────

  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true)
    try {
      const res = await fetch('/api/lounge')
      if (res.ok) {
        const json = await res.json()
        const items: Record<string, unknown>[] = Array.isArray(json) ? json : (json.data ?? json.items ?? [])
        const mapped: LoungeBooking[] = items.map((b) => ({
          id: b.id as string,
          ref: (b.bookingRef ?? b.ref) as string,
          passenger: (b.passengerName ?? b.passenger) as string,
          lounge: (b.loungeName ?? b.lounge) as string,
          loungeId: b.loungeId as string | undefined,
          airport: (b.airportCode ?? b.airport) as string,
          date: (b.bookingDate ?? b.date) as string,
          time: (b.startTime ?? b.time) as string,
          guests: (b.guests ?? 1) as number,
          ticketClass: b.ticketClass as string | undefined,
          price: (b.totalPrice ?? b.price ?? 0) as number,
          payment: (b.paymentStatus ?? b.payment ?? 'pending') as LoungeBooking['payment'],
          status: (b.status ?? 'pending') as LoungeBooking['status'],
          flightNumber: b.flightNumber as string | undefined,
        }))
        setBookings(mapped)
      } else {
        setBookings([])
      }
    } catch {
      setBookings([])
    } finally {
      setLoadingBookings(false)
    }
  }, [])

  useEffect(() => {
    fetchLounges()
    fetchBookings()
  }, [fetchLounges, fetchBookings])

  // ── Lounge CRUD handlers ──────────────────────────────────────────────────

  const openCreateLounge = () => {
    setEditingLounge(null)
    setLoungeForm(DEFAULT_LOUNGE_FORM)
    setLoungeDialogOpen(true)
  }

  const openEditLounge = (lounge: Lounge) => {
    setEditingLounge(lounge)
    setLoungeForm({
      name: lounge.name,
      airportCode: lounge.airportCode,
      terminal: (lounge as Record<string, unknown>).terminal as string ?? '',
      gateLocation: (lounge as Record<string, unknown>).gateLocation as string ?? '',
      description: lounge.description ?? '',
      priceStandard: lounge.priceStandard,
      priceBusiness: lounge.priceBusiness ?? 0,
      priceFirstClass: (lounge as Record<string, unknown>).priceFirstClass as number ?? 0,
      priceChild: (lounge as Record<string, unknown>).priceChild as number ?? 0,
      maxCapacity: lounge.maxCapacity,
      openingTime: (lounge as Record<string, unknown>).openingTime as string ?? '',
      closingTime: (lounge as Record<string, unknown>).closingTime as string ?? '',
      amenities: lounge.amenities ?? [],
    })
    setLoungeDialogOpen(true)
  }

  const handleSaveLounge = async () => {
    if (!loungeForm.name) {
      toast.error('Le nom du salon est requis')
      return
    }
    setLoungeSubmitting(true)
    try {
      const payload = {
        airportCode: loungeForm.airportCode,
        name: loungeForm.name,
        location: `${loungeForm.terminal || ''}${loungeForm.gateLocation ? ` — ${loungeForm.gateLocation}` : ''}` || loungeForm.name,
        description: loungeForm.description || undefined,
        priceStandard: loungeForm.priceStandard,
        priceBusiness: loungeForm.priceBusiness || undefined,
        maxCapacity: loungeForm.maxCapacity,
        openingHours: loungeForm.openingTime && loungeForm.closingTime
          ? `${loungeForm.openingTime} - ${loungeForm.closingTime}`
          : undefined,
        accessLevel: 'standard' as const,
        amenities: JSON.stringify(loungeForm.amenities),
      }

      const url = editingLounge ? `/api/lounges/${editingLounge.id}` : '/api/lounges'
      const method = editingLounge ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast.success(editingLounge ? 'Salon mis à jour avec succès' : 'Salon créé avec succès')
        setLoungeDialogOpen(false)
        fetchLounges()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? err.message ?? 'Erreur lors de l\'opération')
      }
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.')
    } finally {
      setLoungeSubmitting(false)
    }
  }

  const confirmDeleteLounge = (lounge: Lounge) => {
    setDeletingLounge(lounge)
    setDeleteLoungeDialogOpen(true)
  }

  const handleDeleteLounge = async () => {
    if (!deletingLounge) return
    try {
      const res = await fetch(`/api/lounges/${deletingLounge.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Salon supprimé avec succès')
        fetchLounges()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? 'Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.')
    } finally {
      setDeleteLoungeDialogOpen(false)
      setDeletingLounge(null)
    }
  }

  const toggleAmenity = (amenity: string) => {
    setLoungeForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }))
  }

  // ── Booking handlers ──────────────────────────────────────────────────────

  const resetBookingForm = () => {
    setBookingForm(DEFAULT_BOOKING_FORM)
    setBookingDialogOpen(false)
    setBookingSubmitting(false)
  }

  const handleCreateBooking = async () => {
    if (!bookingForm.passengerName || !bookingForm.loungeId || !bookingForm.bookingDate || !bookingForm.startTime) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }
    setBookingSubmitting(true)
    try {
      const res = await fetch('/api/lounges/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loungeId: bookingForm.loungeId,
          passengerName: bookingForm.passengerName,
          phone: bookingForm.phone || undefined,
          email: bookingForm.email || undefined,
          ticketClass: bookingForm.ticketClass,
          flightNumber: bookingForm.flightNumber || undefined,
          bookingDate: bookingForm.bookingDate,
          startTime: bookingForm.startTime,
          guests: bookingForm.guests,
          accessLevel: bookingForm.ticketClass === 'business' ? 'business' : 'standard',
        }),
      })
      if (res.ok) {
        toast.success('Réservation de salon créée avec succès')
        resetBookingForm()
        fetchBookings()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? 'Erreur lors de la réservation')
      }
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.')
    } finally {
      setBookingSubmitting(false)
    }
  }

  // ── Filtered lists ────────────────────────────────────────────────────────

  const filteredLounges = lounges.filter((l) => {
    if (!searchLounges) return true
    const q = searchLounges.toLowerCase()
    return l.name.toLowerCase().includes(q) || l.airportCode.toLowerCase().includes(q)
  })

  const filteredBookings = bookings.filter((b) => {
    if (!searchBookings) return true
    const q = searchBookings.toLowerCase()
    return b.passenger.toLowerCase().includes(q) || b.ref.toLowerCase().includes(q) || b.lounge.toLowerCase().includes(q)
  })

  // ── Stats ─────────────────────────────────────────────────────────────────

  const openLounges = lounges.filter((l) => l.isOpen).length
  const avgCapacity = lounges.length > 0 ? Math.round(lounges.reduce((s, l) => s + l.maxCapacity, 0) / lounges.length) : 0

  // ══════════════════════════════════════════════════════════════════════════
  // ── RENDER ────────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Gestion des Salons VIP</h2>
        <p className="text-muted-foreground text-sm">Gestion des salons et réservations lounge</p>
      </div>

      <Tabs defaultValue="salons" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="salons" className="gap-1.5">
            <Crown className="h-4 w-4" />
            <span className="hidden sm:inline">Salons VIP</span>
          </TabsTrigger>
          <TabsTrigger value="reservations" className="gap-1.5">
            <CheckCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Réservations</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════ TAB 1: Salons VIP ═══════════════════ */}
        <TabsContent value="salons" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard title="Total Salons" value={lounges.length} icon={<Crown className="size-6 text-orange-600 dark:text-orange-400" />} colorClass="text-orange-600 dark:text-orange-400" iconBgClass="bg-orange-100 dark:bg-orange-900/30" />
            <StatCard title="Salons Ouverts" value={openLounges} icon={<DoorOpen className="size-6 text-emerald-600 dark:text-emerald-400" />} colorClass="text-emerald-600 dark:text-emerald-400" iconBgClass="bg-emerald-100 dark:bg-emerald-900/30" />
            <StatCard title="Capacité Moyenne" value={avgCapacity} icon={<Clock className="size-6 text-sky-600 dark:text-sky-400" />} colorClass="text-sky-600 dark:text-sky-400" iconBgClass="bg-sky-100 dark:bg-sky-900/30" />
          </div>

          {/* Salons table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Liste des Salons ({lounges.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Rechercher..." className="pl-9 h-9 text-sm" value={searchLounges} onChange={(e) => setSearchLounges(e.target.value)} />
                  </div>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={openCreateLounge}>
                    <Plus className="size-4" />
                    <span className="hidden sm:inline ml-1">Créer un salon</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingLounges ? <Spinner /> : filteredLounges.length === 0 ? (
                <EmptyState message="Aucun salon trouvé. Créez votre premier salon VIP." />
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead className="hidden md:table-cell">Terminal</TableHead>
                        <TableHead className="text-right">Tarif Standard</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Tarif Business</TableHead>
                        <TableHead className="hidden lg:table-cell">Capacité</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLounges.map((lounge) => (
                        <TableRow key={lounge.id}>
                          <TableCell className="font-medium">{lounge.name}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{(lounge as Record<string, unknown>).terminal as string ?? '—'}</TableCell>
                          <TableCell className="text-right text-sm">{formatPrice(lounge.priceStandard)}</TableCell>
                          <TableCell className="text-right text-sm hidden sm:table-cell">{lounge.priceBusiness ? formatPrice(lounge.priceBusiness) : '—'}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <CapacityBar current={lounge.currentOccupancy} max={lounge.maxCapacity} />
                          </TableCell>
                          <TableCell><LoungeStatusBadge isOpen={lounge.isOpen} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="outline" size="sm" className="h-7 text-xs text-orange-500 border-orange-200 hover:bg-orange-50" onClick={() => openEditLounge(lounge)}>
                                <Pencil className="size-3" />
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50" onClick={() => confirmDeleteLounge(lounge)}>
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

        {/* ═══════════════════ TAB 2: Réservations ═══════════════════ */}
        <TabsContent value="reservations" className="space-y-6">
          {/* Booking stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard title="Total Réservations" value={bookings.length} icon={<Crown className="size-6 text-orange-600 dark:text-orange-400" />} colorClass="text-orange-600 dark:text-orange-400" iconBgClass="bg-orange-100 dark:bg-orange-900/30" />
            <StatCard title="Confirmées" value={bookings.filter((b) => b.status === 'confirmed').length} icon={<CheckCircle className="size-6 text-emerald-600 dark:text-emerald-400" />} colorClass="text-emerald-600 dark:text-emerald-400" iconBgClass="bg-emerald-100 dark:bg-emerald-900/30" />
            <StatCard title="En Attente" value={bookings.filter((b) => b.status === 'pending').length} icon={<Clock className="size-6 text-amber-600 dark:text-amber-400" />} colorClass="text-amber-600 dark:text-amber-400" iconBgClass="bg-amber-100 dark:bg-amber-900/30" />
          </div>

          {/* Bookings table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Réservations ({bookings.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Rechercher..." className="pl-9 h-9 text-sm" value={searchBookings} onChange={(e) => setSearchBookings(e.target.value)} />
                  </div>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => { setBookingForm(DEFAULT_BOOKING_FORM); setBookingDialogOpen(true) }}>
                    <Plus className="size-4" />
                    <span className="hidden sm:inline ml-1">Nouvelle Réservation</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingBookings ? <Spinner /> : filteredBookings.length === 0 ? (
                <EmptyState message="Aucune réservation trouvée." />
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Réf</TableHead>
                        <TableHead>Passager</TableHead>
                        <TableHead className="hidden sm:table-cell">Salon</TableHead>
                        <TableHead className="hidden md:table-cell">Date</TableHead>
                        <TableHead className="hidden md:table-cell">Heure</TableHead>
                        <TableHead className="hidden lg:table-cell">Classe</TableHead>
                        <TableHead className="text-right">Prix</TableHead>
                        <TableHead className="hidden sm:table-cell">Paiement</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono text-xs">{b.ref}</TableCell>
                          <TableCell className="font-medium">{b.passenger}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">{b.lounge}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{b.date}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{b.time}</TableCell>
                          <TableCell className="hidden lg:table-cell"><ClassBadge ticketClass={b.ticketClass} /></TableCell>
                          <TableCell className="text-right text-sm">{formatPrice(b.price)}</TableCell>
                          <TableCell className="hidden sm:table-cell"><PaymentBadge payment={b.payment} /></TableCell>
                          <TableCell><StatusBadge status={b.status} /></TableCell>
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

      {/* ═══════════════════ LOUNGE CREATE/EDIT DIALOG ═══════════════════ */}
      <Dialog open={loungeDialogOpen} onOpenChange={(open) => { if (!open) setLoungeDialogOpen(false) }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLounge ? 'Modifier le Salon' : 'Créer un Salon'}</DialogTitle>
            <DialogDescription>{editingLounge ? 'Modifiez les informations du salon.' : 'Ajoutez un nouveau salon VIP.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nom du salon *</Label>
              <Input placeholder="Ex: Salon Diamant" value={loungeForm.name} onChange={(e) => setLoungeForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Aéroport</Label>
                <Select value={loungeForm.airportCode} onValueChange={(v) => setLoungeForm((f) => ({ ...f, airportCode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AIRPORT_OPTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Terminal</Label>
                <Input placeholder="Ex: Terminal 2" value={loungeForm.terminal} onChange={(e) => setLoungeForm((f) => ({ ...f, terminal: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Emplacement / Porte</Label>
              <Input placeholder="Ex: Porte B12" value={loungeForm.gateLocation} onChange={(e) => setLoungeForm((f) => ({ ...f, gateLocation: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea placeholder="Description du salon..." value={loungeForm.description} onChange={(e) => setLoungeForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tarif Standard (FCFA)</Label>
                <Input type="number" min={0} value={loungeForm.priceStandard} onChange={(e) => setLoungeForm((f) => ({ ...f, priceStandard: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="grid gap-2">
                <Label>Tarif Business (FCFA)</Label>
                <Input type="number" min={0} value={loungeForm.priceBusiness} onChange={(e) => setLoungeForm((f) => ({ ...f, priceBusiness: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tarif 1ère Classe (FCFA)</Label>
                <Input type="number" min={0} value={loungeForm.priceFirstClass} onChange={(e) => setLoungeForm((f) => ({ ...f, priceFirstClass: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="grid gap-2">
                <Label>Tarif Enfant (FCFA)</Label>
                <Input type="number" min={0} value={loungeForm.priceChild} onChange={(e) => setLoungeForm((f) => ({ ...f, priceChild: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Capacité Maximale</Label>
              <Input type="number" min={1} value={loungeForm.maxCapacity} onChange={(e) => setLoungeForm((f) => ({ ...f, maxCapacity: parseInt(e.target.value) || 50 }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Heure d&apos;ouverture</Label>
                <Input type="time" value={loungeForm.openingTime} onChange={(e) => setLoungeForm((f) => ({ ...f, openingTime: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Heure de fermeture</Label>
                <Input type="time" value={loungeForm.closingTime} onChange={(e) => setLoungeForm((f) => ({ ...f, closingTime: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Équipements</Label>
              <div className="flex flex-wrap gap-3 mt-1">
                {AMENITY_OPTIONS.map((a) => (
                  <label key={a.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={loungeForm.amenities.includes(a.value)} onCheckedChange={() => toggleAmenity(a.value)} />
                    <span className="text-sm">{a.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoungeDialogOpen(false)}>Annuler</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSaveLounge} disabled={loungeSubmitting}>
              {loungeSubmitting ? 'Enregistrement...' : editingLounge ? 'Mettre à jour' : 'Créer le salon'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ LOUNGE DELETE DIALOG ═══════════════════ */}
      <AlertDialog open={deleteLoungeDialogOpen} onOpenChange={setDeleteLoungeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le salon</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le salon &laquo; {deletingLounge?.name} &raquo; ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteLounge}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════════ BOOKING CREATE DIALOG ═══════════════════ */}
      <Dialog open={bookingDialogOpen} onOpenChange={(open) => { if (!open) resetBookingForm() }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle Réservation Salon</DialogTitle>
            <DialogDescription>Réservez un salon VIP pour un passager.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Salon *</Label>
              <Select value={bookingForm.loungeId} onValueChange={(v) => setBookingForm((f) => ({ ...f, loungeId: v }))}>
                <SelectTrigger><SelectValue placeholder={lounges.length === 0 ? 'Aucun salon disponible' : 'Sélectionner un salon'} /></SelectTrigger>
                <SelectContent>
                  {lounges.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} — {l.location ?? l.airportCode} — {formatPrice(l.priceStandard)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Nom du passager *</Label>
              <Input placeholder="Ex: Mamadou Diop" value={bookingForm.passengerName} onChange={(e) => setBookingForm((f) => ({ ...f, passengerName: e.target.value }))} />
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Classe tarifaire *</Label>
                <Select value={bookingForm.ticketClass} onValueChange={(v) => setBookingForm((f) => ({ ...f, ticketClass: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CLASS_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>N° de vol</Label>
                <Input placeholder="Ex: AK-304" value={bookingForm.flightNumber} onChange={(e) => setBookingForm((f) => ({ ...f, flightNumber: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Date *</Label>
                <Input type="date" value={bookingForm.bookingDate} onChange={(e) => setBookingForm((f) => ({ ...f, bookingDate: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Heure *</Label>
                <Input type="time" value={bookingForm.startTime} onChange={(e) => setBookingForm((f) => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Invités</Label>
                <Input type="number" min={1} max={50} value={bookingForm.guests} onChange={(e) => setBookingForm((f) => ({ ...f, guests: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            {/* Live price preview */}
            {selectedLoungeForBooking && (
              <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
                <p className="text-sm text-orange-600 font-medium mb-2">Aperçu du prix</p>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-orange-500">
                    <span>{formatPrice(liveUnitPrice)}</span>
                    <span className="text-orange-400"> x {bookingForm.guests} pers.</span>
                  </div>
                  <p className="text-lg font-bold text-orange-700">{formatPrice(livePrice)}</p>
                </div>
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
            <DialogTitle>Détails de la Réservation</DialogTitle>
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
                  <span className="text-muted-foreground">Salon:</span>
                  <p className="font-medium">{selectedBooking.lounge}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium">{selectedBooking.date}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Heure:</span>
                  <p className="font-medium">{selectedBooking.time}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Classe:</span>
                  <div className="mt-0.5"><ClassBadge ticketClass={selectedBooking.ticketClass} /></div>
                </div>
                <div>
                  <span className="text-muted-foreground">Invités:</span>
                  <p className="font-medium">{selectedBooking.guests}</p>
                </div>
                {selectedBooking.flightNumber && (
                  <div>
                    <span className="text-muted-foreground">Vol:</span>
                    <p className="font-mono font-medium">{selectedBooking.flightNumber}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Prix:</span>
                  <p className="font-bold text-orange-600">{formatPrice(selectedBooking.price)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Paiement:</span>
                  <div className="mt-0.5"><PaymentBadge payment={selectedBooking.payment} /></div>
                </div>
                <div>
                  <span className="text-muted-foreground">Statut:</span>
                  <div className="mt-0.5"><StatusBadge status={selectedBooking.status} /></div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
