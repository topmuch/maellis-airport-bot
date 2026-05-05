'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  History, Download, Loader2, Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

// ─── Types ───────────────────────────────────────────────────────

interface BroadcastAlert {
  id: string
  title: string
  message: string
  level: string
  scope: string
  channels: string[]
  status: string
  scheduledAt: string | null
  sentAt: string | null
  expiresAt: string | null
  createdBy: string
  createdAt: string
  _count?: {
    deliveries: number
    acknowledgements: number
  }
}

interface AlertDetail {
  id: string
  title: string
  message: string
  level: string
  scope: string
  scopeFilter: Record<string, unknown> | null
  channels: string[]
  status: string
  scheduledAt: string | null
  sentAt: string | null
  expiresAt: string | null
  createdBy: string
  createdAt: string
  stats: {
    sent: number
    delivered: number
    read: number
    failed: number
    pending: number
    total: number
    acknowledged: number
  }
  deliveries: Array<{
    id: string
    userPhone: string
    userName: string | null
    channel: string
    status: string
    sentAt: string | null
    deliveredAt: string | null
    errorMessage: string | null
  }>
  acknowledgements: Array<{
    id: string
    userPhone: string
    userName: string | null
    response: string | null
    acknowledgedAt: string
  }>
  auditLogs: Array<{
    id: string
    action: string
    performedBy: string
    performedAt: string
    metadata: unknown
  }>
}

// ─── Constants ───────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  sending: 'bg-amber-100 text-amber-700 border-amber-200',
  sent: 'bg-green-100 text-green-700 border-green-200',
  expired: 'bg-gray-100 text-gray-500 border-gray-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  scheduled: 'Planifié',
  sending: 'Envoi en cours',
  sent: 'Envoyé',
  expired: 'Expiré',
  cancelled: 'Annulé',
}

const LEVEL_STYLES: Record<string, string> = {
  INFO: 'bg-blue-100 text-blue-700',
  WARNING: 'bg-amber-100 text-amber-700',
  CRITICAL: 'bg-red-100 text-red-700',
  EVACUATION: 'bg-red-200 text-red-900',
}

const LEVEL_LABELS: Record<string, string> = {
  INFO: 'Info',
  WARNING: 'Warning',
  CRITICAL: 'Critique',
  EVACUATION: 'Evacuation',
}

const SCOPE_LABELS: Record<string, string> = {
  ALL: 'Tous',
  TERMINAL_1: 'Terminal 1',
  TERMINAL_2: 'Terminal 2',
  FLIGHT: 'Vol',
  STAFF_ONLY: 'Personnel',
  PASSENGERS: 'Passagers',
}

// ════════════════════════════════════════════════════════════════
// EmergencyHistory — Past alerts with filters, details, CSV export
// ════════════════════════════════════════════════════════════════

interface EmergencyHistoryProps {
  onSelectAlert?: (alertId: string) => void
  refreshTrigger?: number
}

