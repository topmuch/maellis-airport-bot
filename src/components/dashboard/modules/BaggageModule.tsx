'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { QrCode, CheckCircle, Clock, Plus, Eye, Search } from 'lucide-react'
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

interface BaggageEntry {
  id: string
  passenger: string
  flightNumber: string
  pnr: string
  tagNumber: string
  destination: string
  weight: number
  status: 'active' | 'claimed' | 'expired'
  expiration: string
}

interface BaggageStats {
  total: number
  active: number
  expired: number
}

interface CreateBaggageForm {
  passenger: string
  flightNumber: string
  pnr: string
  tagNumber: string
  weight: number
  destination: string
}

// ── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_DESTINATIONS = [
  'DSS - Dakar Sénégal',
  'ABJ - Abidjan Côte d\'Ivoire',
  'BKO - Bamako Mali',
  'OUA - Ouagadougou Burkina',
  'LOS - Lagos Nigeria',
  'ACC - Accra Ghana',
  'CMN - Casablanca Maroc',
  'CDG - Paris France',
]

const MOCK_BAGGAGE: BaggageEntry[] = [
  {
    id: 'bg-001',
    passenger: 'Amadou Diallo',
    flightNumber: 'AF 722',
    pnr: 'XYZ123AB',
    tagNumber: 'DSS-2024-001',
    destination: 'DSS - Dakar Sénégal',
    weight: 23.5,
    status: 'active',
    expiration: '2026-05-15',
  },
  {
    id: 'bg-002',
    passenger: 'Fatou Sow',
    flightNumber: 'SN 501',
    pnr: 'DEF456CD',
    tagNumber: 'DSS-2024-002',
    destination: 'ABJ - Abidjan Côte d\'Ivoire',
    weight: 18.2,
    status: 'active',
    expiration: '2026-05-18',
  },
  {
    id: 'bg-003',
    passenger: 'Ibrahim Keita',
    flightNumber: 'TK 553',
    pnr: 'GHI789EF',
    tagNumber: 'DSS-2024-003',
    destination: 'BKO - Bamako Mali',
    weight: 31.0,
    status: 'claimed',
    expiration: '2026-04-20',
  },
  {
    id: 'bg-004',
    passenger: 'Awa Ndiaye',
    flightNumber: 'ET 921',
    pnr: 'JKL012GH',
    tagNumber: 'DSS-2024-004',
    destination: 'OUA - Ouagadougou Burkina',
    weight: 15.8,
    status: 'expired',
    expiration: '2026-03-10',
  },
  {
    id: 'bg-005',
    passenger: 'Moussa Traoré',
    flightNumber: 'SN 302',
    pnr: 'MNO345IJ',
    tagNumber: 'DSS-2024-005',
    destination: 'LOS - Lagos Nigeria',
    weight: 27.3,
    status: 'active',
    expiration: '2026-05-22',
  },
  {
    id: 'bg-006',
    passenger: 'Mariam Ba',
    flightNumber: 'AF 724',
    pnr: 'PQR678KL',
    tagNumber: 'DSS-2024-006',
    destination: 'ACC - Accra Ghana',
    weight: 20.1,
    status: 'active',
    expiration: '2026-05-25',
  },
  {
    id: 'bg-007',
    passenger: 'Ousmane Diop',
    flightNumber: 'RAM 731',
    pnr: 'STU901MN',
    tagNumber: 'DSS-2024-007',
    destination: 'CMN - Casablanca Maroc',
    weight: 34.6,
    status: 'claimed',
    expiration: '2026-04-18',
  },
  {
    id: 'bg-008',
    passenger: 'Aissatou Fall',
    flightNumber: 'AF 720',
    pnr: 'VWX234OP',
    tagNumber: 'DSS-2024-008',
    destination: 'CDG - Paris France',
    weight: 29.4,
    status: 'expired',
    expiration: '2026-02-28',
  },
]

