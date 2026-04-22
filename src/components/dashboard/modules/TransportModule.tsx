'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Car, Navigation, CheckCircle, Plus, Eye, Search } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

// ── Types ───────────────────────────────────────────────────────────────────

interface TransportProvider {
  id: string
  name: string
  type: string
  baseFare: number
  perKmRate: number
  minFare: number
  airportCode: string
  isActive: boolean
}

interface TransportBooking {
  id: string
  ref: string
  passenger: string
  vehicleType: 'taxi' | 'shuttle' | 'private' | 'bus' | string
  pickup: string
  dropoff: string
  date: string
  time: string
  driver: string
  price: number
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
}

interface TransportStats {
  total: number
  inProgress: number
  completed: number
}

interface CreateTransportForm {
  passenger: string
  phone: string
  providerId: string
  pickup: string
  dropoff: string
  date: string
  time: string
  passengers: number
}

// ── Constants ───────────────────────────────────────────────────────────────

const VEHICLE_PRICES: Record<string, number> = {
  taxi: 15000,
  shuttle: 8000,
  private: 35000,
  bus: 5000,
}

const VEHICLE_LABELS: Record<string, string> = {
  taxi: 'Taxi',
  shuttle: 'Navette',
  private: 'Véhicule Privé',
  bus: 'Bus',
}

const PICKUP_LOCATIONS = [
  'Aéroport AIBD Dakar',
  'Aéroport DSS - Arrivées',
  'Aéroport DSS - Départs',
]

const DROPOFF_LOCATIONS = [
  'Dakar Plateau',
  'Almadies',
  'Mermoz',
  'Saly Portudal',
  'Saly Somone',
  'Ngor',
  'Ouakam',
  'Plateau Médina',
  'Les Collines',
  'Yoff',
]

// ── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_TRANSPORT: TransportBooking[] = [
  {
    id: 'tp-001',
    ref: 'TRP-2024-0001',
    passenger: 'Omar Seck',
    vehicleType: 'taxi',
    pickup: 'Aéroport DSS - Arrivées',
    dropoff: 'Dakar Plateau',
    date: '2026-05-12',
    time: '08:30',
    driver: 'Moussa Balde',
    price: 15000,
    status: 'completed',
  },
  {
    id: 'tp-002',
    ref: 'TRP-2024-0002',
    passenger: 'Fatimata Diallo',
    vehicleType: 'private',
    pickup: 'Aéroport AIBD Dakar',
    dropoff: 'Saly Portudal',
    date: '2026-05-13',
    time: '10:00',
    driver: 'Ibrahima Fall',
    price: 35000,
    status: 'confirmed',
  },
  {
    id: 'tp-003',
    ref: 'TRP-2024-0003',
    passenger: 'Jean-Baptiste Mendy',
    vehicleType: 'shuttle',
    pickup: 'Aéroport DSS - Départs',
    dropoff: 'Mermoz',
    date: '2026-05-13',
    time: '14:30',
    driver: 'Pape Gueye',
    price: 8000,
    status: 'in_progress',
  },
  {
    id: 'tp-004',
    ref: 'TRP-2024-0004',
    passenger: 'Aminata Sow',
    vehicleType: 'taxi',
    pickup: 'Aéroport DSS - Arrivées',
    dropoff: 'Almadies',
    date: '2026-05-14',
    time: '06:45',
    driver: 'Cheikh Diop',
    price: 15000,
    status: 'pending',
  },
  {
    id: 'tp-005',
    ref: 'TRP-2024-0005',
    passenger: 'Groupe AFRA',
    vehicleType: 'bus',
    pickup: 'Aéroport AIBD Dakar',
    dropoff: 'Les Collines',
    date: '2026-05-10',
    time: '09:00',
    driver: 'Babacar Ndiaye',
    price: 5000,
    status: 'completed',
  },
  {
    id: 'tp-006',
    ref: 'TRP-2024-0006',
    passenger: 'Mouhamet Ba',
    vehicleType: 'private',
    pickup: 'Aéroport DSS - Arrivées',
    dropoff: 'Ngor',
    date: '2026-05-15',
    time: '11:15',
    driver: 'Ousmane Sy',
    price: 35000,
    status: 'confirmed',
  },
  {
    id: 'tp-007',
    ref: 'TRP-2024-0007',
    passenger: 'Mariama Camara',
    vehicleType: 'taxi',
    pickup: 'Aéroport DSS - Départs',
    dropoff: 'Plateau Médina',
    date: '2026-05-15',
    time: '16:00',
    driver: 'Mamadou Sarr',
    price: 15000,
    status: 'in_progress',
  },
  {
    id: 'tp-008',
    ref: 'TRP-2024-0008',
    passenger: 'Délagation UE',
    vehicleType: 'bus',
    pickup: 'Aéroport AIBD Dakar',
    dropoff: 'Saly Somone',
    date: '2026-05-08',
    time: '07:30',
    driver: 'Serigne Mbaye',
    price: 5000,
    status: 'completed',
  },
  {
    id: 'tp-009',
    ref: 'TRP-2024-0009',
    passenger: 'Souleymane Dia',
    vehicleType: 'shuttle',
    pickup: 'Aéroport DSS - Arrivées',
    dropoff: 'Yoff',
    date: '2026-05-16',
    time: '12:00',
    driver: 'Thierno Ba',
    price: 8000,
    status: 'pending',
  },
  {
    id: 'tp-010',
    ref: 'TRP-2024-0010',
    passenger: 'Aissatou Ndiaye',
    vehicleType: 'taxi',
    pickup: 'Aéroport DSS - Arrivées',
    dropoff: 'Ouakam',
    date: '2026-05-09',
    time: '20:00',
    driver: 'Abdoulaye Wade',
    price: 15000,
    status: 'cancelled',
  },
]

