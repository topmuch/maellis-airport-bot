'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Car, CheckCircle, Plus, Eye, Search, Pencil, MapPin,
} from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ── Types ───────────────────────────────────────────────────────────────────

interface CarRentalPartner {
  id: string
  name: string
  terminal?: string
  contactPhone?: string
  contactEmail?: string
  commissionRate?: number
  isActive?: boolean
}

interface Vehicle {
  id: string
  partnerId?: string
  partner?: { id: string; name: string; terminal: string }
  partnerName?: string
  category: 'Eco' | 'Comfort' | 'SUV' | 'Van' | 'Luxury'
  brand: string
  model: string
  seats: number
  transmission: 'Manual' | 'Automatic'
  ac: boolean
  pricePerDay: number
  currency?: string
  imageUrl?: string
  isAvailable?: boolean
}

interface CarBooking {
  id: string
  confirmationCode?: string
  userName?: string
  userPhone?: string
  vehicleId?: string
  vehicle?: {
    id: string
    brand: string
    model: string
    category: string
    partner?: { id: string; name: string; terminal: string }
  }
  partner?: { id: string; name: string; terminal: string }
  pickupDate: string
  dropoffDate: string
  pickupLocation?: string
  status: 'pending_payment' | 'paid' | 'confirmed' | 'active' | 'completed' | 'cancelled'
  totalPrice: number
  currency?: string
  insurance?: boolean
  childSeat?: boolean
  paymentRef?: string
  createdAt?: string
}

interface PartnerForm {
  name: string
  terminal: string
  contactPhone: string
  contactEmail: string
  commissionRate: number
}

interface VehicleForm {
  partnerId: string
  category: string
  brand: string
  model: string
  seats: number
  transmission: string
  ac: boolean
  pricePerDay: number
  imageUrl: string
  isAvailable: boolean
}

// ── Constants ───────────────────────────────────────────────────────────────

const TERMINAL_OPTIONS = [
  { value: 'T1', label: 'Terminal 1' },
  { value: 'T2', label: 'Terminal 2' },
  { value: 'T3', label: 'Terminal 3' },
  { value: 'T4', label: 'Terminal 4' },
]

const CATEGORY_OPTIONS = [
  { value: 'Eco', label: 'Économique' },
  { value: 'Comfort', label: 'Confort' },
  { value: 'SUV', label: 'SUV' },
  { value: 'Van', label: 'Utilitaire' },
  { value: 'Luxury', label: 'Luxe' },
]

const TRANSMISSION_OPTIONS = [
  { value: 'Manual', label: 'Manuelle' },
  { value: 'Automatic', label: 'Automatique' },
]

const DEFAULT_PARTNER_FORM: PartnerForm = {
  name: '', terminal: 'T1', contactPhone: '', contactEmail: '', commissionRate: 10,
}

const DEFAULT_VEHICLE_FORM: VehicleForm = {
  partnerId: '', category: 'Eco', brand: '', model: '', seats: 5,
  transmission: 'Manual', ac: true, pricePerDay: 0, imageUrl: '', isAvailable: true,
}

const BOOKING_STATUS_OPTIONS: { value: CarBooking['status']; label: string }[] = [
  { value: 'pending_payment', label: 'En attente de paiement' },
  { value: 'paid', label: 'Payé' },
  { value: 'confirmed', label: 'Confirmé' },
  { value: 'active', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
]

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatXof(price: number): string {
  return `${price.toLocaleString('fr-FR')} XOF`
}

function formatDateFr(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR')
  } catch {
    return dateStr
  }
}

