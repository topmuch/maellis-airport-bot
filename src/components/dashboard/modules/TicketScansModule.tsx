'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ScanLine, CheckCircle, XCircle, Clock, Search, Eye, BarChart3, Camera } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ── Types ───────────────────────────────────────────────────────────────────

interface TicketScan {
  id: string
  phone: string
  passengerName: string | null
  pnr: string | null
  flightNumber: string | null
  airline: string | null
  departureCode: string | null
  arrivalCode: string | null
  departureCity: string | null
  arrivalCity: string | null
  flightDate: string | null
  seat: string | null
  boardingTime: string | null
  gate: string | null
  terminal: string | null
  class: string | null
  rawText: string | null
  confidence: number
  provider: string
  status: 'pending' | 'confirmed' | 'rejected' | 'expired'
  confirmedAt: string | null
  rejectedAt: string | null
  source: string
  createdAt: string
  updatedAt: string
}

interface ScanStats {
  totalScans: number
  pendingScans: number
  confirmedScans: number
  rejectedScans: number
  expiredScans: number
  successRate: number
  avgConfidence: number
  topAirlines: { airline: string; count: number }[]
  topRoutes: { from: string; to: string; count: number }[]
  providerDistribution: { provider: string; count: number }[]
}

// ── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TicketScan['status'] }) {
  switch (status) {
    case 'pending':
      return (
        <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
          En attente
        </Badge>
      )
    case 'confirmed':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
          Confirmé
        </Badge>
      )
    case 'rejected':
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
          Rejeté
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

// ── Provider Badge ──────────────────────────────────────────────────────────

function ProviderBadge({ provider }: { provider: string }) {
  const p = provider.toLowerCase()
  if (p === 'mock') {
    return (
      <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100">
        Mock
      </Badge>
    )
  }
  if (p === 'tesseract') {
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
        Tesseract
      </Badge>
    )
  }
  if (p === 'google') {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
        Google Vision
      </Badge>
    )
  }
  return <Badge variant="secondary">{provider}</Badge>
}

// ── Confidence Bar ──────────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color =
    pct >= 80
      ? 'bg-emerald-500'
      : pct >= 50
        ? 'bg-orange-500'
        : 'bg-red-500'

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-muted">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-muted-foreground">{pct}%</span>
    </div>
  )
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