const MOCK_STATS: TransportStats = {
  total: 145,
  inProgress: 12,
  completed: 133,
}

const MOCK_PROVIDERS: TransportProvider[] = [
  { id: 'mock-taxi-1', name: 'Taxi Dakar Express', type: 'taxi', baseFare: 2000, perKmRate: 800, minFare: 5000, airportCode: 'DSS', isActive: true },
  { id: 'mock-shuttle-1', name: 'Navette Aéroport Sud', type: 'shuttle', baseFare: 1000, perKmRate: 400, minFare: 5000, airportCode: 'DSS', isActive: true },
  { id: 'mock-private-1', name: 'Dakar Premium Cars', type: 'private', baseFare: 5000, perKmRate: 1500, minFare: 15000, airportCode: 'DSS', isActive: true },
  { id: 'mock-bus-1', name: 'Bus AIBD Collectif', type: 'bus', baseFare: 500, perKmRate: 200, minFare: 3000, airportCode: 'DSS', isActive: true },
]

// Emoji map for vehicle types
const VEHICLE_EMOJIS: Record<string, string> = {
  taxi: '🚕',
  shuttle: '🚌',
  private: '🚗',
  bus: '🚐',
  vtc: '🚕',
}

// ── Badge Components ────────────────────────────────────────────────────────

function VehicleTypeBadge({ type }: { type: TransportBooking['vehicleType'] }) {
  switch (type) {
    case 'taxi':
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
          <Car className="size-3" />
          Taxi
        </Badge>
      )
    case 'shuttle':
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
          Navette
        </Badge>
      )
    case 'private':
      return (
        <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100">
          Véhicule Privé
        </Badge>
      )
    case 'bus':
      return (
        <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
          Bus
        </Badge>
      )
    default:
      return <Badge variant="secondary">{type}</Badge>
  }
}

function TransportStatusBadge({ status }: { status: TransportBooking['status'] }) {
  switch (status) {
    case 'pending':
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
          En attente
        </Badge>
      )
    case 'confirmed':
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
          Confirmée
        </Badge>
      )
    case 'in_progress':
      return (
        <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
          En cours
        </Badge>
      )
    case 'completed':
      return (
        <Badge className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100">
          Terminée
        </Badge>
      )
    case 'cancelled':
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
          Annulée
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

// ── Stats Card ──────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: number
  icon: React.ReactNode
  colorClass: string
  iconBgClass: string
}

