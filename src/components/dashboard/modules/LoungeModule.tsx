'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Crown, CheckCircle, Clock, Plus, Eye, Search } from 'lucide-react'
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

interface LoungeBooking {
  id: string
  ref: string
  passenger: string
  lounge: string
  airport: string
  date: string
  time: string
  guests: number
  price: number
  payment: 'paid' | 'pending' | 'failed'
  status: 'confirmed' | 'pending' | 'checked_in' | 'completed' | 'cancelled'
}

interface LoungeStats {
  total: number
  confirmed: number
  pending: number
}

interface CreateLoungeForm {
  passenger: string
  phone: string
  email: string
  lounge: string
  airport: string
  date: string
  time: string
  guests: number
  duration: number
}

// ── Constants ───────────────────────────────────────────────────────────────

const BASE_PRICE = 25000
const GUEST_PER_HOUR_PRICE = 10000

const LOUNGES = [
  'Salon Air Sénégal VIP',
  'Salon Diamant',
  'No Wings Lounge',
  'ExecuJet Lounge',
  'Salon Teranga',
  'Salon Afrique Premium',
]

const AIRPORTS = [
  'DSS - Aéroport AIBD Dakar',
  'ABJ - Aéroport Félix Houphouët-Boigny',
  'BKO - Aéroport Modibo Keita',
  'LOS - Aéroport Murtala Muhammed',
  'ACC - Aéroport Kotoka',
]

const DURATIONS = [
  { value: 1, label: '1 heure' },
  { value: 2, label: '2 heures' },
  { value: 3, label: '3 heures' },
  { value: 4, label: '4 heures' },
  { value: 5, label: '5 heures' },
  { value: 6, label: '6 heures' },
]

// ── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_LOUNGE_BOOKINGS: LoungeBooking[] = [
  {
    id: 'ln-001',
    ref: 'LNG-2024-0001',
    passenger: 'Mamadou Diop',
    lounge: 'Salon Air Sénégal VIP',
    airport: 'DSS - Aéroport AIBD Dakar',
    date: '2026-05-12',
    time: '08:00',
    guests: 2,
    price: 65000,
    payment: 'paid',
    status: 'confirmed',
  },
  {
    id: 'ln-002',
    ref: 'LNG-2024-0002',
    passenger: 'Aminata Koné',
    lounge: 'Salon Diamant',
    airport: 'ABJ - Aéroport Félix Houphouët-Boigny',
    date: '2026-05-13',
    time: '10:30',
    guests: 1,
    price: 35000,
    payment: 'paid',
    status: 'confirmed',
  },
  {
    id: 'ln-003',
    ref: 'LNG-2024-0003',
    passenger: 'Cheikh Sylla',
    lounge: 'No Wings Lounge',
    airport: 'DSS - Aéroport AIBD Dakar',
    date: '2026-05-14',
    time: '14:00',
    guests: 3,
    price: 95000,
    payment: 'pending',
    status: 'pending',
  },
  {
    id: 'ln-004',
    ref: 'LNG-2024-0004',
    passenger: 'Adama Touré',
    lounge: 'ExecuJet Lounge',
    airport: 'BKO - Aéroport Modibo Keita',
    date: '2026-05-10',
    time: '06:30',
    guests: 1,
    price: 45000,
    payment: 'paid',
    status: 'checked_in',
  },
  {
    id: 'ln-005',
    ref: 'LNG-2024-0005',
    passenger: 'Rokhaya Mboup',
    lounge: 'Salon Teranga',
    airport: 'DSS - Aéroport AIBD Dakar',
    date: '2026-05-08',
    time: '16:00',
    guests: 4,
    price: 125000,
    payment: 'paid',
    status: 'completed',
  },
  {
    id: 'ln-006',
    ref: 'LNG-2024-0006',
    passenger: 'Boubacar Sarr',
    lounge: 'Salon Air Sénégal VIP',
    airport: 'DSS - Aéroport AIBD Dakar',
    date: '2026-05-15',
    time: '09:00',
    guests: 2,
    price: 55000,
    payment: 'failed',
    status: 'cancelled',
  },
  {
    id: 'ln-007',
    ref: 'LNG-2024-0007',
    passenger: 'Khadidiatou Ba',
    lounge: 'Salon Afrique Premium',
    airport: 'LOS - Aéroport Murtala Muhammed',
    date: '2026-05-16',
    time: '11:00',
    guests: 1,
    price: 55000,
    payment: 'pending',
    status: 'pending',
  },
  {
    id: 'ln-008',
    ref: 'LNG-2024-0008',
    passenger: 'Saliou Ndiaye',
    lounge: 'Salon Diamant',
    airport: 'ACC - Aéroport Kotoka',
    date: '2026-05-17',
    time: '13:30',
    guests: 2,
    price: 75000,
    payment: 'paid',
    status: 'confirmed',
  },
]

