'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ShieldAlert, Clock, CheckCircle, Heart, Shield, Flame, Baby, Wrench,
  AlertCircle, Plus, Phone, Trash2, Pencil, Star, Loader2,
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/components/auth/AuthGuard'

// ─── Types ───────────────────────────────────────────────────────

interface Incident {
  id: string
  userPhone: string
  userName: string | null
  userEmail?: string
  category: string
  location: string | null
  description: string
  severity: string
  status: string
  assignedTo: string | null
  createdAt: string
}

interface EmergencyContact {
  id: string
  category: string
  name: string
  phoneNumber: string
  whatsappNum?: string
  email?: string
  isPrimary?: boolean
  notes?: string
  airportCode?: string
  isActive?: boolean
}

// ─── Constants ──────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-700 border-red-200',
  high: 'bg-orange-500/15 text-orange-700 border-orange-200',
  medium: 'bg-amber-500/15 text-amber-700 border-amber-200',
  low: 'bg-gray-500/15 text-gray-700 border-gray-200',
}

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Critique', high: 'Élevée', medium: 'Moyenne', low: 'Faible',
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-red-500/15 text-red-700 border-red-200',
  acknowledged: 'bg-amber-500/15 text-amber-700 border-amber-200',
  in_progress: 'bg-amber-500/15 text-amber-700 border-amber-200',
  resolved: 'bg-green-500/15 text-green-700 border-green-200',
  escalated: 'bg-purple-500/15 text-purple-700 border-purple-200',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Ouverte', acknowledged: 'Prise en charge', in_progress: 'En cours',
  resolved: 'Résolue', escalated: 'Escaladée',
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  medical: Heart, security: Shield, fire: Flame, police: ShieldAlert,
  lost_child: Baby, maintenance: Wrench, other: AlertCircle,
}

const TYPE_LABELS: Record<string, string> = {
  medical: 'Médical', security: 'Sécurité', fire: 'Incendie',
  police: 'Police', lost_child: 'Enfant perdu', maintenance: 'Maintenance', other: 'Autre',
}

const CATEGORY_COLORS: Record<string, string> = {
  medical: 'bg-red-100 text-red-700', security: 'bg-orange-100 text-orange-700',
  fire: 'bg-red-100 text-red-800', police: 'bg-sky-100 text-sky-700',
  lost_child: 'bg-amber-100 text-amber-800', maintenance: 'bg-gray-100 text-gray-700',
  other: 'bg-gray-100 text-gray-600',
}

const CATEGORY_LABELS: Record<string, string> = {
  medical: 'Médical', security: 'Sécurité', fire: 'Pompiers',
  police: 'Police', lost_child: 'Enfant perdu', maintenance: 'Maintenance', other: 'Autre',
}

const CATEGORY_OPTIONS = [
  { value: 'medical', label: 'Médical' },
  { value: 'security', label: 'Sécurité' },
  { value: 'fire', label: 'Incendie' },
  { value: 'police', label: 'Police' },
  { value: 'lost_child', label: 'Enfant perdu' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Autre' },
]

// ─── Sub-components ─────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-red-500" />
    </div>
  )
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Icon className="mb-3 h-10 w-10 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <Badge className={SEVERITY_STYLES[severity] ?? ''} variant="outline">
      {SEVERITY_LABELS[severity] ?? severity}
    </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={STATUS_STYLES[status] ?? ''} variant="outline">
      {STATUS_LABELS[status] ?? status}
    </Badge>
  )
}