function StatCard({ title, value, icon, colorClass, iconBgClass }: StatCardProps) {
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

// ── Main Component ──────────────────────────────────────────────────────────

export function TransportModule() {
  const [bookings, setBookings] = useState<TransportBooking[]>([])
  const [stats, setStats] = useState<TransportStats>(MOCK_STATS)
  const [providers, setProviders] = useState<TransportProvider[]>([])
  const [providersLoaded, setProvidersLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<TransportBooking | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [form, setForm] = useState<CreateTransportForm>({
    passenger: '',
    phone: '',
    providerId: '',
    pickup: '',
    dropoff: '',
    date: '',
    time: '',
    passengers: 1,
  })

  // ── Provider Helpers ──────────────────────────────────────────────────

  const selectedProvider = providers.find((p) => p.id === form.providerId)

  const selectedProviderLabel = selectedProvider
    ? `${VEHICLE_EMOJIS[selectedProvider.type] || ''} ${selectedProvider.name} (${selectedProvider.type})`
    : ''

  // ── Price Calculation (client-side estimate for display; server calculates final) ──

  const estimatedClientPrice = selectedProvider
    ? Math.max(selectedProvider.baseFare + 10 * selectedProvider.perKmRate, selectedProvider.minFare)
    : 0

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA'
  }

  // ── Data Fetching ───────────────────────────────────────────────────────

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/transport/providers?airport=DSS')
      if (res.ok) {
        const json = await res.json()
        const items: TransportProvider[] = json.data ?? json.items ?? json ?? []
        if (Array.isArray(items) && items.length > 0) {
          setProviders(items)
          setProvidersLoaded(true)
          return
        }
      }
    } catch {
      // Fallback to mock providers
    }
    setProviders(MOCK_PROVIDERS)
    setProvidersLoaded(true)
  }, [])

  const normalizeBooking = (raw: Record<string, unknown>): TransportBooking => {
    // Handle both new API shape (passengerName, pickupLocation, ...) and legacy/mock shape (passenger, pickup, ...)
    return {
      id: raw.id as string,
      ref: (raw.bookingRef ?? raw.ref) as string,
      passenger: (raw.passengerName ?? raw.passenger) as string,
      vehicleType: (raw.vehicleType ?? raw.type) as TransportBooking['vehicleType'],
      pickup: (raw.pickupLocation ?? raw.pickup) as string,
      dropoff: (raw.dropoffLocation ?? raw.dropoff) as string,
      date: (raw.pickupDate ?? raw.date) as string,
      time: (raw.pickupTime ?? raw.time) as string,
      driver: (raw.driverName ?? raw.driver) as string,
      price: (raw.totalPrice ?? raw.estimatedPrice ?? raw.price ?? 0) as number,
      status: (raw.status) as TransportBooking['status'],
    }
  }

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    // Try /api/transport/bookings first (requires auth, includes provider)
    try {
      const res = await fetch('/api/transport/bookings')
      if (res.ok) {
        const json = await res.json()
        const items = json.data ?? json.items ?? json ?? []
        if (Array.isArray(items) && items.length > 0) {
          const normalized = items.map(normalizeBooking)
          setBookings(normalized)
          setStats({
            total: normalized.length,
            inProgress: normalized.filter((b) => b.status === 'in_progress' || b.status === 'confirmed').length,
            completed: normalized.filter((b) => b.status === 'completed').length,
          })
          return
        }
      }
    } catch {
      // Not authenticated or unavailable, try legacy
    }
    // Fallback: try legacy /api/transport
    try {
      const res = await fetch('/api/transport')
      if (res.ok) {
        const json = await res.json()
        const items = Array.isArray(json) ? json : (json.items ?? json.data ?? [])
        if (Array.isArray(items) && items.length > 0) {
          const normalized = items.map(normalizeBooking)
          setBookings(normalized)
          setStats({
            total: json.stats?.total ?? normalized.length ?? MOCK_STATS.total,
            inProgress: json.stats?.inProgress ?? MOCK_STATS.inProgress,
            completed: json.stats?.completed ?? MOCK_STATS.completed,
          })
          return
        }
      }
    } catch {
      // Fallback to mock
    }
    setBookings(MOCK_TRANSPORT)
    setStats(MOCK_STATS)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      await Promise.all([fetchBookings(), fetchProviders()])
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!form.passenger || !form.providerId || !form.pickup || !form.dropoff || !form.date || !form.time) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/transport/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: form.providerId,
          passengerName: form.passenger,
          phone: form.phone,
          pickupLocation: form.pickup,
          dropoffLocation: form.dropoff,
          pickupDate: form.date,
          pickupTime: form.time,
          passengers: form.passengers,
        }),
      })
      if (res.ok) {
        toast.success('Réservation de transport créée avec succès')
        resetForm()
        fetchBookings()
        return
      }
      const errData = await res.json().catch(() => ({}))
      toast.error(errData.error ?? 'Erreur lors de la création de la réservation')
    } catch {
      // Server unavailable — fall through to local mock
    }

    // Mock fallback: create a local booking
    const drivers = ['Moussa Balde', 'Ibrahima Fall', 'Pape Gueye', 'Cheikh Diop', 'Babacar Ndiaye']
    const prov = providers.find((p) => p.id === form.providerId)
    const mockPrice = prov
      ? Math.max(prov.baseFare + 10 * prov.perKmRate, prov.minFare)
      : VEHICLE_PRICES[form.providerId] || 15000
    const newBooking: TransportBooking = {
      id: `tp-${Date.now()}`,
      ref: `TRP-2024-${String(Date.now()).slice(-4)}`,
      passenger: form.passenger,
      vehicleType: (prov?.type ?? 'taxi') as TransportBooking['vehicleType'],
      pickup: form.pickup,
      dropoff: form.dropoff,
      date: form.date,
      time: form.time,
      driver: drivers[Math.floor(Math.random() * drivers.length)],
      price: mockPrice,
      status: 'pending',
    }
    setBookings((prev) => [newBooking, ...prev])
    setStats((prev) => ({ ...prev, total: prev.total + 1 }))
    toast.success('Réservation de transport créée avec succès')
    resetForm()
  }

  const resetForm = () => {
    setForm({
      passenger: '',
      phone: '',
      providerId: '',
      pickup: '',
      dropoff: '',
      date: '',
      time: '',
      passengers: 1,
    })
    setCreateOpen(false)
    setSubmitting(false)
  }

  const handleView = (booking: TransportBooking) => {
    setSelectedBooking(booking)
    setViewOpen(true)
  }

  // ── Filtered List ───────────────────────────────────────────────────────

  const filteredBookings = bookings.filter((b) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      b.passenger.toLowerCase().includes(q) ||
      b.ref.toLowerCase().includes(q) ||
      b.pickup.toLowerCase().includes(q) ||
      b.dropoff.toLowerCase().includes(q) ||
      b.driver.toLowerCase().includes(q)
    )
  })

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Réservations Transport</h2>
          <p className="text-muted-foreground">Gestion des courses taxi, navettes et véhicules privés</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(open) => { if (!open) resetForm(); else setCreateOpen(true) }}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              <Plus className="size-4" />
              Nouvelle Course
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvelle Réservation Transport</DialogTitle>
              <DialogDescription>
                Réservez un véhicule pour le transfert d'un passager.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="tp-passenger">Nom du Passager *</Label>
                <Input
                  id="tp-passenger"
                  placeholder="Ex: Omar Seck"
                  value={form.passenger}
                  onChange={(e) => setForm((f) => ({ ...f, passenger: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tp-phone">Téléphone</Label>
                <Input
                  id="tp-phone"
                  placeholder="+221 77 123 45 67"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tp-vehicle">Type de Véhicule *</Label>
                <Select
                  value={form.providerId}
                  onValueChange={(val) => setForm((f) => ({ ...f, providerId: val }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={providersLoaded ? "Sélectionner un type" : "Chargement..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {providersLoaded && providers.map((prov) => (
                      <SelectItem key={prov.id} value={prov.id}>
                        {VEHICLE_EMOJIS[prov.type] ?? ''} {prov.name} — à partir de {formatPrice(prov.minFare)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tp-pickup">Lieu de Départ *</Label>
                <Select
                  value={form.pickup}
                  onValueChange={(val) => setForm((f) => ({ ...f, pickup: val }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner le lieu de départ" />
                  </SelectTrigger>
                  <SelectContent>
                    {PICKUP_LOCATIONS.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tp-dropoff">Lieu d'Arrivée *</Label>
                <Select
                  value={form.dropoff}
                  onValueChange={(val) => setForm((f) => ({ ...f, dropoff: val }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner la destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {DROPOFF_LOCATIONS.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="tp-date">Date *</Label>
                  <Input
                    id="tp-date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tp-time">Heure *</Label>
                  <Input
                    id="tp-time"
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tp-passengers">Nombre de Passagers</Label>
                <Input
                  id="tp-passengers"
                  type="number"
                  min={1}
                  max={50}
                  value={form.passengers}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, passengers: parseInt(e.target.value) || 1 }))
                  }
                />
              </div>
              {/* Price Preview */}
              {form.providerId && selectedProvider && (
                <div className="rounded-lg bg-orange-50 border border-orange-200 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600">
                      {selectedProvider.name}
                    </p>
                    <p className="text-xs text-orange-500">
                      {form.pickup} → {form.dropoff} — Prix estimé par le serveur
                    </p>
                    <p className="text-xs text-orange-400">
                      À partir de {formatPrice(selectedProvider.minFare)} (base {formatPrice(selectedProvider.baseFare)} + {formatPrice(selectedProvider.perKmRate)}/km)
                    </p>
                  </div>
                  <p className="text-lg font-bold text-orange-700">≈ {formatPrice(estimatedClientPrice)}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => resetForm()}>
                Annuler
              </Button>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleCreate}
                disabled={submitting}
              >
                {submitting ? 'Réservation...' : 'Réserver'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Courses Total"
          value={stats.total}
          icon={<Car className="size-6 text-sky-600 dark:text-sky-400" />}
          colorClass="text-sky-600 dark:text-sky-400"
          iconBgClass="bg-sky-100 dark:bg-sky-900/30"
        />
        <StatCard
          title="En Cours"
          value={stats.inProgress}
          icon={<Navigation className="size-6 text-blue-600 dark:text-blue-400" />}
          colorClass="text-blue-600 dark:text-blue-400"
          iconBgClass="bg-blue-100 dark:bg-blue-900/30"
        />
        <StatCard
          title="Terminées"
          value={stats.completed}
          icon={<CheckCircle className="size-6 text-emerald-600 dark:text-emerald-400" />}
          colorClass="text-emerald-600 dark:text-emerald-400"
          iconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Liste des Courses</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher une course..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="size-8 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
            </div>
          ) : (
            <div className="max-h-[480px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Réf</TableHead>
                    <TableHead>Passager</TableHead>
                    <TableHead>Type Véhicule</TableHead>
                    <TableHead>Départ</TableHead>
                    <TableHead>Arrivée</TableHead>
                    <TableHead>Date/Heure</TableHead>
                    <TableHead>Chauffeur</TableHead>
                    <TableHead className="text-right">Prix</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                        Aucune course trouvée.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-mono text-xs">{booking.ref}</TableCell>
                        <TableCell className="font-medium">{booking.passenger}</TableCell>
                        <TableCell>
                          <VehicleTypeBadge type={booking.vehicleType} />
                        </TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate">{booking.pickup}</TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate">{booking.dropoff}</TableCell>
                        <TableCell className="text-xs">
                          {booking.date} {booking.time}
                        </TableCell>
                        <TableCell className="text-xs">{booking.driver}</TableCell>
                        <TableCell className="text-right text-xs">{formatPrice(booking.price)}</TableCell>
                        <TableCell>
                          <TransportStatusBadge status={booking.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(booking)}
                            className="text-orange-500 border-orange-200 hover:bg-orange-50"
                          >
                            <Eye className="size-3.5" />
                            Voir
                          </Button>
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

      {/* View Booking Dialog */}
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
                  <span className="text-muted-foreground">Type Véhicule:</span>
                  <div className="mt-1">
                    <VehicleTypeBadge type={selectedBooking.vehicleType} />
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Départ:</span>
                  <p className="font-medium">{selectedBooking.pickup}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Arrivée:</span>
                  <p className="font-medium">{selectedBooking.dropoff}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date & Heure:</span>
                  <p className="font-medium">{selectedBooking.date} à {selectedBooking.time}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Chauffeur:</span>
                  <p className="font-medium">{selectedBooking.driver}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Prix:</span>
                  <p className="font-bold text-orange-500">{formatPrice(selectedBooking.price)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Statut:</span>
                  <div className="mt-1">
                    <TransportStatusBadge status={selectedBooking.status} />
                  </div>
                </div>
              </div>
              {/* Route visualization */}
              <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                    <div className="h-8 w-0.5 bg-orange-300" />
                    <Navigation className="size-4 text-orange-500" />
                    <div className="h-8 w-0.5 bg-orange-300" />
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                  </div>
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="text-xs text-orange-500">Départ</p>
                      <p className="text-sm font-medium">{selectedBooking.pickup}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-600">Arrivée</p>
                      <p className="text-sm font-medium">{selectedBooking.dropoff}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
