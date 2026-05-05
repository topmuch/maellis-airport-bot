'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  BarChart3, Send, CheckCircle2, XCircle, Clock, Users,
  Ban, Loader2, RefreshCw, MessageSquare, Smartphone, Monitor,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/components/auth/AuthGuard'

// ─── Types ───────────────────────────────────────────────────────

interface AlertStats {
  alertId: string
  alertStatus: string
  sentAt: string | null
  expiresAt: string | null
  total: number
  pending: number
  sent: number
  delivered: number
  read: number
  failed: number
  acknowledged: number
  progressPercent: number
  byChannel: Record<string, { total: number; delivered: number; failed: number }>
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

// Level styles used for reference in channel config
// LEVEL_STYLES and LEVEL_LABELS are available for future use

// ════════════════════════════════════════════════════════════════
// EmergencyMonitor — Real-time monitoring dashboard
// ════════════════════════════════════════════════════════════════

interface EmergencyMonitorProps {
  alertId: string | null
}

export function EmergencyMonitor({ alertId }: EmergencyMonitorProps) {
  const { role } = useAuth()
  const [stats, setStats] = useState<AlertStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isSuperAdmin = role === 'SUPERADMIN'

  // ── Fetch stats ────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    if (!alertId) return

    try {
      const res = await fetch(`/api/broadcast/alerts/${alertId}/stats`)
      if (res.ok) {
        const json = await res.json()
        setStats(json.data)
      }
    } catch {
      // Silent fail for polling
    }
  }, [alertId])

  useEffect(() => {
    if (!alertId) {
      setStats(null)
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      return
    }

    setLoading(true)
    fetchStats().finally(() => setLoading(false))

    // Poll every 3 seconds for real-time updates
    pollingRef.current = setInterval(fetchStats, 3000)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [alertId, fetchStats])

  // ── Cancel alert ───────────────────────────────────────────────
  const handleCancel = async () => {
    if (!alertId || !isSuperAdmin) return

    setCancelling(true)
    try {
      const res = await fetch(`/api/broadcast/alerts/${alertId}/cancel`, {
        method: 'POST',
      })

      if (res.ok) {
        toast.success('Alerte annulée')
        fetchStats()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || "Erreur lors de l'annulation")
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setCancelling(false)
    }
  }

  // ── Can cancel? (within 60 seconds of sending) ─────────────────
  const canCancel = stats && stats.alertStatus === 'sent' && stats.sentAt
    ? Date.now() - new Date(stats.sentAt).getTime() < 60_000
    : stats?.alertStatus === 'sending'

  if (!alertId) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <BarChart3 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Sélectionnez une alerte envoyée pour voir son monitoring en temps réel
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Aucune statistique disponible</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-amber-500" />
          <h3 className="text-sm font-semibold">Monitoring en temps réel</h3>
          {stats.alertStatus === 'sending' && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              Envoi en cours...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchStats}
            className="h-7 text-xs"
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Rafraîchir
          </Button>
          {canCancel && isSuperAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={cancelling}
              className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
            >
              {cancelling ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Ban className="mr-1 h-3 w-3" />
              )}
              Annuler
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Progression de la livraison
            </span>
            <span className="text-lg font-bold text-amber-600">
              {stats.progressPercent}%
            </span>
          </div>
          <Progress value={stats.progressPercent} className="h-3" />
          <p className="text-xs text-muted-foreground mt-1">
            {stats.delivered + stats.read} / {stats.total} livrés
          </p>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="flex items-center gap-3 p-3">
            <Clock className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-xs text-muted-foreground">En attente</p>
              <p className="text-lg font-bold">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-400">
          <CardContent className="flex items-center gap-3 p-3">
            <Send className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Envoyés</p>
              <p className="text-lg font-bold">{stats.sent}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-400">
          <CardContent className="flex items-center gap-3 p-3">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Livrés</p>
              <p className="text-lg font-bold">{stats.delivered}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-400">
          <CardContent className="flex items-center gap-3 p-3">
            <Users className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-xs text-muted-foreground">Accusés</p>
              <p className="text-lg font-bold">{stats.acknowledged}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-400">
          <CardContent className="flex items-center gap-3 p-3">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-xs text-muted-foreground">Échecs</p>
              <p className="text-lg font-bold">{stats.failed}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Breakdown */}
      {stats.byChannel && Object.keys(stats.byChannel).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Répartition par canal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {Object.entries(stats.byChannel).map(([channel, data]) => {
                const channelConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
                  dashboard: { icon: Monitor, label: 'Dashboard', color: 'text-blue-500' },
                  whatsapp: { icon: MessageSquare, label: 'WhatsApp', color: 'text-green-500' },
                  sms: { icon: Smartphone, label: 'SMS', color: 'text-amber-500' },
                }
                const config = channelConfig[channel] || { icon: Monitor, label: channel, color: 'text-gray-500' }
                const Icon = config.icon

                return (
                  <div key={channel} className="flex items-center gap-3 rounded-lg border p-3">
                    <Icon className={`h-5 w-5 ${config.color}`} />
                    <div>
                      <p className="text-sm font-medium">{config.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {data.delivered}/{data.total} livrés
                        {data.failed > 0 && (
                          <span className="text-red-500 ml-1">({data.failed} échecs)</span>
                        )}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert Meta */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {stats.sentAt && (
              <span>Envoyé : {format(new Date(stats.sentAt), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}</span>
            )}
            {stats.expiresAt && (
              <span>Expire : {format(new Date(stats.expiresAt), 'dd/MM/yyyy HH:mm', { locale: fr })}</span>
            )}
            <Badge className={STATUS_STYLES[stats.alertStatus] || ''} variant="outline">
              {STATUS_LABELS[stats.alertStatus] || stats.alertStatus}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