function TypeCell({ category }: { category: string }) {
  const Icon = TYPE_ICONS[category] ?? AlertCircle
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-red-500" />
      <span className="text-sm">{TYPE_LABELS[category] ?? category}</span>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════

export function EmergencyModule() {
  const { airportCode } = useAuth()
  // ── Incident state ─────────────────────────────────────────────
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loadingIncidents, setLoadingIncidents] = useState(true)
  const [alertDialogOpen, setAlertDialogOpen] = useState(false)
  const [alertSubmitting, setAlertSubmitting] = useState(false)

  const [formCategory, setFormCategory] = useState('medical')
  const [formUserName, setFormUserName] = useState('')
  const [formUserPhone, setFormUserPhone] = useState('')
  const [formUserEmail, setFormUserEmail] = useState('')
  const [formLocation, setFormLocation] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formSeverity, setFormSeverity] = useState('medium')

  // ── Contact state ──────────────────────────────────────────────
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null)
  const [contactSubmitting, setContactSubmitting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingContact, setDeletingContact] = useState<EmergencyContact | null>(null)

  const [cfCategory, setCfCategory] = useState('medical')
  const [cfName, setCfName] = useState('')
  const [cfPhone, setCfPhone] = useState('')
  const [cfWhatsapp, setCfWhatsapp] = useState('')
  const [cfEmail, setCfEmail] = useState('')
  const [cfIsPrimary, setCfIsPrimary] = useState(false)
  const [cfNotes, setCfNotes] = useState('')

  // ── Fetch incidents ────────────────────────────────────────────

  const fetchIncidents = useCallback(async () => {
    setLoadingIncidents(true)
    try {
      const result = await apiClient.get('/api/emergency/incidents')
      if (result.success) {
        const json = result.data as Record<string, unknown>
        const data = json.data ?? json
        setIncidents(Array.isArray(data) ? (data as Incident[]) : [])
      } else {
        setIncidents([])
      }
    } catch {
      setIncidents([])
    } finally {
      setLoadingIncidents(false)
    }
  }, [])

  // ── Fetch contacts ─────────────────────────────────────────────

  const fetchContacts = useCallback(async () => {
    setLoadingContacts(true)
    try {
      // Authenticated user's airport code from session
      const result = await apiClient.get(`/api/emergency/contacts?airport=${airportCode || 'DSS'}`)
      if (result.success) {
        const json = result.data as Record<string, unknown>
        const data = json.data ?? json ?? []
        setContacts(Array.isArray(data) ? (data as EmergencyContact[]) : [])
      } else {
        setContacts([])
      }
    } catch {
      setContacts([])
    } finally {
      setLoadingContacts(false)
    }
  }, [])

  useEffect(() => {
    fetchIncidents()
    fetchContacts()
  }, [fetchIncidents, fetchContacts])

  // ── Incident stats ─────────────────────────────────────────────

  const openCount = incidents.filter((i) => i.status === 'open').length
  const inProgressCount = incidents.filter(
    (i) => i.status === 'acknowledged' || i.status === 'in_progress' || i.status === 'escalated',
  ).length
  const resolvedCount = incidents.filter((i) => i.status === 'resolved').length

  // ── Incident handlers ──────────────────────────────────────────

  const resetAlertForm = () => {
    setFormCategory('medical')
    setFormUserName('')
    setFormUserPhone('')
    setFormUserEmail('')
    setFormLocation('')
    setFormDescription('')
    setFormSeverity('medium')
  }

  const handleCreateAlert = async () => {
    if (!formUserPhone.trim()) {
      toast.error('Le numéro de téléphone est requis')
      return
    }
    if (!formDescription.trim()) {
      toast.error('La description est requise')
      return
    }

    setAlertSubmitting(true)
    try {
      const result = await apiClient.post('/api/emergency/incidents', {
        // Authenticated user's airport code from session
        airportCode: airportCode || 'DSS',
        alertType: formCategory,
        userName: formUserName || undefined,
        userPhone: formUserPhone,
        userEmail: formUserEmail || undefined,
        location: formLocation || undefined,
        description: formDescription,
        severity: formSeverity,
      })

      if (result.success) {
        const json = result.data as Record<string, unknown>
        const created = ((json.data as Record<string, unknown>)?.incident ?? json.data ?? json) as Incident | undefined
        if (created) {
          setIncidents((prev) => [created, ...prev])
        }
        toast.success('Alerte créée avec succès')
        setAlertDialogOpen(false)
        resetAlertForm()
      } else {
        toast.error(result.error ?? "Erreur lors de la création de l'alerte")
      }
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.')
    } finally {
      setAlertSubmitting(false)
    }
  }

  const handleTakeCharge = async (id: string) => {
    try {
      const result = await apiClient.put(`/api/emergency/incidents/${id}`, { status: 'in_progress' })
      if (result.success) {
        setIncidents((prev) =>
          prev.map((i) => (i.id === id ? { ...i, status: 'in_progress' } : i)),
        )
        toast.success('Alerte prise en charge')
      } else {
        toast.error(result.error ?? 'Erreur réseau.')
      }
    } catch {
      toast.error('Erreur réseau.')
    }
  }

  const handleResolve = async (id: string) => {
    try {
      const result = await apiClient.put(`/api/emergency/incidents/${id}`, { status: 'resolved' })
      if (result.success) {
        setIncidents((prev) =>
          prev.map((i) => (i.id === id ? { ...i, status: 'resolved' } : i)),
        )
        toast.success('Alerte résolue')
      } else {
        toast.error(result.error ?? 'Erreur réseau.')
      }
    } catch {
      toast.error('Erreur réseau.')
    }
  }

  // ── Contact handlers ───────────────────────────────────────────

  const resetContactForm = () => {
    setCfCategory('medical')
    setCfName('')
    setCfPhone('')
    setCfWhatsapp('')
    setCfEmail('')
    setCfIsPrimary(false)
    setCfNotes('')
    setEditingContact(null)
  }

  const openCreateContact = () => {
    resetContactForm()
    setContactDialogOpen(true)
  }

  const openEditContact = (c: EmergencyContact) => {
    setEditingContact(c)
    setCfCategory(c.category)
    setCfName(c.name)
    setCfPhone(c.phoneNumber)
    setCfWhatsapp(c.whatsappNum ?? '')
    setCfEmail(c.email ?? '')
    setCfIsPrimary(c.isPrimary ?? false)
    setCfNotes(c.notes ?? '')
    setContactDialogOpen(true)
  }

  const handleSaveContact = async () => {
    if (!cfName.trim() || !cfPhone.trim()) {
      toast.error('Nom et numéro de téléphone sont requis')
      return
    }

    setContactSubmitting(true)
    try {
      const payload = {
        // Authenticated user's airport code from session
        airportCode: airportCode || 'DSS',
        category: cfCategory,
        name: cfName,
        phoneNumber: cfPhone,
        whatsappNum: cfWhatsapp || undefined,
        email: cfEmail || undefined,
        isPrimary: cfIsPrimary || undefined,
        notes: cfNotes || undefined,
      }

      const isEditing = editingContact !== null
      const url = isEditing
        ? `/api/emergency/contacts/${editingContact.id}`
        : '/api/emergency/contacts'
      const result = isEditing
        ? await apiClient.put(url, payload)
        : await apiClient.post(url, payload)

      if (result.success) {
        toast.success(isEditing ? 'Contact mis à jour' : 'Contact ajouté avec succès')
        setContactDialogOpen(false)
        resetContactForm()
        fetchContacts()
      } else {
        toast.error(result.error ?? "Erreur lors de l'opération")
      }
    } catch {
      toast.error('Erreur réseau.')
    } finally {
      setContactSubmitting(false)
    }
  }

  const confirmDeleteContact = (c: EmergencyContact) => {
    setDeletingContact(c)
    setDeleteDialogOpen(true)
  }

  const handleDeleteContact = async () => {
    if (!deletingContact) return

    try {
      const result = await apiClient.delete(`/api/emergency/contacts/${deletingContact.id}`)
      if (result.success) {
        toast.success('Contact supprimé')
        fetchContacts()
      } else {
        toast.error(result.error ?? 'Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur réseau.')
    } finally {
      setDeleteDialogOpen(false)
      setDeletingContact(null)
    }
  }

  const handleSetPrimary = async (c: EmergencyContact) => {
    try {
      const result = await apiClient.put(`/api/emergency/contacts/${c.id}/set-primary`)
      if (result.success) {
        toast.success(`${c.name} défini comme contact principal`)
        fetchContacts()
      } else {
        toast.error(result.error ?? 'Erreur réseau.')
      }
    } catch {
      toast.error('Erreur réseau.')
    }
  }

  // ── Action button visibility helpers ───────────────────────────

  const canTakeCharge = (status: string) =>
    status === 'open' || status === 'escalated'

  const canResolve = (status: string) =>
    status === 'open' || status === 'acknowledged' || status === 'in_progress' || status === 'escalated'

  // ══════════════════════════════════════════════════════════════
  // ── RENDER ────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Gestion d&apos;Urgence
        </h2>
        <p className="text-muted-foreground text-sm">
          Alertes SOS, contacts d&apos;urgence et situations critiques
        </p>
      </div>

      <Tabs defaultValue="alertes" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="alertes" className="gap-1.5">
            <ShieldAlert className="h-4 w-4" />
            <span className="hidden sm:inline">Alertes</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5">
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">Contacts</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════ TAB 1: Alertes ═══════════════════ */}
        <TabsContent value="alertes" className="space-y-6">
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100">
                  <ShieldAlert className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Ouvertes</p>
                  <p className="text-2xl font-bold text-red-600">{openCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">En cours</p>
                  <p className="text-2xl font-bold text-amber-600">{inProgressCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Résolues</p>
                  <p className="text-2xl font-bold text-green-600">{resolvedCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Incidents table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">
                  Toutes les alertes ({incidents.length})
                </CardTitle>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => setAlertDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Nouvelle Alerte</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingIncidents ? (
                <Spinner />
              ) : incidents.length === 0 ? (
                <EmptyState icon={ShieldAlert} message="Aucune alerte enregistrée." />
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Sévérité</TableHead>
                        <TableHead className="hidden md:table-cell">Lieu</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="hidden md:table-cell">Assigné à</TableHead>
                        <TableHead className="hidden lg:table-cell">Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incidents.map((incident) => (
                        <TableRow key={incident.id}>
                          <TableCell>
                            <TypeCell category={incident.category} />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">
                                {incident.userName || '—'}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {incident.userPhone}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <SeverityBadge severity={incident.severity} />
                          </TableCell>
                          <TableCell className="hidden max-w-[150px] truncate md:table-cell">
                            {incident.location || '—'}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={incident.status} />
                          </TableCell>
                          <TableCell className="hidden text-sm md:table-cell">
                            {incident.assignedTo || (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground text-sm lg:table-cell">
                            {format(new Date(incident.createdAt), 'dd/MM HH:mm', { locale: fr })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canTakeCharge(incident.status) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                                  onClick={() => handleTakeCharge(incident.id)}
                                >
                                  Prendre en charge
                                </Button>
                              )}
                              {canResolve(incident.status) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50"
                                  onClick={() => handleResolve(incident.id)}
                                >
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Résoudre
                                </Button>
                              )}
                              {incident.status === 'resolved' && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
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

        {/* ═══════════════════ TAB 2: Contacts ═══════════════════ */}
        <TabsContent value="contacts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">
                  Contacts d&apos;urgence ({contacts.length})
                </CardTitle>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  size="lg"
                  onClick={openCreateContact}
                >
                  <Plus className="h-5 w-5" />
                  <span className="hidden sm:inline ml-1">Ajouter un contact</span>
                  <span className="sm:hidden ml-1">Ajouter</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingContacts ? (
                <Spinner />
              ) : contacts.length === 0 ? (
                <EmptyState icon={Phone} message="Aucun contact d'urgence trouvé." />
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead className="hidden sm:table-cell">Téléphone</TableHead>
                        <TableHead className="hidden md:table-cell">WhatsApp</TableHead>
                        <TableHead className="hidden lg:table-cell">Email</TableHead>
                        <TableHead>Principal</TableHead>
                        <TableHead className="hidden sm:table-cell">Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>
                            <Badge
                              className={CATEGORY_COLORS[c.category] ?? 'bg-gray-100 text-gray-600'}
                              variant="secondary"
                            >
                              {CATEGORY_LABELS[c.category] ?? c.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden text-sm sm:table-cell">
                            {c.phoneNumber}
                          </TableCell>
                          <TableCell className="hidden text-sm md:table-cell">
                            {c.whatsappNum || '—'}
                          </TableCell>
                          <TableCell className="hidden text-sm lg:table-cell">
                            {c.email || '—'}
                          </TableCell>
                          <TableCell>
                            {c.isPrimary ? (
                              <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
                                <Star className="mr-1 size-3" />
                                Principal
                              </Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-muted-foreground hover:text-red-600"
                                onClick={() => handleSetPrimary(c)}
                              >
                                Définir
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {c.isActive !== false ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100" variant="outline">
                                Actif
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100" variant="outline">
                                Inactif
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => openEditContact(c)}
                              >
                                <Pencil className="size-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => confirmDeleteContact(c)}
                              >
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
      </Tabs>

      {/* ═══════════════════ CREATE ALERT DIALOG ═══════════════════ */}
      <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer une alerte</DialogTitle>
            <DialogDescription>
              Signalez une situation d&apos;urgence nécessitant une intervention immédiate.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Catégorie</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="alert-name">Nom</Label>
                <Input
                  id="alert-name"
                  placeholder="Nom complet"
                  value={formUserName}
                  onChange={(e) => setFormUserName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="alert-phone">
                  Téléphone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="alert-phone"
                  placeholder="+221 77 123 45 67"
                  value={formUserPhone}
                  onChange={(e) => setFormUserPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="alert-email">Email</Label>
              <Input
                id="alert-email"
                type="email"
                placeholder="email@example.sn"
                value={formUserEmail}
                onChange={(e) => setFormUserEmail(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="alert-location">Lieu</Label>
              <Input
                id="alert-location"
                placeholder="Terminal, porte, zone..."
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="alert-description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="alert-description"
                placeholder="Décrivez la situation d'urgence..."
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
            <Button variant="outline" onClick={() => setAlertDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleCreateAlert}
              disabled={alertSubmitting || !formUserPhone.trim() || !formDescription.trim()}
            >
              {alertSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {alertSubmitting ? 'Envoi en cours...' : "Créer l'alerte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ CREATE / EDIT CONTACT DIALOG ═══════════════════ */}
      <Dialog
        open={contactDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setContactDialogOpen(false)
            resetContactForm()
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Modifier le contact' : 'Ajouter un contact'}
            </DialogTitle>
            <DialogDescription>
              {/* Authenticated user's airport code from session */}
              Contact d&apos;urgence pour cet aéroport.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Catégorie</Label>
              <Select value={cfCategory} onValueChange={setCfCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cf-name">Nom</Label>
              <Input
                id="cf-name"
                placeholder="Ex: Dr. Seck"
                value={cfName}
                onChange={(e) => setCfName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="cf-phone">Téléphone</Label>
                <Input
                  id="cf-phone"
                  placeholder="+221 33 800 00 00"
                  value={cfPhone}
                  onChange={(e) => setCfPhone(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cf-whatsapp">WhatsApp</Label>
                <Input
                  id="cf-whatsapp"
                  placeholder="+221 77 000 00 00"
                  value={cfWhatsapp}
                  onChange={(e) => setCfWhatsapp(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cf-email">Email</Label>
              <Input
                id="cf-email"
                type="email"
                placeholder="contact@example.sn"
                value={cfEmail}
                onChange={(e) => setCfEmail(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="cf-primary"
                checked={cfIsPrimary}
                onCheckedChange={(checked) => setCfIsPrimary(checked === true)}
              />
              <Label htmlFor="cf-primary" className="cursor-pointer">
                Contact principal de cette catégorie
              </Label>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cf-notes">Notes</Label>
              <Textarea
                id="cf-notes"
                placeholder="Informations supplémentaires..."
                value={cfNotes}
                onChange={(e) => setCfNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setContactDialogOpen(false)
                resetContactForm()
              }}
            >
              Annuler
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleSaveContact}
              disabled={contactSubmitting || !cfName.trim() || !cfPhone.trim()}
            >
              {contactSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {contactSubmitting
                ? 'Enregistrement...'
                : editingContact
                  ? 'Mettre à jour'
                  : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ DELETE CONTACT CONFIRMATION ═══════════════════ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le contact</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le contact &laquo;&nbsp;
              {deletingContact?.name}&nbsp;&raquo;&nbsp;? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteContact}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