const MOCK_STATS: BaggageStats = {
  total: 156,
  active: 120,
  expired: 36,
}

// ── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BaggageEntry['status'] }) {
  switch (status) {
    case 'active':
      return (
        <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
          Actif
        </Badge>
      )
    case 'claimed':
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
          Récupéré
        </Badge>
      )
    case 'expired':
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
          Expiré
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
    <Card>
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

export function BaggageModule() {
  const [baggageList, setBaggageList] = useState<BaggageEntry[]>([])
  const [stats, setStats] = useState<BaggageStats>(MOCK_STATS)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedBaggage, setSelectedBaggage] = useState<BaggageEntry | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [form, setForm] = useState<CreateBaggageForm>({
    passenger: '',
    flightNumber: '',
    pnr: '',
    tagNumber: '',
    weight: 0,
    destination: '',
  })

  // ── Data Fetching ───────────────────────────────────────────────────────

  const fetchBaggage = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/baggage')
      if (res.ok) {
        const data = await res.json()
        setBaggageList(data.items ?? data ?? [])
        setStats({
          total: data.stats?.total ?? data.length ?? MOCK_STATS.total,
          active: data.stats?.active ?? MOCK_STATS.active,
          expired: data.stats?.expired ?? MOCK_STATS.expired,
        })
        return
      }
    } catch {
      // Fallback to mock data
    }
    setBaggageList(MOCK_BAGGAGE)
    setStats(MOCK_STATS)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      await fetchBaggage()
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!form.passenger || !form.flightNumber || !form.pnr || !form.tagNumber || !form.destination) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/baggage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success('QR de bagage créé avec succès')
        setCreateOpen(false)
        setForm({
          passenger: '',
          flightNumber: '',
          pnr: '',
          tagNumber: '',
          weight: 0,
          destination: '',
        })
        fetchBaggage()
        return
      }
    } catch {
      // Proceed with local mock creation
    }

    // Local mock creation
    const newEntry: BaggageEntry = {
      id: `bg-${Date.now()}`,
      passenger: form.passenger,
      flightNumber: form.flightNumber,
      pnr: form.pnr,
      tagNumber: form.tagNumber,
      destination: form.destination,
      weight: form.weight || 0,
      status: 'active',
      expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }
    setBaggageList((prev) => [newEntry, ...prev])
    setStats((prev) => ({ ...prev, total: prev.total + 1, active: prev.active + 1 }))
    toast.success('QR de bagage créé avec succès')
    setCreateOpen(false)
    setForm({
      passenger: '',
      flightNumber: '',
      pnr: '',
      tagNumber: '',
      weight: 0,
      destination: '',
    })
    setSubmitting(false)
  }

  const handleViewQR = (entry: BaggageEntry) => {
    setSelectedBaggage(entry)
    setViewOpen(true)
  }

  // ── Filtered List ───────────────────────────────────────────────────────

  const filteredBaggage = baggageList.filter((b) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      b.passenger.toLowerCase().includes(q) ||
      b.flightNumber.toLowerCase().includes(q) ||
      b.pnr.toLowerCase().includes(q) ||
      b.tagNumber.toLowerCase().includes(q) ||
      b.destination.toLowerCase().includes(q)
    )
  })

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestion des QR Bagages</h2>
          <p className="text-muted-foreground">Suivi et gestion des codes QR pour les bagages</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              <Plus className="size-4" />
              Nouveau QR
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un QR Bagage</DialogTitle>
              <DialogDescription>
                Remplissez les informations du bagage pour générer un nouveau code QR.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="bag-passenger">Nom du Passager *</Label>
                <Input
                  id="bag-passenger"
                  placeholder="Ex: Amadou Diallo"
                  value={form.passenger}
                  onChange={(e) => setForm((f) => ({ ...f, passenger: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="bag-flight">N° Vol *</Label>
                  <Input
                    id="bag-flight"
                    placeholder="Ex: AF 722"
                    value={form.flightNumber}
                    onChange={(e) => setForm((f) => ({ ...f, flightNumber: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bag-pnr">PNR *</Label>
                  <Input
                    id="bag-pnr"
                    placeholder="Ex: XYZ123AB"
                    value={form.pnr}
                    onChange={(e) => setForm((f) => ({ ...f, pnr: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="bag-tag">N° Étiquette *</Label>
                  <Input
                    id="bag-tag"
                    placeholder="Ex: DSS-2024-009"
                    value={form.tagNumber}
                    onChange={(e) => setForm((f) => ({ ...f, tagNumber: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bag-weight">Poids (kg)</Label>
                  <Input
                    id="bag-weight"
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={form.weight || ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, weight: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bag-dest">Destination *</Label>
                <Select
                  value={form.destination}
                  onValueChange={(val) => setForm((f) => ({ ...f, destination: val }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner une destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_DESTINATIONS.map((dest) => (
                      <SelectItem key={dest} value={dest}>
                        {dest}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Annuler
              </Button>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleCreate}
                disabled={submitting}
              >
                {submitting ? 'Création...' : 'Créer QR'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total QR Générés"
          value={stats.total}
          icon={<QrCode className="size-6 text-orange-500" />}
          colorClass="text-orange-500"
          iconBgClass="bg-orange-50"
        />
        <StatCard
          title="QR Actifs"
          value={stats.active}
          icon={<CheckCircle className="size-6 text-orange-500" />}
          colorClass="text-orange-500"
          iconBgClass="bg-orange-50"
        />
        <StatCard
          title="QR Expirés"
          value={stats.expired}
          icon={<Clock className="size-6 text-amber-600" />}
          colorClass="text-amber-600"
          iconBgClass="bg-amber-50"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Liste des QR Bagages</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un bagage..."
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
                    <TableHead>Passager</TableHead>
                    <TableHead>N° Vol</TableHead>
                    <TableHead>PNR</TableHead>
                    <TableHead>N° Étiquette</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead className="text-right">Poids (kg)</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBaggage.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                        Aucun bagage trouvé.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBaggage.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.passenger}</TableCell>
                        <TableCell>{entry.flightNumber}</TableCell>
                        <TableCell className="font-mono text-xs">{entry.pnr}</TableCell>
                        <TableCell className="font-mono text-xs">{entry.tagNumber}</TableCell>
                        <TableCell>{entry.destination}</TableCell>
                        <TableCell className="text-right">{entry.weight}</TableCell>
                        <TableCell>
                          <StatusBadge status={entry.status} />
                        </TableCell>
                        <TableCell>{entry.expiration}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewQR(entry)}
                            className="text-orange-500 border-orange-200 hover:bg-orange-50"
                          >
                            <Eye className="size-3.5" />
                            Voir QR
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

      {/* View QR Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Code QR du Bagage</DialogTitle>
            <DialogDescription>
              Détails et code QR pour le bagage de{' '}
              {selectedBaggage?.passenger}
            </DialogDescription>
          </DialogHeader>
          {selectedBaggage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Passager:</span>
                  <p className="font-medium">{selectedBaggage.passenger}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">N° Vol:</span>
                  <p className="font-medium">{selectedBaggage.flightNumber}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">PNR:</span>
                  <p className="font-mono font-medium">{selectedBaggage.pnr}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Étiquette:</span>
                  <p className="font-mono font-medium">{selectedBaggage.tagNumber}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Destination:</span>
                  <p className="font-medium">{selectedBaggage.destination}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Poids:</span>
                  <p className="font-medium">{selectedBaggage.weight} kg</p>
                </div>
              </div>
              {/* QR Placeholder */}
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-orange-300 bg-orange-50/50 p-6">
                <QrCode className="size-24 text-orange-500" />
                <p className="text-sm font-medium text-orange-600">{selectedBaggage.tagNumber}</p>
                <StatusBadge status={selectedBaggage.status} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