export function EmergencyHistory({ onSelectAlert, refreshTrigger }: EmergencyHistoryProps) {
  const [alerts, setAlerts] = useState<BroadcastAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
  const [filterStatus, setFilterStatus] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Detail modal
  const [selectedDetail, setSelectedDetail] = useState<AlertDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // ── Fetch alerts ───────────────────────────────────────────────
  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      if (filterLevel) params.set('level', filterLevel)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      params.set('page', String(page))
      params.set('limit', '20')

      const res = await fetch(`/api/broadcast/alerts?${params}`)
      if (res.ok) {
        const json = await res.json()
        setAlerts(json.data || [])
        setTotalPages(json.pagination?.totalPages || 1)
      }
    } catch {
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterLevel, dateFrom, dateTo, page])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts, refreshTrigger])

  // ── Fetch alert detail ─────────────────────────────────────────
  const openDetail = async (id: string) => {
    setDetailLoading(true)
    setSelectedDetail(null)
    try {
      const res = await fetch(`/api/broadcast/alerts/${id}`)
      if (res.ok) {
        const json = await res.json()
        setSelectedDetail(json.data)
      }
    } catch {
      // Silent fail
    } finally {
      setDetailLoading(false)
    }
  }

  // ── CSV Export ─────────────────────────────────────────────────
  const exportCSV = () => {
    if (alerts.length === 0) {
      toast.error('Aucune donnée à exporter')
      return
    }

    const headers = ['ID', 'Titre', 'Niveau', 'Périmètre', 'Statut', 'Canaux', 'Créé le', 'Envoyé le', 'Destinataires', 'Accusés']
    const rows = alerts.map((a) => [
      a.id,
      `"${a.title.replace(/"/g, '""')}"`,
      a.level,
      a.scope,
      a.status,
      Array.isArray(a.channels) ? a.channels.join(';') : '',
      a.createdAt ? format(new Date(a.createdAt), 'yyyy-MM-dd HH:mm:ss') : '',
      a.sentAt ? format(new Date(a.sentAt), 'yyyy-MM-dd HH:mm:ss') : '',
      a._count?.deliveries ?? 0,
      a._count?.acknowledgements ?? 0,
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `alertes_diffusion_${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Export CSV téléchargé')
  }

  // ── Reset filters ──────────────────────────────────────────────
  const resetFilters = () => {
    setFilterStatus('')
    setFilterLevel('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              Historique des alertes ({alerts.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportCSV} className="h-7 text-xs">
                <Download className="mr-1 h-3 w-3" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v === '__all__' ? '' : v); setPage(1) }}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous les statuts</SelectItem>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterLevel} onValueChange={(v) => { setFilterLevel(v === '__all__' ? '' : v); setPage(1) }}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Niveau" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous les niveaux</SelectItem>
                {Object.entries(LEVEL_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              className="w-[140px] h-8 text-xs"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              className="w-[140px] h-8 text-xs"
            />

            {(filterStatus || filterLevel || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs">
                Réinitialiser
              </Button>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <History className="mb-3 h-10 w-10 opacity-40" />
              <p className="text-sm">Aucune alerte trouvée</p>
            </div>
          ) : (
            <>
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Niveau</TableHead>
                      <TableHead>Titre</TableHead>
                      <TableHead className="hidden md:table-cell">Périmètre</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="hidden lg:table-cell">Canaux</TableHead>
                      <TableHead className="hidden sm:table-cell">Destinataires</TableHead>
                      <TableHead className="hidden lg:table-cell">Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((alert) => (
                      <TableRow
                        key={alert.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openDetail(alert.id)}
                      >
                        <TableCell>
                          <Badge className={`${LEVEL_STYLES[alert.level] || ''} text-[10px]`} variant="secondary">
                            {LEVEL_LABELS[alert.level] || alert.level}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="text-sm font-medium truncate">{alert.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {alert.message.slice(0, 60)}...
                          </p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {SCOPE_LABELS[alert.scope] || alert.scope}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_STYLES[alert.status] || ''} variant="outline">
                            {STATUS_LABELS[alert.status] || alert.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex gap-1">
                            {(Array.isArray(alert.channels) ? alert.channels : []).map((ch) => (
                              <Badge key={ch} variant="secondary" className="text-[10px]">
                                {ch}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">
                          {alert._count?.deliveries ?? 0}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                          {format(new Date(alert.createdAt), 'dd/MM HH:mm', { locale: fr })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {(alert.status === 'sent' || alert.status === 'sending') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onSelectAlert?.(alert.id)
                                }}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                openDetail(alert.id)
                              }}
                            >
                              Détails
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Précédent
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Page {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Suivant
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ═══════ Detail Modal ═══════ */}
      <Dialog open={!!selectedDetail || detailLoading} onOpenChange={() => setSelectedDetail(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : selectedDetail ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge className={LEVEL_STYLES[selectedDetail.level] || ''} variant="secondary">
                    {LEVEL_LABELS[selectedDetail.level] || selectedDetail.level}
                  </Badge>
                  <Badge className={STATUS_STYLES[selectedDetail.status] || ''} variant="outline">
                    {STATUS_LABELS[selectedDetail.status] || selectedDetail.status}
                  </Badge>
                </div>
                <DialogTitle>{selectedDetail.title}</DialogTitle>
                <DialogDescription>{selectedDetail.message}</DialogDescription>
              </DialogHeader>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Périmètre :</span>{' '}
                  {SCOPE_LABELS[selectedDetail.scope] || selectedDetail.scope}
                </div>
                <div>
                  <span className="text-muted-foreground">Canaux :</span>{' '}
                  {(Array.isArray(selectedDetail.channels) ? selectedDetail.channels : []).join(', ')}
                </div>
                <div>
                  <span className="text-muted-foreground">Créé le :</span>{' '}
                  {format(new Date(selectedDetail.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}
                </div>
                {selectedDetail.sentAt && (
                  <div>
                    <span className="text-muted-foreground">Envoyé le :</span>{' '}
                    {format(new Date(selectedDetail.sentAt), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}
                  </div>
                )}
                {selectedDetail.expiresAt && (
                  <div>
                    <span className="text-muted-foreground">Expire le :</span>{' '}
                    {format(new Date(selectedDetail.expiresAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </div>
                )}
              </div>

              {/* Stats */}
              {selectedDetail.stats && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-center">
                    <p className="text-lg font-bold text-green-600">{selectedDetail.stats.delivered}</p>
                    <p className="text-xs text-muted-foreground">Livrés</p>
                  </div>
                  <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-3 text-center">
                    <p className="text-lg font-bold text-purple-600">{selectedDetail.stats.acknowledged}</p>
                    <p className="text-xs text-muted-foreground">Accusés</p>
                  </div>
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-center">
                    <p className="text-lg font-bold text-red-600">{selectedDetail.stats.failed}</p>
                    <p className="text-xs text-muted-foreground">Échecs</p>
                  </div>
                </div>
              )}

              {/* Audit Logs */}
              {selectedDetail.auditLogs && selectedDetail.auditLogs.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Journal d&apos;audit</h4>
                  <div className="space-y-1">
                    {selectedDetail.auditLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between rounded border px-3 py-1.5 text-xs">
                        <span className="font-medium">{log.action}</span>
                        <span className="text-muted-foreground">
                          {format(new Date(log.performedAt), 'dd/MM HH:mm:ss', { locale: fr })}
                          {' — '}
                          {log.performedBy === 'system' ? 'Système' : log.performedBy.slice(0, 8)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Acknowledgements */}
              {selectedDetail.acknowledgements && selectedDetail.acknowledgements.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">
                    Accusés de réception ({selectedDetail.acknowledgements.length})
                  </h4>
                  <div className="space-y-1">
                    {selectedDetail.acknowledgements.map((ack) => (
                      <div key={ack.id} className="flex items-center justify-between rounded border px-3 py-1.5 text-xs">
                        <div>
                          <span className="font-medium">{ack.userName || ack.userPhone}</span>
                          {ack.response && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">
                              {ack.response}
                            </Badge>
                          )}
                        </div>
                        <span className="text-muted-foreground">
                          {format(new Date(ack.acknowledgedAt), 'HH:mm:ss', { locale: fr })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