const MOCK_STATS: LoungeStats = {
  total: 89,
  confirmed: 65,
  pending: 24,
}

// ── Badge Components ────────────────────────────────────────────────────────

function PaymentBadge({ payment }: { payment: LoungeBooking['payment'] }) {
  switch (payment) {
    case 'paid':
      return (
        <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
          Payé
        </Badge>
      )
    case 'pending':
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
          En attente
        </Badge>
      )
    case 'failed':
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
          Échoué
        </Badge>
      )
    default:
      return <Badge variant="secondary">{payment}</Badge>
  }
}

function LoungeStatusBadge({ status }: { status: LoungeBooking['status'] }) {
  switch (status) {
    case 'confirmed':
      return (
        <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
          Confirmée
        </Badge>
      )
    case 'pending':
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
          En attente
        </Badge>
      )
    case 'checked_in':
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
          Enregistré
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

export function LoungeModule() {
  const [bookings, setBookings] = useState<LoungeBooking[]>([])
  const [stats, setStats] = useState<LoungeStats>(MOCK_STATS)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<LoungeBooking | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [form, setForm] = useState<CreateLoungeForm>({
    passenger: '',
    phone: '',
    email: '',
    lounge: '',
    airport: '',
    date: '',
    time: '',
    guests: 1,
    duration: 2,
  })

  // ── Price Calculation ──────────────────────────────────────────────────

  const calculatedPrice = useMemo(() => {
    return BASE_PRICE + (form.guests * form.duration * GUEST_PER_HOUR_PRICE)
  }, [form.guests, form.duration])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA'
  }

  // ── Data Fetching ───────────────────────────────────────────────────────

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/lounge')
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : (data.items ?? data.data ?? [])
        setBookings(items)
        setStats({
          total: data.stats?.total ?? data.length ?? MOCK_STATS.total,
          confirmed: data.stats?.confirmed ?? MOCK_STATS.confirmed,
          pending: data.stats?.pending ?? MOCK_STATS.pending,
        })
        return
      }
    } catch {
      // Fallback
    }
    setBookings(MOCK_LOUNGE_BOOKINGS)
    setStats(MOCK_STATS)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      await fetchBookings()
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!form.passenger || !form.lounge || !form.airport || !form.date || !form.time) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/lounge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, price: calculatedPrice }),
      })
      if (res.ok) {
        toast.success('Réservation de salon créée avec succès')
        resetForm()
        fetchBookings()
        return
      }
    } catch {
      // Local mock
    }

    const newBooking: LoungeBooking = {
      id: `ln-${Date.now()}`,
      ref: `LNG-2024-${String(Date.now()).slice(-4)}`,
      passenger: form.passenger,
      lounge: form.lounge,
      airport: form.airport,
      date: form.date,
      time: form.time,
      guests: form.guests,
      price: calculatedPrice,
      payment: 'pending',
      status: 'pending',
    }
    setBookings((prev) => [newBooking, ...prev])
    setStats((prev) => ({ ...prev, total: prev.total + 1, pending: prev.pending + 1 }))
    toast.success('Réservation de salon créée avec succès')
    resetForm()
    setSubmitting(false)
  }

  const resetForm = () => {
    setForm({
      passenger: '',
      phone: '',
      email: '',
      lounge: '',
      airport: '',
      date: '',
      time: '',
      guests: 1,
      duration: 2,
    })
    setCreateOpen(false)
    setSubmitting(false)
  }

  const handleView = (booking: LoungeBooking) => {
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
      b.lounge.toLowerCase().includes(q) ||
      b.airport.toLowerCase().includes(q)
    )
  })

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Réservations Salon VIP</h2>
          <p className="text-muted-foreground">Gestion des réservations de salons et lounges</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(open) => { if (!open) resetForm(); else setCreateOpen(true) }}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              <Plus className="size-4" />
              Nouvelle Réservation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvelle Réservation Salon</DialogTitle>
              <DialogDescription>
                Réservez un salon VIP pour un passager.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="lounge-passenger">Nom du Passager *</Label>
                <Input
                  id="lounge-passenger"
                  placeholder="Ex: Mamadou Diop"
                  value={form.passenger}
                  onChange={(e) => setForm((f) => ({ ...f, passenger: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="lounge-phone">Téléphone</Label>
                  <Input
                    id="lounge-phone"
                    placeholder="+221 77 123 45 67"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lounge-email">Email</Label>
                  <Input
                    id="lounge-email"
                    type="email"
                    placeholder="email@exemple.com"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lounge-select">Salon *</Label>
                <Select
                  value={form.lounge}
                  onValueChange={(val) => setForm((f) => ({ ...f, lounge: val }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner un salon" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOUNGES.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lounge-airport">Aéroport *</Label>
                <Select
                  value={form.airport}
                  onValueChange={(val) => setForm((f) => ({ ...f, airport: val }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner un aéroport" />
                  </SelectTrigger>
                  <SelectContent>
                    {AIRPORTS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="lounge-date">Date *</Label>
                  <Input
                    id="lounge-date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lounge-time">Heure *</Label>
                  <Input
                    id="lounge-time"
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="lounge-guests">Nombre d'invités</Label>
                  <Input
                    id="lounge-guests"
                    type="number"
                    min={1}
                    max={10}
                    value={form.guests}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, guests: parseInt(e.target.value) || 1 }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lounge-duration">Durée</Label>
                  <Select
                    value={String(form.duration)}
                    onValueChange={(val) => setForm((f) => ({ ...f, duration: parseInt(val) }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Durée" />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map((d) => (
                        <SelectItem key={d.value} value={String(d.value)}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Price Preview */}
              <div className="rounded-lg bg-orange-50 border border-orange-200 p-4 space-y-1">
                <p className="text-sm text-orange-600">Détail du prix</p>
                <div className="flex justify-between text-sm text-orange-500">
                  <span>Tarif de base</span>
                  <span>{formatPrice(BASE_PRICE)}</span>
                </div>
                <div className="flex justify-between text-sm text-orange-500">
                  <span>{form.guests} invité(s) × {form.duration}h × {formatPrice(GUEST_PER_HOUR_PRICE)}</span>
                  <span>{formatPrice(form.guests * form.duration * GUEST_PER_HOUR_PRICE)}</span>
                </div>
                <div className="border-t border-orange-200 pt-1 flex justify-between font-bold text-orange-700">
                  <span>Total</span>
                  <span>{formatPrice(calculatedPrice)}</span>
                </div>
              </div>
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
          title="Réservations Total"
          value={stats.total}
          icon={<Crown className="size-6 text-violet-600 dark:text-violet-400" />}
          colorClass="text-violet-600 dark:text-violet-400"
          iconBgClass="bg-violet-100 dark:bg-violet-900/30"
        />
        <StatCard
          title="Confirmées"
          value={stats.confirmed}
          icon={<CheckCircle className="size-6 text-emerald-600 dark:text-emerald-400" />}
          colorClass="text-emerald-600 dark:text-emerald-400"
          iconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
        />
        <StatCard
          title="En Attente"
          value={stats.pending}
          icon={<Clock className="size-6 text-amber-600 dark:text-amber-400" />}
          colorClass="text-amber-600 dark:text-amber-400"
          iconBgClass="bg-amber-100 dark:bg-amber-900/30"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Liste des Réservations</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher une réservation..."
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
                    <TableHead>Salon</TableHead>
                    <TableHead>Aéroport</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Heure</TableHead>
                    <TableHead className="text-right">Invités</TableHead>
                    <TableHead className="text-right">Prix</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                        Aucune réservation trouvée.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-mono text-xs">{booking.ref}</TableCell>
                        <TableCell className="font-medium">{booking.passenger}</TableCell>
                        <TableCell>{booking.lounge}</TableCell>
                        <TableCell className="text-xs">{booking.airport.split(' - ')[0]}</TableCell>
                        <TableCell>{booking.date}</TableCell>
                        <TableCell>{booking.time}</TableCell>
                        <TableCell className="text-right">{booking.guests}</TableCell>
                        <TableCell className="text-right text-xs">{formatPrice(booking.price)}</TableCell>
                        <TableCell>
                          <PaymentBadge payment={booking.payment} />
                        </TableCell>
                        <TableCell>
                          <LoungeStatusBadge status={booking.status} />
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
                  <span className="text-muted-foreground">Aéroport:</span>
                  <p className="font-medium">{selectedBooking.airport}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date & Heure:</span>
                  <p className="font-medium">{selectedBooking.date} à {selectedBooking.time}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Invités:</span>
                  <p className="font-medium">{selectedBooking.guests}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Prix:</span>
                  <p className="font-bold text-orange-500">{formatPrice(selectedBooking.price)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <span className="text-muted-foreground text-sm">Paiement:</span>
                  <div className="mt-1">
                    <PaymentBadge payment={selectedBooking.payment} />
                  </div>
                </div>
                <div className="flex-1">
                  <span className="text-muted-foreground text-sm">Statut:</span>
                  <div className="mt-1">
                    <LoungeStatusBadge status={selectedBooking.status} />
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