export function TicketScansModule() {
  const [scanList, setScanList] = useState<TicketScan[]>([])
  const [stats, setStats] = useState<ScanStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Dialog states
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedScan, setSelectedScan] = useState<TicketScan | null>(null)
  const [actionSubmitting, setActionSubmitting] = useState(false)

  // ── Data Fetching ───────────────────────────────────────────────────────

  const fetchScans = useCallback(async () => {
    setLoading(true)
    try {
      const [scansRes, statsRes] = await Promise.all([
        fetch('/api/ticket-scans'),
        fetch('/api/ticket-scans/stats'),
      ])

      if (scansRes.ok) {
        const scansData = await scansRes.json()
        const items = Array.isArray(scansData) ? scansData : (scansData.items ?? scansData.data ?? [])
        setScanList(items)
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
    } catch {
      // Silently handle – the empty state will display
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      await fetchScans()
      if (cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [fetchScans])

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleViewDetail = (scan: TicketScan) => {
    setSelectedScan(scan)
    setDetailOpen(true)
  }

  const handleConfirm = async () => {
    if (!selectedScan) return
    setActionSubmitting(true)
    try {
      const res = await fetch('/api/ticket-scans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedScan.id, action: 'confirm' }),
      })
      if (res.ok) {
        toast.success('Scan confirmé avec succès')
        setDetailOpen(false)
        fetchScans()
        return
      }
    } catch {
      // Proceed with local state update
    }

    // Local optimistic update
    setScanList((prev) =>
      prev.map((s) =>
        s.id === selectedScan.id
          ? { ...s, status: 'confirmed' as const, confirmedAt: new Date().toISOString() }
          : s
      )
    )
    toast.success('Scan confirmé avec succès')
    setDetailOpen(false)
    setActionSubmitting(false)
  }

  const handleReject = async () => {
    if (!selectedScan) return
    setActionSubmitting(true)
    try {
      const res = await fetch('/api/ticket-scans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedScan.id, action: 'reject' }),
      })
      if (res.ok) {
        toast.success('Scan rejeté avec succès')
        setDetailOpen(false)
        fetchScans()
        return
      }
    } catch {
      // Proceed with local state update
    }

    // Local optimistic update
    setScanList((prev) =>
      prev.map((s) =>
        s.id === selectedScan.id
          ? { ...s, status: 'rejected' as const, rejectedAt: new Date().toISOString() }
          : s
      )
    )
    toast.success('Scan rejeté avec succès')
    setDetailOpen(false)
    setActionSubmitting(false)
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const formatShortDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  // ── Filtered List ───────────────────────────────────────────────────────

  const filteredScans = scanList.filter((s) => {
    // Status filter
    if (statusFilter !== 'all' && s.status !== statusFilter) return false

    // Search filter
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      s.phone.toLowerCase().includes(q) ||
      (s.pnr?.toLowerCase().includes(q) ?? false) ||
      (s.flightNumber?.toLowerCase().includes(q) ?? false) ||
      (s.passengerName?.toLowerCase().includes(q) ?? false) ||
      (s.airline?.toLowerCase().includes(q) ?? false) ||
      (s.departureCode?.toLowerCase().includes(q) ?? false) ||
      (s.arrivalCode?.toLowerCase().includes(q) ?? false)
    )
  })

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Scans de Billets</h2>
          <p className="text-muted-foreground">
            Reconnaissance OCR des billets et cartes d&apos;embarquement
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Scans"
          value={stats?.totalScans ?? scanList.length}
          icon={<ScanLine className="size-6 text-orange-600 dark:text-orange-400" />}
          colorClass="text-orange-600 dark:text-orange-400"
          iconBgClass="bg-orange-100 dark:bg-orange-900/30"
        />
        <StatCard
          title="Confirmés"
          value={stats?.confirmedScans ?? scanList.filter((s) => s.status === 'confirmed').length}
          icon={<CheckCircle className="size-6 text-emerald-600 dark:text-emerald-400" />}
          colorClass="text-emerald-600 dark:text-emerald-400"
          iconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
        />
        <StatCard
          title="Rejetés"
          value={stats?.rejectedScans ?? scanList.filter((s) => s.status === 'rejected').length}
          icon={<XCircle className="size-6 text-red-600 dark:text-red-400" />}
          colorClass="text-red-600 dark:text-red-400"
          iconBgClass="bg-red-100 dark:bg-red-900/30"
        />
        <StatCard
          title="Confiance Moy."
          value={stats?.avgConfidence ?? 0}
          icon={<BarChart3 className="size-6 text-blue-600 dark:text-blue-400" />}
          colorClass="text-blue-600 dark:text-blue-400"
          iconBgClass="bg-blue-100 dark:bg-blue-900/30"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Liste des Scans</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:w-auto">
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Téléphone, PNR, vol..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="confirmed">Confirmé</SelectItem>
                  <SelectItem value="rejected">Rejeté</SelectItem>
                  <SelectItem value="expired">Expiré</SelectItem>
                </SelectContent>
              </Select>
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
                    <TableHead>Date</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>PNR</TableHead>
                    <TableHead>Vol</TableHead>
                    <TableHead>Compagnie</TableHead>
                    <TableHead>Trajet</TableHead>
                    <TableHead>Confiance</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredScans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                        Aucun scan trouvé.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredScans.map((scan) => (
                      <TableRow key={scan.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatShortDate(scan.createdAt)}
                        </TableCell>
                        <TableCell className="font-medium">{scan.phone}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {scan.pnr ?? '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {scan.flightNumber ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {scan.airline ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {scan.departureCode && scan.arrivalCode
                            ? `${scan.departureCode} → ${scan.arrivalCode}`
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <ConfidenceBar value={scan.confidence} />
                        </TableCell>
                        <TableCell>
                          <ProviderBadge provider={scan.provider} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={scan.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetail(scan)}
                            className="text-orange-500 border-orange-200 hover:bg-orange-50"
                          >
                            <Eye className="size-3.5" />
                            Détails
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

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="size-5 text-orange-500" />
              Détails du Scan
            </DialogTitle>
            <DialogDescription>
              Informations extraites par OCR du billet / carte d&apos;embarquement
            </DialogDescription>
          </DialogHeader>

          {selectedScan && (
            <div className="space-y-6">
              {/* Status & Confidence */}
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Statut :</span>
                  <StatusBadge status={selectedScan.status} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Confiance :</span>
                  <ConfidenceBar value={selectedScan.confidence} />
                </div>
              </div>

              {/* Passenger Info */}
              <div>
                <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Informations Passager
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nom :</span>
                    <p className="font-medium">{selectedScan.passengerName ?? 'Non extrait'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Téléphone :</span>
                    <p className="font-medium">{selectedScan.phone}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">PNR :</span>
                    <p className="font-mono font-medium">{selectedScan.pnr ?? 'Non extrait'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Classe :</span>
                    <p className="font-medium">{selectedScan.class ?? 'Non extrait'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Siège :</span>
                    <p className="font-medium">{selectedScan.seat ?? 'Non extrait'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Source :</span>
                    <p className="font-medium">{selectedScan.source}</p>
                  </div>
                </div>
              </div>

              {/* Flight Info */}
              <div>
                <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Informations Vol
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Compagnie :</span>
                    <p className="font-medium">{selectedScan.airline ?? 'Non extraite'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">N° Vol :</span>
                    <p className="font-mono font-medium">{selectedScan.flightNumber ?? 'Non extrait'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date du vol :</span>
                    <p className="font-medium">{formatDate(selectedScan.flightDate)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Heure embarquement :</span>
                    <p className="font-medium">{selectedScan.boardingTime ?? 'Non extrait'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Porte :</span>
                    <p className="font-medium">{selectedScan.gate ?? 'Non extraite'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Terminal :</span>
                    <p className="font-medium">{selectedScan.terminal ?? 'Non extrait'}</p>
                  </div>
                </div>

                {/* Route */}
                <div className="mt-3 flex items-center justify-center gap-4 rounded-lg border bg-orange-50/50 p-4 dark:bg-orange-950/20">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Départ</p>
                    <p className="text-lg font-bold">{selectedScan.departureCode ?? '???'}</p>
                    <p className="text-xs">{selectedScan.departureCity ?? ''}</p>
                  </div>
                  <div className="flex-1 border-t-2 border-dashed border-orange-300 mx-2 relative">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background px-2 text-xs text-muted-foreground">
                      ✈
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Arrivée</p>
                    <p className="text-lg font-bold">{selectedScan.arrivalCode ?? '???'}</p>
                    <p className="text-xs">{selectedScan.arrivalCity ?? ''}</p>
                  </div>
                </div>
              </div>

              {/* OCR Provider */}
              <div>
                <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Fournisseur OCR
                </h4>
                <div className="flex items-center gap-2">
                  <ProviderBadge provider={selectedScan.provider} />
                  <span className="text-xs text-muted-foreground">
                    Confidence : {Math.round(selectedScan.confidence * 100)}%
                  </span>
                </div>
              </div>

              {/* Raw OCR Text */}
              {selectedScan.rawText && (
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Texte OCR Brut
                  </h4>
                  <div className="rounded-lg border bg-muted/30 p-4 max-h-48 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-xs font-mono leading-relaxed">
                      {selectedScan.rawText}
                    </pre>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="text-xs text-muted-foreground border-t pt-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span>Créé le : </span>
                    <span>{formatDate(selectedScan.createdAt)}</span>
                  </div>
                  <div>
                    <span>Mis à jour : </span>
                    <span>{formatDate(selectedScan.updatedAt)}</span>
                  </div>
                  {selectedScan.confirmedAt && (
                    <div>
                      <span className="text-emerald-600">Confirmé le : </span>
                      <span className="text-emerald-600">{formatDate(selectedScan.confirmedAt)}</span>
                    </div>
                  )}
                  {selectedScan.rejectedAt && (
                    <div>
                      <span className="text-red-600">Rejeté le : </span>
                      <span className="text-red-600">{formatDate(selectedScan.rejectedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Fermer
            </Button>
            {selectedScan?.status === 'pending' && (
              <>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleConfirm}
                  disabled={actionSubmitting}
                >
                  <CheckCircle className="size-4" />
                  {actionSubmitting ? 'Confirmation...' : 'Confirmer'}
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleReject}
                  disabled={actionSubmitting}
                >
                  <XCircle className="size-4" />
                  {actionSubmitting ? 'Rejet...' : 'Rejeter'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