// ── Badge Components ────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    Eco: { cls: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100', label: '💚 Éco' },
    Comfort: { cls: 'bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-100', label: '🔵 Confort' },
    SUV: { cls: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100', label: '🧡 SUV' },
    Van: { cls: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100', label: '🟣 Utilitaire' },
    Luxury: { cls: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100', label: '✨ Luxe' },
  }
  const cfg = map[category] ?? { cls: '', label: category }
  return <Badge className={cfg.cls}>{cfg.label}</Badge>
}

function CarBookingStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    pending_payment: { cls: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100', label: 'En attente' },
    paid: { cls: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100', label: 'Payé' },
    confirmed: { cls: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100', label: 'Confirmé' },
    active: { cls: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100', label: 'En cours' },
    completed: { cls: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100', label: 'Terminé' },
    cancelled: { cls: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100', label: 'Annulé' },
  }
  const cfg = map[status] ?? { cls: '', label: status }
  return <Badge className={cfg.cls}>{cfg.label}</Badge>
}

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return isActive
    ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Disponible</Badge>
    : <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">Indisponible</Badge>
}

function PartnerActiveBadge({ isActive }: { isActive: boolean }) {
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
      <Car className="size-10 mb-3 opacity-40" />
      <p>{message}</p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

export function CarRentalModule() {
  // ── Partners data ──────────────────────────────────────────────────────────
  const [partners, setPartners] = useState<CarRentalPartner[]>([])
  const [loadingPartners, setLoadingPartners] = useState(true)
  const [partnerFilter, setPartnerFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // ── Vehicles data ──────────────────────────────────────────────────────────
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // ── Bookings data ──────────────────────────────────────────────────────────
  const [bookings, setBookings] = useState<CarBooking[]>([])
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchBookings, setSearchBookings] = useState('')

  // ── Partner dialog ────────────────────────────────────────────────────────
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false)
  const [partnerForm, setPartnerForm] = useState<PartnerForm>(DEFAULT_PARTNER_FORM)
  const [partnerSubmitting, setPartnerSubmitting] = useState(false)

  // ── Vehicle dialog ────────────────────────────────────────────────────────
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [vehicleForm, setVehicleForm] = useState<VehicleForm>(DEFAULT_VEHICLE_FORM)
  const [vehicleSubmitting, setVehicleSubmitting] = useState(false)

  // ── Booking detail dialog ──────────────────────────────────────────────────
  const [bookingDetailOpen, setBookingDetailOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<CarBooking | null>(null)

  // ── Status change ─────────────────────────────────────────────────────────
  const [statusChanging, setStatusChanging] = useState(false)

  // ── Partner edit dialog ───────────────────────────────────────────────────
  const [editingPartner, setEditingPartner] = useState<CarRentalPartner | null>(null)

  // ── Booking create dialog ─────────────────────────────────────────────────
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false)
  const [bookingForm, setBookingForm] = useState({
    vehicleId: '', userPhone: '', userName: '',
    pickupDate: '', dropoffDate: '', pickupLocation: '',
    insurance: false, childSeat: false,
  })
  const [bookingSubmitting, setBookingSubmitting] = useState(false)

  // ── Fetch partners ────────────────────────────────────────────────────────

  const fetchPartners = useCallback(async () => {
    setLoadingPartners(true)
    try {
      const result = await apiClient.get<CarRentalPartner[]>('/api/car-rental')
      if (result.success) {
        const raw = result.data
        const items = Array.isArray(raw) ? raw : []
        setPartners(items)
      } else {
        setPartners([])
      }
    } catch {
      setPartners([])
    } finally {
      setLoadingPartners(false)
    }
  }, [])

  // ── Fetch vehicles ────────────────────────────────────────────────────────

  const fetchVehicles = useCallback(async () => {
    setLoadingVehicles(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter)
      const query = params.toString() ? `?${params.toString()}` : ''
      const result = await apiClient.get<Vehicle[]>(`/api/car-rental/vehicles${query}`)
      if (result.success) {
        const raw = result.data
        const items = Array.isArray(raw) ? raw : []
        setVehicles(items)
      } else {
        setVehicles([])
      }
    } catch {
      setVehicles([])
    } finally {
      setLoadingVehicles(false)
    }
  }, [categoryFilter])

  // ── Fetch bookings ────────────────────────────────────────────────────────

  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      params.set('limit', '100')
      const query = params.toString() ? `?${params.toString()}` : ''
      const result = await apiClient.get<{ success: boolean; data?: CarBooking[]; pagination?: Record<string, unknown> }>(`/api/car-rental/bookings${query}`)
      if (result.success) {
        // API returns { success, data: [...], pagination } — extract the array
        const raw = result.data
        const items = Array.isArray(raw) ? raw : (raw && Array.isArray((raw as Record<string, unknown>).data)) ? (raw as Record<string, unknown>).data as CarBooking[] : []
        setBookings(items)
      } else {
        setBookings([])
      }
    } catch {
      setBookings([])
    } finally {
      setLoadingBookings(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchPartners()
  }, [fetchPartners])

  useEffect(() => {
    fetchVehicles()
  }, [fetchVehicles])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  // ── Partner CRUD handlers ─────────────────────────────────────────────────

  const openCreatePartner = () => {
    setEditingPartner(null)
    setPartnerForm(DEFAULT_PARTNER_FORM)
    setPartnerDialogOpen(true)
  }

  const openEditPartner = (partner: CarRentalPartner) => {
    setEditingPartner(partner)
    setPartnerForm({
      name: partner.name,
      terminal: partner.terminal ?? 'T1',
      contactPhone: partner.contactPhone ?? '',
      contactEmail: partner.contactEmail ?? '',
      commissionRate: partner.commissionRate ?? 10,
    })
    setPartnerDialogOpen(true)
  }

  const handleSavePartner = async () => {
    if (!partnerForm.name) {
      toast.error("Le nom de l'agence est requis")
      return
    }
    setPartnerSubmitting(true)
    try {
      const payload = {
        name: partnerForm.name,
        terminal: partnerForm.terminal || undefined,
        contactPhone: partnerForm.contactPhone || undefined,
        contactEmail: partnerForm.contactEmail || undefined,
        commissionRate: partnerForm.commissionRate || undefined,
      }
      if (editingPartner) {
        const result = await apiClient.put(`/api/car-rental/${editingPartner.id}`, payload)
        if (result.success) {
          toast.success('Agence mise à jour avec succès')
          setPartnerDialogOpen(false)
          setEditingPartner(null)
          fetchPartners()
        } else {
          toast.error(result.error ?? "Erreur lors de la modification")
        }
      } else {
        const result = await apiClient.post('/api/car-rental', payload)
        if (result.success) {
          toast.success('Agence ajoutée avec succès')
          setPartnerDialogOpen(false)
          fetchPartners()
        } else {
          toast.error(result.error ?? "Erreur lors de l'ajout")
        }
      }
    } catch {
      toast.error('Erreur réseau.')
    } finally {
      setPartnerSubmitting(false)
    }
  }

  const handleTogglePartnerActive = async (partner: CarRentalPartner) => {
    try {
      const result = await apiClient.put(`/api/car-rental/${partner.id}`, {
        isActive: !partner.isActive,
      })
      if (result.success) {
        toast.success(partner.isActive ? 'Agence désactivée' : 'Agence activée')
        fetchPartners()
      } else {
        toast.error(result.error ?? 'Erreur lors de la modification')
      }
    } catch {
      toast.error('Erreur réseau.')
    }
  }

  // ── Vehicle CRUD handlers ─────────────────────────────────────────────────

  const openCreateVehicle = () => {
    setEditingVehicle(null)
    setVehicleForm(DEFAULT_VEHICLE_FORM)
    setVehicleDialogOpen(true)
  }

  const openEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setVehicleForm({
      partnerId: vehicle.partnerId ?? '',
      category: vehicle.category,
      brand: vehicle.brand,
      model: vehicle.model,
      seats: vehicle.seats,
      transmission: vehicle.transmission,
      ac: vehicle.ac ?? true,
      pricePerDay: vehicle.pricePerDay,
      imageUrl: vehicle.imageUrl ?? '',
      isAvailable: vehicle.isAvailable ?? true,
    })
    setVehicleDialogOpen(true)
  }

  const handleSaveVehicle = async () => {
    if (!vehicleForm.partnerId || !vehicleForm.brand || !vehicleForm.model) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }
    setVehicleSubmitting(true)
    try {
      const payload = {
        partnerId: vehicleForm.partnerId,
        category: vehicleForm.category,
        brand: vehicleForm.brand,
        model: vehicleForm.model,
        seats: vehicleForm.seats,
        transmission: vehicleForm.transmission,
        ac: vehicleForm.ac,
        pricePerDay: vehicleForm.pricePerDay,
        imageUrl: vehicleForm.imageUrl || undefined,
        isAvailable: vehicleForm.isAvailable,
      }
      const result = editingVehicle
        ? await apiClient.put(`/api/car-rental/vehicles/${editingVehicle.id}`, payload)
        : await apiClient.post('/api/car-rental/vehicles', payload)
      if (result.success) {
        toast.success(editingVehicle ? 'Véhicule mis à jour' : 'Véhicule ajouté avec succès')
        setVehicleDialogOpen(false)
        fetchVehicles()
      } else {
        toast.error(result.error ?? "Erreur lors de l'opération")
      }
    } catch {
      toast.error('Erreur réseau.')
    } finally {
      setVehicleSubmitting(false)
    }
  }

  const handleToggleVehicleAvailable = async (vehicle: Vehicle) => {
    try {
      const result = await apiClient.put(`/api/car-rental/vehicles/${vehicle.id}`, {
        isAvailable: !vehicle.isAvailable,
      })
      if (result.success) {
        toast.success(vehicle.isAvailable ? 'Véhicule marqué indisponible' : 'Véhicule marqué disponible')
        fetchVehicles()
      } else {
        toast.error(result.error ?? 'Erreur lors de la modification')
      }
    } catch {
      toast.error('Erreur réseau.')
    }
  }

  // ── Booking handlers ──────────────────────────────────────────────────────

  const handleViewBooking = (booking: CarBooking) => {
    setSelectedBooking(booking)
    setBookingDetailOpen(true)
  }

  const handleChangeStatus = async (booking: CarBooking, newStatus: CarBooking['status']) => {
    setStatusChanging(true)
    try {
      const result = await apiClient.put(`/api/car-rental/bookings/${booking.id}/status`, {
        status: newStatus,
      })
      if (result.success) {
        toast.success('Statut mis à jour avec succès')
        fetchBookings()
        if (selectedBooking?.id === booking.id) {
          setSelectedBooking({ ...booking, status: newStatus })
        }
      } else {
        toast.error(result.error ?? 'Erreur lors de la modification')
      }
    } catch {
      toast.error('Erreur réseau.')
    } finally {
      setStatusChanging(false)
    }
  }

  // ── Booking creation handler ────────────────────────────────────────────

  const handleCreateBooking = async () => {
    if (!bookingForm.vehicleId || !bookingForm.userPhone || !bookingForm.pickupDate || !bookingForm.dropoffDate || !bookingForm.pickupLocation) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }
    setBookingSubmitting(true)
    try {
      const result = await apiClient.post('/api/car-rental/bookings', bookingForm)
      if (result.success) {
        toast.success('Réservation créée avec succès')
        setBookingDialogOpen(false)
        setBookingForm({ vehicleId: '', userPhone: '', userName: '', pickupDate: '', dropoffDate: '', pickupLocation: '', insurance: false, childSeat: false })
        fetchBookings()
      } else {
        toast.error(result.error ?? 'Erreur lors de la création')
      }
    } catch {
      toast.error('Erreur réseau.')
    } finally {
      setBookingSubmitting(false)
    }
  }

  // ── Filtered data ─────────────────────────────────────────────────────────

  const filteredPartners = partners.filter((p) => {
    if (partnerFilter === 'active') return p.isActive !== false
    if (partnerFilter === 'inactive') return p.isActive === false
    return true
  })

  const filteredBookings = bookings.filter((b) => {
    if (!searchBookings) return true
    const q = searchBookings.toLowerCase()
    return (
      (b.confirmationCode ?? '').toLowerCase().includes(q) ||
      (b.userName ?? '').toLowerCase().includes(q) ||
      (b.userPhone ?? '').toLowerCase().includes(q) ||
      (b.vehicle ? `${b.vehicle.brand} ${b.vehicle.model}` : '').toLowerCase().includes(q)
    )
  })

  // ══════════════════════════════════════════════════════════════════════════
  // ── RENDER ────────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Location de Voitures</h2>
        <p className="text-muted-foreground text-sm">Agences partenaires, véhicules et réservations</p>
      </div>

      <Tabs defaultValue="agences" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="agences" className="gap-1.5">
            <Car className="h-4 w-4" />
            <span className="hidden sm:inline">Agences</span>
          </TabsTrigger>
          <TabsTrigger value="vehicules" className="gap-1.5">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Véhicules</span>
          </TabsTrigger>
          <TabsTrigger value="reservations" className="gap-1.5">
            <CheckCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Réservations</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════ TAB 1: Agences ═══════════════════ */}
        <TabsContent value="agences" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Agences ({partners.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={partnerFilter} onValueChange={(v) => setPartnerFilter(v as 'all' | 'active' | 'inactive')}>
                    <SelectTrigger className="w-[140px] h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      <SelectItem value="active">Actives</SelectItem>
                      <SelectItem value="inactive">Inactives</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={openCreatePartner}>
                    <Plus className="size-4" />
                    <span className="hidden sm:inline ml-1">Ajouter une agence</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPartners ? <Spinner /> : filteredPartners.length === 0 ? (
                <EmptyState message="Aucune agence trouvée. Ajoutez votre première agence partenaire." />
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead className="hidden sm:table-cell">Terminal</TableHead>
                        <TableHead className="hidden md:table-cell">Téléphone</TableHead>
                        <TableHead className="text-right hidden lg:table-cell">Commission</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPartners.map((partner) => (
                        <TableRow key={partner.id}>
                          <TableCell className="font-medium">🏢 {partner.name}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">{partner.terminal ?? '—'}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{partner.contactPhone ?? '—'}</TableCell>
                          <TableCell className="text-right hidden lg:table-cell text-sm">
                            {partner.commissionRate ? `${partner.commissionRate}%` : '—'}
                          </TableCell>
                          <TableCell><PartnerActiveBadge isActive={partner.isActive !== false} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="outline" size="sm" className="h-7 text-xs text-orange-500 border-orange-200 hover:bg-orange-50" onClick={() => openEditPartner(partner)}>
                                <Pencil className="size-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className={`h-7 text-xs ${partner.isActive !== false ? 'text-red-500 border-red-200 hover:bg-red-50' : 'text-emerald-500 border-emerald-200 hover:bg-emerald-50'}`}
                                onClick={() => handleTogglePartnerActive(partner)}
                              >
                                {partner.isActive !== false ? 'Désactiver' : 'Activer'}
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

        {/* ═══════════════════ TAB 2: Véhicules ═══════════════════ */}
        <TabsContent value="vehicules" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              title="Total Véhicules"
              value={vehicles.length}
              icon={<Car className="size-6 text-orange-600 dark:text-orange-400" />}
              colorClass="text-orange-600 dark:text-orange-400"
              iconBgClass="bg-orange-100 dark:bg-orange-900/30"
            />
            <StatCard
              title="Disponibles"
              value={vehicles.filter((v) => v.isAvailable !== false).length}
              icon={<CheckCircle className="size-6 text-emerald-600 dark:text-emerald-400" />}
              colorClass="text-emerald-600 dark:text-emerald-400"
              iconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
            />
            <StatCard
              title="Agences"
              value={partners.length}
              icon={<MapPin className="size-6 text-sky-600 dark:text-sky-400" />}
              colorClass="text-sky-600 dark:text-sky-400"
              iconBgClass="bg-sky-100 dark:bg-sky-900/30"
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Véhicules ({vehicles.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[140px] h-9 text-sm">
                      <SelectValue placeholder="Catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      {CATEGORY_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={openCreateVehicle}>
                    <Plus className="size-4" />
                    <span className="hidden sm:inline ml-1">Ajouter un véhicule</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingVehicles ? <Spinner /> : vehicles.length === 0 ? (
                <EmptyState message="Aucun véhicule trouvé. Ajoutez votre premier véhicule." />
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agence</TableHead>
                        <TableHead>Marque / Modèle</TableHead>
                        <TableHead className="hidden sm:table-cell">Catégorie</TableHead>
                        <TableHead className="hidden md:table-cell">Places</TableHead>
                        <TableHead className="hidden lg:table-cell">Transmission</TableHead>
                        <TableHead className="text-right">Prix / jour</TableHead>
                        <TableHead>Disponible</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicles.map((vehicle) => (
                        <TableRow key={vehicle.id}>
                          <TableCell className="text-sm">{vehicle.partnerName ?? vehicle.partner?.name ?? '—'}</TableCell>
                          <TableCell className="font-medium">{vehicle.brand} {vehicle.model}</TableCell>
                          <TableCell className="hidden sm:table-cell"><CategoryBadge category={vehicle.category} /></TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{vehicle.seats} places</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {vehicle.transmission === 'Automatic' ? 'Automatique' : 'Manuelle'}
                            {vehicle.ac ? ' · ☀️' : ''}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatXof(vehicle.pricePerDay)}</TableCell>
                          <TableCell><ActiveBadge isActive={vehicle.isAvailable !== false} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="outline" size="sm" className="h-7 text-xs text-orange-500 border-orange-200 hover:bg-orange-50" onClick={() => openEditVehicle(vehicle)}>
                                <Pencil className="size-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className={`h-7 text-xs ${vehicle.isAvailable !== false ? 'text-red-500 border-red-200 hover:bg-red-50' : 'text-emerald-500 border-emerald-200 hover:bg-emerald-50'}`}
                                onClick={() => handleToggleVehicleAvailable(vehicle)}
                              >
                                {vehicle.isAvailable !== false ? 'Masquer' : 'Afficher'}
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

        {/* ═══════════════════ TAB 3: Réservations ═══════════════════ */}
        <TabsContent value="reservations" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              title="Total Réservations"
              value={bookings.length}
              icon={<Car className="size-6 text-orange-600 dark:text-orange-400" />}
              colorClass="text-orange-600 dark:text-orange-400"
              iconBgClass="bg-orange-100 dark:bg-orange-900/30"
            />
            <StatCard
              title="En Cours"
              value={bookings.filter((b) => b.status === 'active' || b.status === 'confirmed').length}
              icon={<CheckCircle className="size-6 text-purple-600 dark:text-purple-400" />}
              colorClass="text-purple-600 dark:text-purple-400"
              iconBgClass="bg-purple-100 dark:bg-purple-900/30"
            />
            <StatCard
              title="Terminées"
              value={bookings.filter((b) => b.status === 'completed').length}
              icon={<CheckCircle className="size-6 text-emerald-600 dark:text-emerald-400" />}
              colorClass="text-emerald-600 dark:text-emerald-400"
              iconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Réservations ({bookings.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setBookingDialogOpen(true)}>
                    <Plus className="size-4" />
                    <span className="hidden sm:inline ml-1">Nouvelle Réservation</span>
                  </Button>
                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Rechercher..." className="pl-9 h-9 text-sm" value={searchBookings} onChange={(e) => setSearchBookings(e.target.value)} />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status filter buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  className={`h-8 text-xs ${statusFilter === 'all' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}`}
                  onClick={() => setStatusFilter('all')}
                >
                  Toutes
                </Button>
                {BOOKING_STATUS_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={statusFilter === opt.value ? 'default' : 'outline'}
                    size="sm"
                    className={`h-8 text-xs ${statusFilter === opt.value ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}`}
                    onClick={() => setStatusFilter(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>

              {loadingBookings ? <Spinner /> : filteredBookings.length === 0 ? (
                <EmptyState message="Aucune réservation trouvée." />
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead className="hidden sm:table-cell">Véhicule</TableHead>
                        <TableHead className="hidden md:table-cell">Dates</TableHead>
                        <TableHead className="hidden lg:table-cell">Lieu</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Prix</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono text-xs">{b.confirmationCode ?? '—'}</TableCell>
                          <TableCell className="font-medium">{b.userName ?? '—'}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm max-w-[160px] truncate">{b.vehicle ? `${b.vehicle.brand} ${b.vehicle.model}` : '—'}</TableCell>
                          <TableCell className="hidden md:table-cell text-xs">
                            {formatDateFr(b.pickupDate)} → {formatDateFr(b.dropoffDate)}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs max-w-[120px] truncate">{b.pickupLocation ?? '—'}</TableCell>
                          <TableCell><CarBookingStatusBadge status={b.status} /></TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatXof(b.totalPrice)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="outline" size="sm" className="h-7 text-xs text-orange-500 border-orange-200 hover:bg-orange-50" onClick={() => handleViewBooking(b)}>
                                <Eye className="size-3" />
                              </Button>
                              <Select value={b.status} onValueChange={(v) => handleChangeStatus(b, v as CarBooking['status'])} disabled={statusChanging}>
                                <SelectTrigger className="h-7 w-[110px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {BOOKING_STATUS_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
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
      </Tabs>

      {/* ═══════════════════ PARTNER CREATE DIALOG ═══════════════════ */}
      <Dialog open={partnerDialogOpen} onOpenChange={(open) => { if (!open) setPartnerDialogOpen(false) }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPartner ? 'Modifier l\'Agence' : 'Ajouter une Agence'}</DialogTitle>
            <DialogDescription>{editingPartner ? 'Modifiez les informations de l\'agence partenaire.' : 'Configurez un nouveau partenaire de location de voitures.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nom de l&apos;agence *</Label>
              <Input placeholder="Ex: Hertz Dakar" value={partnerForm.name} onChange={(e) => setPartnerForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Terminal</Label>
              <Select value={partnerForm.terminal} onValueChange={(v) => setPartnerForm((f) => ({ ...f, terminal: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TERMINAL_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Téléphone</Label>
                <Input placeholder="+221 77 123 45 67" value={partnerForm.contactPhone} onChange={(e) => setPartnerForm((f) => ({ ...f, contactPhone: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" placeholder="contact@agence.sn" value={partnerForm.contactEmail} onChange={(e) => setPartnerForm((f) => ({ ...f, contactEmail: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Commission (%)</Label>
              <Input type="number" min={0} max={100} value={partnerForm.commissionRate} onChange={(e) => setPartnerForm((f) => ({ ...f, commissionRate: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPartnerDialogOpen(false)}>Annuler</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSavePartner} disabled={partnerSubmitting}>
              {partnerSubmitting ? 'Enregistrement...' : editingPartner ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ VEHICLE CREATE/EDIT DIALOG ═══════════════════ */}
      <Dialog open={vehicleDialogOpen} onOpenChange={(open) => { if (!open) setVehicleDialogOpen(false) }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVehicle ? 'Modifier le Véhicule' : 'Ajouter un Véhicule'}</DialogTitle>
            <DialogDescription>{editingVehicle ? 'Modifiez les informations du véhicule.' : 'Ajoutez un nouveau véhicule à la flotte.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Agence partenaire *</Label>
              <Select value={vehicleForm.partnerId} onValueChange={(v) => setVehicleForm((f) => ({ ...f, partnerId: v }))}>
                <SelectTrigger><SelectValue placeholder={partners.length === 0 ? 'Aucune agence' : 'Sélectionner'} /></SelectTrigger>
                <SelectContent>
                  {partners.filter((p) => p.isActive !== false).map((p) => (
                    <SelectItem key={p.id} value={p.id}>🏢 {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Marque *</Label>
                <Input placeholder="Ex: Toyota" value={vehicleForm.brand} onChange={(e) => setVehicleForm((f) => ({ ...f, brand: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Modèle *</Label>
                <Input placeholder="Ex: Corolla" value={vehicleForm.model} onChange={(e) => setVehicleForm((f) => ({ ...f, model: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Catégorie</Label>
                <Select value={vehicleForm.category} onValueChange={(v) => setVehicleForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORY_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Transmission</Label>
                <Select value={vehicleForm.transmission} onValueChange={(v) => setVehicleForm((f) => ({ ...f, transmission: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TRANSMISSION_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Nombre de places</Label>
                <Input type="number" min={1} max={50} value={vehicleForm.seats} onChange={(e) => setVehicleForm((f) => ({ ...f, seats: parseInt(e.target.value) || 5 }))} />
              </div>
              <div className="grid gap-2">
                <Label>Prix / jour (XOF)</Label>
                <Input type="number" min={0} value={vehicleForm.pricePerDay} onChange={(e) => setVehicleForm((f) => ({ ...f, pricePerDay: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>URL de l&apos;image</Label>
              <Input placeholder="https://exemple.com/photo.jpg" value={vehicleForm.imageUrl} onChange={(e) => setVehicleForm((f) => ({ ...f, imageUrl: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="vehicle-ac"
                checked={vehicleForm.ac}
                onChange={(e) => setVehicleForm((f) => ({ ...f, ac: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <Label htmlFor="vehicle-ac">Climatisation</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="vehicle-available"
                checked={vehicleForm.isAvailable}
                onChange={(e) => setVehicleForm((f) => ({ ...f, isAvailable: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <Label htmlFor="vehicle-available">Disponible à la location</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVehicleDialogOpen(false)}>Annuler</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSaveVehicle} disabled={vehicleSubmitting}>
              {vehicleSubmitting ? 'Enregistrement...' : editingVehicle ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ BOOKING DETAIL DIALOG ═══════════════════ */}
      <Dialog open={bookingDetailOpen} onOpenChange={setBookingDetailOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de la Réservation</DialogTitle>
            <DialogDescription>Code: {selectedBooking?.confirmationCode ?? '—'}</DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Client:</span>
                  <p className="font-medium">{selectedBooking.userName ?? '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Téléphone:</span>
                  <p className="font-medium">{selectedBooking.userPhone ?? '—'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Véhicule:</span>
                  <p className="font-medium">{selectedBooking.vehicle ? `${selectedBooking.vehicle.brand} ${selectedBooking.vehicle.model} (${selectedBooking.vehicle.category})` : '—'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Agence:</span>
                  <p className="font-medium">{selectedBooking.vehicle?.partner?.name ?? selectedBooking.partner?.name ?? '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Début:</span>
                  <p className="font-medium">{formatDateFr(selectedBooking.pickupDate)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Retour:</span>
                  <p className="font-medium">{formatDateFr(selectedBooking.dropoffDate)}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Lieu de retrait:</span>
                  <p className="font-medium">{selectedBooking.pickupLocation ?? '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Assurance:</span>
                  <p className="font-medium">{selectedBooking.insurance ? 'Oui' : 'Non'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Siège enfant:</span>
                  <p className="font-medium">{selectedBooking.childSeat ? 'Oui' : 'Non'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Prix total:</span>
                  <p className="font-bold text-orange-600">{selectedBooking.totalPrice ? formatXof(selectedBooking.totalPrice) : '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Statut:</span>
                  <div className="mt-0.5"><CarBookingStatusBadge status={selectedBooking.status} /></div>
                </div>
                {selectedBooking.paymentRef && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Réf. paiement:</span>
                    <p className="font-mono text-xs">{selectedBooking.paymentRef}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ BOOKING CREATE DIALOG ═══════════════════ */}
      <Dialog open={bookingDialogOpen} onOpenChange={(open) => { if (!open) setBookingDialogOpen(false) }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle Réservation</DialogTitle>
            <DialogDescription>Créez une réservation de véhicule pour un client.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Véhicule *</Label>
              <Select value={bookingForm.vehicleId} onValueChange={(v) => setBookingForm((f) => ({ ...f, vehicleId: v }))}>
                <SelectTrigger><SelectValue placeholder={vehicles.length === 0 ? 'Aucun véhicule' : 'Sélectionner un véhicule'} /></SelectTrigger>
                <SelectContent>
                  {vehicles.filter((v) => v.isAvailable !== false).map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.partner?.name ?? ''} — {v.brand} {v.model} ({v.category}) — {formatXof(v.pricePerDay)}/j
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Téléphone client *</Label>
                <Input placeholder="+221 77 123 45 67" value={bookingForm.userPhone} onChange={(e) => setBookingForm((f) => ({ ...f, userPhone: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Nom client</Label>
                <Input placeholder="Nom du client" value={bookingForm.userName} onChange={(e) => setBookingForm((f) => ({ ...f, userName: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Date de retrait *</Label>
                <Input type="date" value={bookingForm.pickupDate} onChange={(e) => setBookingForm((f) => ({ ...f, pickupDate: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Date de retour *</Label>
                <Input type="date" value={bookingForm.dropoffDate} onChange={(e) => setBookingForm((f) => ({ ...f, dropoffDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Lieu de retrait *</Label>
              <Input placeholder="Ex: Aéroport AIBD, Terminal 1" value={bookingForm.pickupLocation} onChange={(e) => setBookingForm((f) => ({ ...f, pickupLocation: e.target.value }))} />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="booking-insurance"
                  checked={bookingForm.insurance}
                  onChange={(e) => setBookingForm((f) => ({ ...f, insurance: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <Label htmlFor="booking-insurance">Assurance (+2 000 XOF)</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="booking-childseat"
                  checked={bookingForm.childSeat}
                  onChange={(e) => setBookingForm((f) => ({ ...f, childSeat: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <Label htmlFor="booking-childseat">Siège enfant (+1 500 XOF)</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingDialogOpen(false)}>Annuler</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleCreateBooking} disabled={bookingSubmitting}>
              {bookingSubmitting ? 'Création...' : 'Créer la réservation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
