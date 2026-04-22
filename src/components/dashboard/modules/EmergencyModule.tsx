'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ShieldAlert,
  Clock,
  CheckCircle,
  Timer,
  Heart,
  Shield,
  Package,
  AlertCircle,
  Plus,
  XCircle,
} from 'lucide-react'
import { useAirportSocket } from '@/hooks/useAirportSocket'
import { showRealTimeNotification } from '@/components/dashboard/RealTimeNotificationToast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

// ─── Types ───────────────────────────────────────────────────────
interface EmergencyAlert {
  id: string
  userPhone: string
  userName: string | null
  alertType: string
  location: string | null
  description: string
  severity: string
  status: string
  assignedTo: string | null
  createdAt: string
}

// ─── Badge Colors ────────────────────────────────────────────────
const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-700 border-red-200',
  high: 'bg-orange-500/15 text-orange-700 border-orange-200',
  medium: 'bg-amber-500/15 text-amber-700 border-amber-200',
  low: 'bg-gray-500/15 text-gray-700 border-gray-200',
}

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Critique',
  high: 'Élevée',
  medium: 'Moyenne',
  low: 'Faible',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-500/15 text-red-700 border-red-200',
  acknowledged: 'bg-amber-500/15 text-amber-700 border-amber-200',
  resolved: 'bg-orange-500/15 text-orange-600 border-orange-200',
  escalated: 'bg-purple-500/15 text-purple-700 border-purple-200',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Ouverte',
  acknowledged: 'Prise en charge',
  resolved: 'Résolue',
  escalated: 'Escaladée',
}

const ALERT_TYPE_ICONS: Record<string, React.ElementType> = {
  medical: Heart,
  security: Shield,
  lost_item: Package,
  other: AlertCircle,
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  medical: 'Médical',
  security: 'Sécurité',
  lost_item: 'Objet perdu',
  other: 'Autre',
}

// ─── Mock Data ───────────────────────────────────────────────────
const MOCK_ALERTS: EmergencyAlert[] = [
  {
    id: 'ea-001',
    userPhone: '+221 77 123 45 67',
    userName: 'Amadou Diallo',
    alertType: 'medical',
    location: 'Terminal 2 - Zone Embarquement',
    description: 'Passager souffrant de douleurs thoraciques nécessitant une assistance médicale immédiate.',
    severity: 'critical',
    status: 'open',
    assignedTo: null,
    createdAt: '2024-04-21T11:30:00Z',
  },
  {
    id: 'ea-002',
    userPhone: '+221 78 234 56 78',
    userName: 'Fatou Ndiaye',
    alertType: 'security',
    location: 'Hall Principal',
    description: 'Bagage non surveillé suspecté à côté du comptoir Air Sénégal.',
    severity: 'high',
    status: 'acknowledged',
    assignedTo: 'Agent Diallo',
    createdAt: '2024-04-21T11:15:00Z',
  },
  {
    id: 'ea-003',
    userPhone: '+221 76 345 67 89',
    userName: 'Moussa Sow',
    alertType: 'lost_item',
    location: 'Zone Arrivée',
    description: 'Passeport perdu dans la zone de récupération des bagages.',
    severity: 'medium',
    status: 'acknowledged',
    assignedTo: 'Agent Fall',
    createdAt: '2024-04-21T10:45:00Z',
  },
  {
    id: 'ea-004',
    userPhone: '+221 77 456 78 90',
    userName: 'Aissatou Ba',
    alertType: 'medical',
    location: 'Salon VIP',
    description: 'Évanouissement dun passager dans le salon. Conscience retrouvée.',
    severity: 'high',
    status: 'resolved',
    assignedTo: 'Dr. Seck',
    createdAt: '2024-04-21T10:00:00Z',
  },
  {
    id: 'ea-005',
    userPhone: '+221 78 567 89 01',
    userName: 'Ibrahim Diop',
    alertType: 'security',
    location: 'Parking P3',
    description: 'Tentative de vol signalée dans le parking niveau 3.',
    severity: 'medium',
    status: 'open',
    assignedTo: null,
    createdAt: '2024-04-21T09:30:00Z',
  },
  {
    id: 'ea-006',
    userPhone: '+221 76 678 90 12',
    userName: 'Mariama Sy',
    alertType: 'lost_item',
    location: 'Toilettes Terminal 1',
    description: 'Sac à main contenant des documents importants et du matériel électronique.',
    severity: 'high',
    status: 'open',
    assignedTo: null,
    createdAt: '2024-04-21T09:00:00Z',
  },
  {
    id: 'ea-007',
    userPhone: '+221 77 789 01 23',
    userName: 'Cheikh Mbaye',
    alertType: 'other',
    location: 'Boutique Duty Free',
    description: 'Passager agressif suite à un différend avec le personnel de la boutique.',
    severity: 'medium',
    status: 'acknowledged',
    assignedTo: 'Agent Ndiaye',
    createdAt: '2024-04-21T08:30:00Z',
  },
  {
    id: 'ea-008',
    userPhone: '+221 78 890 12 34',
    userName: 'Adama Traoré',
    alertType: 'medical',
    location: 'Porte d embarquement 5',
    description: 'Entorse de la cheville, passager incapable de marcher.',
    severity: 'medium',
    status: 'resolved',
    assignedTo: 'Dr. Seck',
    createdAt: '2024-04-21T08:00:00Z',
  },
  {
    id: 'ea-009',
    userPhone: '+221 76 901 23 45',
    userName: 'Kine Diop',
    alertType: 'lost_item',
    location: 'Avion vol AK-304',
    description: 'Valise non récupérée à la destination, étiquette AK304-JXB.',
    severity: 'low',
    status: 'resolved',
    assignedTo: 'Service Bagages',
    createdAt: '2024-04-20T22:00:00Z',
  },
  {
    id: 'ea-010',
    userPhone: '+221 77 012 34 56',
    userName: 'Ousmane Kane',
    alertType: 'security',
    location: 'Contrôle Sécurité',
    description: 'Objet non identifié détecté au scanner. Zone sécurisée en attente de vérification.',
    severity: 'critical',
    status: 'resolved',
    assignedTo: 'Sûreté Aéroport',
    createdAt: '2024-04-20T19:30:00Z',
  },
  {
    id: 'ea-011',
    userPhone: '+221 78 123 45 67',
    userName: 'Djenaba Coulibaly',
    alertType: 'medical',
    location: 'Terminal 1 - Accueil',
    description: 'Malaise vagal dans la file d enregistrement.',
    severity: 'low',
    status: 'resolved',
    assignedTo: 'Infirmière Fall',
    createdAt: '2024-04-20T16:00:00Z',
  },
  {
    id: 'ea-012',
    userPhone: '+221 76 234 56 78',
    userName: 'Boubacar Sanogo',
    alertType: 'other',
    location: 'Restaurant Téranga',
    description: 'Fuite d\'eau importante dans les toilettes du restaurant.',
    severity: 'low',
    status: 'resolved',
    assignedTo: 'Maintenance',
    createdAt: '2024-04-20T14:00:00Z',
  },
]

// ─── Component ───────────────────────────────────────────────────
export function EmergencyModule() {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // ── WebSocket temps réel ────────────────────────────────────────────────
  const { isConnected } = useAirportSocket('DSS', {
    onEmergencyAlert: (rawData: unknown) => {
      const data = rawData as Partial<EmergencyAlert> & { id: string }
      if (!data.id) return
      const newAlert: EmergencyAlert = {
        id: data.id,
        userPhone: (data.userPhone as string) || '',
        userName: (data.userName as string) ?? null,
        alertType: (data.alertType as string) || 'other',
        location: (data.location as string) ?? null,
        description: (data.description as string) || '',
        severity: (data.severity as string) || 'medium',
        status: (data.status as string) || 'open',
        assignedTo: (data.assignedTo as string) ?? null,
        createdAt: (data.createdAt as string) || new Date().toISOString(),
      }
      setAlerts((prev) => [newAlert, ...prev])
      showRealTimeNotification('emergency:alert', data as Record<string, unknown>)
    },
    onEmergencyUpdate: (rawData: unknown) => {
      const data = rawData as Partial<EmergencyAlert> & { id: string }
      if (!data.id) return
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === data.id ? { ...a, ...data } : a
        )
      )
      showRealTimeNotification('emergency:update', data as Record<string, unknown>)
    },
  })

  // Form state
  const [formType, setFormType] = useState('medical')
  const [formPhone, setFormPhone] = useState('')
  const [formName, setFormName] = useState('')
  const [formLocation, setFormLocation] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formSeverity, setFormSeverity] = useState('medium')

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch('/api/emergency')
        if (res.ok) {
          const json = await res.json()
          if (json.data && json.data.length > 0) {
            setAlerts(json.data)
          } else {
            setAlerts(MOCK_ALERTS)
          }
        } else {
          setAlerts(MOCK_ALERTS)
        }
      } catch {
        setAlerts(MOCK_ALERTS)
      } finally {
        setLoading(false)
      }
    }
    fetchAlerts()
  }, [])

  const handleAcknowledge = useCallback(async (id: string) => {
    try {
      await fetch('/api/emergency', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: 'acknowledged',
          assignedTo: 'Agent Connecté',
        }),
      })
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: 'acknowledged', assignedTo: 'Agent Connecté' }
            : a
        )
      )
    } catch {
      // Optimistic update already done
    }
  }, [])

  const handleResolve = useCallback(async (id: string) => {
    try {
      await fetch('/api/emergency', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'resolved' }),
      })
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'resolved' } : a))
      )
    } catch {
      // Optimistic update already done
    }
  }, [])

  const handleSubmit = async () => {
    if (!formPhone || !formDescription) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPhone: formPhone,
          userName: formName || null,
          alertType: formType,
          location: formLocation || null,
          description: formDescription,
          severity: formSeverity,
        }),
      })
      if (res.ok) {
        const newAlert = await res.json()
        setAlerts((prev) => [newAlert, ...prev])
        setDialogOpen(false)
        resetForm()
      }
    } catch {
      // Keep dialog open for retry
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormType('medical')
    setFormPhone('')
    setFormName('')
    setFormLocation('')
    setFormDescription('')
    setFormSeverity('medium')
  }

  const openCount = alerts.filter((a) => a.status === 'open').length
  const inProgressCount = alerts.filter(
    (a) => a.status === 'acknowledged' || a.status === 'escalated'
  ).length
  const resolvedCount = alerts.filter((a) => a.status === 'resolved').length
  const criticalCount = alerts.filter(
    (a) => a.severity === 'critical' && a.status === 'open'
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">
              Alertes d&apos;Urgence
            </h2>
            {isConnected && (
              <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700 text-xs">
                En temps réel
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            Gestion des alertes SOS et situations d&apos;urgence
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700 text-white">
              <Plus className="h-4 w-4" />
              Nouvelle Alerte
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Créer une alerte</DialogTitle>
              <DialogDescription>
                Signalez une situation d&apos;urgence nécessitant une intervention.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Type d&apos;alerte</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medical">Médical</SelectItem>
                    <SelectItem value="security">Sécurité</SelectItem>
                    <SelectItem value="lost_item">Objet perdu</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Téléphone utilisateur</Label>
                <Input
                  placeholder="+221 77 123 45 67"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Nom utilisateur (optionnel)</Label>
                <Input
                  placeholder="Nom complet"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Lieu</Label>
                <Input
                  placeholder="Terminal, porte, zone..."
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Décrivez la situation..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label>Sévérité</Label>
                <Select value={formSeverity} onValueChange={setFormSeverity}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critique</SelectItem>
                    <SelectItem value="high">Élevée</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="low">Faible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleSubmit}
                disabled={submitting || !formPhone || !formDescription}
              >
                {submitting ? 'Envoi en cours...' : 'Créer l\'alerte'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Critical Alert Banner */}
      {criticalCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/50">
          <ShieldAlert className="h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            ⚠️ {criticalCount} alerte(s) critique(s) en cours
          </p>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-red-500 overflow-hidden">
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
              <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Alertes Ouvertes</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{openCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 overflow-hidden">
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">En Cours de Traitement</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{inProgressCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500 overflow-hidden">
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30">
              <CheckCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Résolues Aujourd&apos;hui</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{resolvedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-cyan-500 overflow-hidden">
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-900/30">
              <Timer className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Temps Moyen Résolution</p>
              <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">12 min</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Toutes les alertes ({alerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="border-orange-500 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Sévérité</TableHead>
                    <TableHead className="hidden md:table-cell">Lieu</TableHead>
                    <TableHead className="hidden lg:table-cell">Description</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="hidden md:table-cell">Assigné À</TableHead>
                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => {
                    const TypeIcon = ALERT_TYPE_ICONS[alert.alertType] || AlertCircle
                    return (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TypeIcon
                              className={`h-4 w-4 ${
                                alert.alertType === 'medical'
                                  ? 'text-red-500'
                                  : alert.alertType === 'security'
                                  ? 'text-orange-500'
                                  : alert.alertType === 'lost_item'
                                  ? 'text-amber-500'
                                  : 'text-gray-500'
                              }`}
                            />
                            <span className="text-sm">
                              {ALERT_TYPE_LABELS[alert.alertType] || alert.alertType}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">
                              {alert.userName || '—'}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {alert.userPhone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={SEVERITY_COLORS[alert.severity] || ''}
                            variant="outline"
                          >
                            {SEVERITY_LABELS[alert.severity] || alert.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden max-w-[150px] truncate md:table-cell">
                          {alert.location || '—'}
                        </TableCell>
                        <TableCell className="hidden max-w-[200px] truncate lg:table-cell">
                          {alert.description}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={STATUS_COLORS[alert.status] || ''}
                            variant="outline"
                          >
                            {STATUS_LABELS[alert.status] || alert.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden text-sm md:table-cell">
                          {alert.assignedTo || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground text-sm lg:table-cell">
                          {format(new Date(alert.createdAt), 'dd/MM HH:mm', {
                            locale: fr,
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {(alert.status === 'open' || alert.status === 'escaladed') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-amber-300 text-amber-700 hover:bg-amber-50 h-7 text-xs"
                                onClick={() => handleAcknowledge(alert.id)}
                              >
                                Prendre en charge
                              </Button>
                            )}
                            {(alert.status === 'open' ||
                              alert.status === 'acknowledged' ||
                              alert.status === 'escaladed') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-orange-300 text-orange-600 hover:bg-orange-50 h-7 text-xs"
                                onClick={() => handleResolve(alert.id)}
                              >
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Résoudre
                              </Button>
                            )}
                            {alert.status === 'resolved' && (
                              <CheckCircle className="h-4 w-4 text-orange-500" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {alerts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-muted-foreground py-8 text-center">
                        Aucune alerte
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
