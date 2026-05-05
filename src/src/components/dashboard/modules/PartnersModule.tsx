'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Handshake, Users, CheckCircle, Clock, Plus, Eye, Pencil, Trash2,
  Building2, UserPlus, Percent, Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
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

interface Partner {
  id: string
  airportCode: string
  type: string
  name: string
  email: string
  phone: string
  contactPerson: string
  commissionRate: number
  contractStart?: string
  contractEnd?: string
  status: string
  isActive: boolean
  activatedAt?: string
  logoUrl?: string
  notes?: string
  createdAt: string
  usersCount?: number
}

interface PartnerUser {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  phone: string
  lastLogin?: string
  createdAt: string
}

interface CommissionData {
  partnerId: string
  month: string
  transportBookings: number
  loungeBookings: number
  totalBookings: number
  totalRevenue: number
  totalCommission: number
  commissionRate: number
  details: { transport: Record<string, unknown>; lounge: Record<string, unknown> }
}

interface PartnerForm {
  name: string
  type: string
  email: string
  phone: string
  contactPerson: string
  airportCode: string
  commissionRate: number
  contractStart: string
  contractEnd: string
  notes: string
  sendInvitation: boolean
}

interface InviteUserForm {
  email: string
  name: string
  role: string
}

// ── Constants ───────────────────────────────────────────────────────────────

const AIRPORT_OPTIONS = [
  { value: 'DSS', label: 'DSS — Aéroport AIBD Dakar' },
  { value: 'ABJ', label: 'ABJ — Aéroport Félix Houphouët-Boigny' },
  { value: 'BKO', label: 'BKO — Aéroport Modibo Keita' },
  { value: 'LOS', label: 'LOS — Aéroport Murtala Muhammed' },
  { value: 'ACC', label: 'ACC — Aéroport Kotoka' },
]

const TYPE_OPTIONS = [
  { value: 'TRAVEL_AGENCY', label: 'Agence de Voyage' },
  { value: 'AIRLINE', label: 'Compagnie Aérienne' },
  { value: 'SERVICE_PROVIDER', label: 'Prestataire de Service' },
]

const ROLE_OPTIONS = [
  { value: 'agent', label: 'Agent' },
  { value: 'manager', label: 'Manager' },
]

const DEFAULT_PARTNER_FORM: PartnerForm = {
  name: '',
  type: 'TRAVEL_AGENCY',
  email: '',
  phone: '',
  contactPerson: '',
  airportCode: 'DSS',
  commissionRate: 0,
  contractStart: '',
  contractEnd: '',
  notes: '',
  sendInvitation: false,
}

const DEFAULT_INVITE_FORM: InviteUserForm = {
  email: '',
  name: '',
  role: 'agent',
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA'
}

// ── Badge Components ────────────────────────────────────────────────────────

function PartnerTypeBadge({ type }: { type: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    TRAVEL_AGENCY: { cls: 'bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100', label: 'Agence de Voyage' },
    AIRLINE: { cls: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100', label: 'Compagnie Aérienne' },
    SERVICE_PROVIDER: { cls: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100', label: 'Prestataire' },
  }
  const cfg = map[type] ?? { cls: '', label: type }
  return <Badge className={cfg.cls}>{cfg.label}</Badge>
}

function PartnerStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    pending: { cls: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100', label: 'En attente' },
    active: { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100', label: 'Actif' },
    inactive: { cls: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100', label: 'Inactif' },
  }
  const cfg = map[status] ?? { cls: '', label: status }
  return <Badge className={cfg.cls}>{cfg.label}</Badge>
}

function UserRoleBadge({ role }: { role: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    admin: { cls: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100', label: 'Admin' },
    manager: { cls: 'bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100', label: 'Manager' },
    agent: { cls: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100', label: 'Agent' },
  }
  const cfg = map[role] ?? { cls: '', label: role }
  return <Badge className={cfg.cls}>{cfg.label}</Badge>
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
      <Handshake className="size-10 mb-3 opacity-40" />
      <p>{message}</p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

export function PartnersModule() {
  // ── Data ──────────────────────────────────────────────────────────────────
  const [partners, setPartners] = useState<Partner[]>([])
  const [loadingPartners, setLoadingPartners] = useState(true)
  const [searchPartners, setSearchPartners] = useState('')

  // ── Partner CRUD dialog ────────────────────────────────────────────────────
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false)
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null)
  const [partnerForm, setPartnerForm] = useState<PartnerForm>(DEFAULT_PARTNER_FORM)
  const [partnerSubmitting, setPartnerSubmitting] = useState(false)

  // ── Partner delete dialog ──────────────────────────────────────────────────
  const [deletePartnerDialogOpen, setDeletePartnerDialogOpen] = useState(false)
  const [deletingPartner, setDeletingPartner] = useState<Partner | null>(null)

  // ── Users sub-dialog ───────────────────────────────────────────────────────
  const [usersDialogOpen, setUsersDialogOpen] = useState(false)
  const [usersPartner, setUsersPartner] = useState<Partner | null>(null)
  const [partnerUsers, setPartnerUsers] = useState<PartnerUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // ── Invite user ────────────────────────────────────────────────────────────
  const [inviteForm, setInviteForm] = useState<InviteUserForm>(DEFAULT_INVITE_FORM)
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)

  // ── Commission tab ─────────────────────────────────────────────────────────
  const [commissionPartnerId, setCommissionPartnerId] = useState('')
  const [commissionMonth, setCommissionMonth] = useState(
    () => {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    },
  )
  const [commissionData, setCommissionData] = useState<CommissionData | null>(null)
  const [loadingCommission, setLoadingCommission] = useState(false)

  // ── Fetch Partners ─────────────────────────────────────────────────────────

  const fetchPartners = useCallback(async () => {
    setLoadingPartners(true)
    try {
      const result = await apiClient.get('/api/partners?airport=DSS')
      if (result.success) {
        if (result.success && Array.isArray((result.data as { data?: Partner[] }).data)) {
          setPartners((result.data as { data: Partner[] }).data)
        } else {
          setPartners([])
        }
      } else {
        setPartners([])
      }
    } catch {
      setPartners([])
    } finally {
      setLoadingPartners(false)
    }
  }, [])

  useEffect(() => {
    fetchPartners()
  }, [fetchPartners])

  // ── Partner CRUD handlers ──────────────────────────────────────────────────

  const openCreatePartner = () => {
    setEditingPartner(null)
    setPartnerForm(DEFAULT_PARTNER_FORM)
    setPartnerDialogOpen(true)
  }

  const openEditPartner = (partner: Partner) => {
    setEditingPartner(partner)
    setPartnerForm({
      name: partner.name,
      type: partner.type,
      email: partner.email,
      phone: partner.phone,
      contactPerson: partner.contactPerson,
      airportCode: partner.airportCode,
      commissionRate: partner.commissionRate,
      contractStart: partner.contractStart ? partner.contractStart.split('T')[0] : '',
      contractEnd: partner.contractEnd ? partner.contractEnd.split('T')[0] : '',
      notes: partner.notes ?? '',
      sendInvitation: false,
    })
    setPartnerDialogOpen(true)
  }

  const handleSavePartner = async () => {
    if (!partnerForm.name.trim()) {
      toast.error('Le nom du partenaire est requis')
      return
    }
    if (!partnerForm.email.trim()) {
      toast.error("L'email est requis")
      return
    }
    if (!partnerForm.phone.trim()) {
      toast.error('Le téléphone est requis')
      return
    }
    if (!partnerForm.contactPerson.trim()) {
      toast.error('Le contact principal est requis')
      return
    }
    if (!partnerForm.type) {
      toast.error('Le type de partenaire est requis')
      return
    }
    if (!partnerForm.airportCode) {
      toast.error("Le code aéroport est requis")
      return
    }

    setPartnerSubmitting(true)
    try {
      const payload = {
        airportCode: partnerForm.airportCode,
        type: partnerForm.type,
        name: partnerForm.name,
        email: partnerForm.email,
        phone: partnerForm.phone,
        contactPerson: partnerForm.contactPerson,
        commissionRate: partnerForm.commissionRate || undefined,
        contractStart: partnerForm.contractStart || undefined,
        contractEnd: partnerForm.contractEnd || undefined,
        notes: partnerForm.notes || undefined,
        sendInvitation: partnerForm.sendInvitation,
      }

      const result = editingPartner
        ? await apiClient.put(`/api/partners/${editingPartner.id}`, payload)
        : await apiClient.post('/api/partners', payload)

      if (result.success) {
        toast.success(editingPartner ? 'Partenaire mis à jour avec succès' : 'Partenaire créé avec succès')
        setPartnerDialogOpen(false)
        fetchPartners()
      } else {
        toast.error(result.error ?? "Erreur lors de l'opération")
      }
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.')
    } finally {
      setPartnerSubmitting(false)
    }
  }

  const confirmDeletePartner = (partner: Partner) => {
    setDeletingPartner(partner)
    setDeletePartnerDialogOpen(true)
  }

  const handleDeletePartner = async () => {
    if (!deletingPartner) return
    try {
      const result = await apiClient.delete(`/api/partners/${deletingPartner.id}`)
      if (result.success) {
        toast.success('Partenaire désactivé avec succès')
        fetchPartners()
      } else {
        toast.error(result.error ?? 'Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.')
    } finally {
      setDeletePartnerDialogOpen(false)
      setDeletingPartner(null)
    }
  }

  // ── Users handlers ─────────────────────────────────────────────────────────

  const openUsersDialog = async (partner: Partner) => {
    setUsersPartner(partner)
    setPartnerUsers([])
    setShowInviteForm(false)
    setInviteForm(DEFAULT_INVITE_FORM)
    setUsersDialogOpen(true)
    setLoadingUsers(true)
    try {
      const result = await apiClient.get(`/api/partners/${partner.id}/users`)
      if (result.success) {
        if (result.success && Array.isArray((result.data as { data?: PartnerUser[] }).data)) {
          setPartnerUsers((result.data as { data: PartnerUser[] }).data)
        } else {
          setPartnerUsers([])
        }
      } else {
        setPartnerUsers([])
      }
    } catch {
      setPartnerUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleInviteUser = async () => {
    if (!usersPartner) return
    if (!inviteForm.email.trim()) {
      toast.error("L'email est requis")
      return
    }
    if (!inviteForm.name.trim()) {
      toast.error('Le nom est requis')
      return
    }

    setInviteSubmitting(true)
    try {
      const result = await apiClient.post('/api/partners/invite-user', {
        partnerId: usersPartner.id,
        email: inviteForm.email,
        name: inviteForm.name,
        role: inviteForm.role || undefined,
      })
      if (result.success) {
        const json = result.data as { message?: string }
        toast.success(json.message ?? 'Invitation envoyée avec succès')
        setInviteForm(DEFAULT_INVITE_FORM)
        setShowInviteForm(false)
        // Re-fetch users list
        openUsersDialog(usersPartner)
      } else {
        toast.error(result.error ?? "Erreur lors de l'envoi de l'invitation")
      }
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.')
    } finally {
      setInviteSubmitting(false)
    }
  }

  // ── Commission handlers ────────────────────────────────────────────────────

  const handleFetchCommission = async () => {
    if (!commissionPartnerId) {
      toast.error('Veuillez sélectionner un partenaire')
      return
    }
    if (!commissionMonth) {
      toast.error('Veuillez sélectionner un mois')
      return
    }

    setLoadingCommission(true)
    setCommissionData(null)
    try {
      const result = await apiClient.get(`/api/partners/${commissionPartnerId}/commissions?month=${commissionMonth}`)
      if (result.success && result.data) {
        setCommissionData(result.data as CommissionData)
      } else if (!result.success) {
        toast.error(result.error ?? 'Erreur lors du calcul des commissions')
      } else {
        toast.error('Aucune donnée de commission trouvée pour cette période')
      }
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.')
    } finally {
      setLoadingCommission(false)
    }
  }

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filteredPartners = partners.filter((p) => {
    if (!searchPartners) return true
    const q = searchPartners.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.contactPerson.toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q)
    )
  })

  // ── Stats ──────────────────────────────────────────────────────────────────

  const activeCount = partners.filter((p) => p.status === 'active').length
  const pendingCount = partners.filter((p) => p.status === 'pending').length

  // ══════════════════════════════════════════════════════════════════════════
  // ── RENDER ────────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Gestion des Partenaires</h2>
        <p className="text-muted-foreground text-sm">Agences de voyage, compagnies aériennes et prestataires</p>
      </div>

      <Tabs defaultValue="partenaires" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="partenaires" className="gap-1.5">
            <Handshake className="h-4 w-4" />
            <span className="hidden sm:inline">Partenaires</span>
          </TabsTrigger>
          <TabsTrigger value="commissions" className="gap-1.5">
            <Percent className="h-4 w-4" />
            <span className="hidden sm:inline">Commissions</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════ TAB 1: Partenaires ═══════════════════ */}
        <TabsContent value="partenaires" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard title="Total Partenaires" value={partners.length} icon={<Handshake className="size-6 text-orange-600 dark:text-orange-400" />} colorClass="text-orange-600 dark:text-orange-400" iconBgClass="bg-orange-100 dark:bg-orange-900/30" />
            <StatCard title="Actifs" value={activeCount} icon={<CheckCircle className="size-6 text-emerald-600 dark:text-emerald-400" />} colorClass="text-emerald-600 dark:text-emerald-400" iconBgClass="bg-emerald-100 dark:bg-emerald-900/30" />
            <StatCard title="En Attente" value={pendingCount} icon={<Clock className="size-6 text-amber-600 dark:text-amber-400" />} colorClass="text-amber-600 dark:text-amber-400" iconBgClass="bg-amber-100 dark:bg-amber-900/30" />
          </div>

          {/* Partners table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Liste des Partenaires ({partners.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Rechercher..." className="pl-9 h-9 text-sm" value={searchPartners} onChange={(e) => setSearchPartners(e.target.value)} />
                  </div>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={openCreatePartner}>
                    <Plus className="size-4" />
                    <span className="hidden sm:inline ml-1">Ajouter un partenaire</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPartners ? <Spinner /> : filteredPartners.length === 0 ? (
                <EmptyState message="Aucun partenaire trouvé. Ajoutez votre premier partenaire." />
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="hidden md:table-cell">Contact</TableHead>
                        <TableHead className="hidden sm:table-cell text-right">Commission</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPartners.map((partner) => (
                        <TableRow key={partner.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{partner.name}</p>
                              <p className="text-xs text-muted-foreground">{partner.email}</p>
                            </div>
                          </TableCell>
                          <TableCell><PartnerTypeBadge type={partner.type} /></TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div>
                              <p className="text-sm">{partner.contactPerson}</p>
                              <p className="text-xs text-muted-foreground">{partner.phone}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-right text-sm">
                            {partner.commissionRate > 0 ? `${partner.commissionRate}%` : '—'}
                          </TableCell>
                          <TableCell><PartnerStatusBadge status={partner.status} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="outline" size="sm" className="h-7 text-xs text-sky-500 border-sky-200 hover:bg-sky-50" onClick={() => openUsersDialog(partner)} title="Voir les utilisateurs">
                                <Users className="size-3" />
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 text-xs text-orange-500 border-orange-200 hover:bg-orange-50" onClick={() => openEditPartner(partner)}>
                                <Pencil className="size-3" />
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50" onClick={() => confirmDeletePartner(partner)}>
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

        {/* ═══════════════════ TAB 2: Commissions ═══════════════════ */}
        <TabsContent value="commissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Calcul des Commissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Partenaire</Label>
                  <Select value={commissionPartnerId} onValueChange={setCommissionPartnerId}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un partenaire" /></SelectTrigger>
                    <SelectContent>
                      {partners.filter((p) => p.status === 'active').map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.type === 'TRAVEL_AGENCY' ? 'Agence' : p.type === 'AIRLINE' ? 'Compagnie' : 'Prestataire'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Mois</Label>
                  <Input type="month" value={commissionMonth} onChange={(e) => setCommissionMonth(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white w-full" onClick={handleFetchCommission} disabled={loadingCommission}>
                    {loadingCommission ? 'Calcul en cours...' : 'Calculer'}
                  </Button>
                </div>
              </div>

              {loadingCommission && <Spinner />}

              {commissionData && !loadingCommission && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
                  <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Réservations totales</p>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{commissionData.totalBookings}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building2 className="size-3" /> Transport
                      </p>
                      <p className="text-xl font-bold">{commissionData.transportBookings} réservations</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building2 className="size-3" /> Lounge
                      </p>
                      <p className="text-xl font-bold">{commissionData.loungeBookings} réservations</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Revenu total</p>
                      <p className="text-xl font-bold">{formatPrice(commissionData.totalRevenue)}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-sky-200 bg-sky-50/50 dark:bg-sky-950/20">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Taux de commission</p>
                      <p className="text-xl font-bold text-sky-600 dark:text-sky-400">{commissionData.commissionRate}%</p>
                    </CardContent>
                  </Card>
                  <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Commission totale</p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatPrice(commissionData.totalCommission)}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {!commissionData && !loadingCommission && commissionPartnerId && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Percent className="size-10 mb-3 opacity-40" />
                  <p>Cliquez sur &laquo; Calculer &raquo; pour afficher les commissions.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════ PARTNER CREATE/EDIT DIALOG ═══════════════════ */}
      <Dialog open={partnerDialogOpen} onOpenChange={(open) => { if (!open) setPartnerDialogOpen(false) }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPartner ? 'Modifier le Partenaire' : 'Ajouter un Partenaire'}</DialogTitle>
            <DialogDescription>{editingPartner ? 'Modifiez les informations du partenaire.' : 'Créez un nouveau partenaire (agence, compagnie, prestataire).'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nom du partenaire *</Label>
              <Input placeholder="Ex: Voyage Plus SARL" value={partnerForm.name} onChange={(e) => setPartnerForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type *</Label>
                <Select value={partnerForm.type} onValueChange={(v) => setPartnerForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPE_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Aéroport *</Label>
                <Select value={partnerForm.airportCode} onValueChange={(v) => setPartnerForm((f) => ({ ...f, airportCode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AIRPORT_OPTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Email *</Label>
                <Input type="email" placeholder="contact@partenaire.sn" value={partnerForm.email} onChange={(e) => setPartnerForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Téléphone *</Label>
                <Input placeholder="+221 77 123 45 67" value={partnerForm.phone} onChange={(e) => setPartnerForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Contact principal *</Label>
              <Input placeholder="Ex: Moustapha Diallo" value={partnerForm.contactPerson} onChange={(e) => setPartnerForm((f) => ({ ...f, contactPerson: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Taux de commission (%)</Label>
                <Input type="number" min={0} max={100} step={0.1} value={partnerForm.commissionRate} onChange={(e) => setPartnerForm((f) => ({ ...f, commissionRate: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="grid gap-2">
                <Label>Logo URL</Label>
                <Input placeholder="https://..." value={''} disabled />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Début de contrat</Label>
                <Input type="date" value={partnerForm.contractStart} onChange={(e) => setPartnerForm((f) => ({ ...f, contractStart: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Fin de contrat</Label>
                <Input type="date" value={partnerForm.contractEnd} onChange={(e) => setPartnerForm((f) => ({ ...f, contractEnd: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea placeholder="Notes ou informations complémentaires..." value={partnerForm.notes} onChange={(e) => setPartnerForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
            {!editingPartner && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <Checkbox
                  id="send-invitation"
                  checked={partnerForm.sendInvitation}
                  onCheckedChange={(checked) => setPartnerForm((f) => ({ ...f, sendInvitation: checked === true }))}
                />
                <Label htmlFor="send-invitation" className="cursor-pointer text-sm">
                  Envoyer une invitation par email
                </Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPartnerDialogOpen(false)}>Annuler</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSavePartner} disabled={partnerSubmitting}>
              {partnerSubmitting ? 'Enregistrement...' : editingPartner ? 'Mettre à jour' : 'Créer le partenaire'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ PARTNER DELETE DIALOG ═══════════════════ */}
      <AlertDialog open={deletePartnerDialogOpen} onOpenChange={setDeletePartnerDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver le partenaire</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir désactiver le partenaire &laquo; {deletingPartner?.name} &raquo; ? Il sera marqué comme inactif mais ses données seront conservées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeletePartner}>
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════════ USERS SUB-DIALOG ═══════════════════ */}
      <Dialog open={usersDialogOpen} onOpenChange={(open) => { if (!open) setUsersDialogOpen(false) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <Users className="size-5 text-orange-500" />
                Utilisateurs — {usersPartner?.name}
              </span>
            </DialogTitle>
            <DialogDescription>Gestion des utilisateurs du partenaire.</DialogDescription>
          </DialogHeader>

          {/* Invite button */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{partnerUsers.length} utilisateur(s)</p>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              size="sm"
              onClick={() => setShowInviteForm(!showInviteForm)}
            >
              <UserPlus className="size-4" />
              <span className="ml-1">Inviter un utilisateur</span>
            </Button>
          </div>

          {/* Invite form */}
          {showInviteForm && (
            <div className="rounded-lg border border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 p-4 space-y-3">
              <p className="text-sm font-medium text-orange-700 dark:text-orange-400">Nouvelle invitation</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="grid gap-1">
                  <Label className="text-xs">Email *</Label>
                  <Input type="email" placeholder="email@partenaire.sn" className="h-8 text-sm" value={inviteForm.email} onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Nom *</Label>
                  <Input placeholder="Nom complet" className="h-8 text-sm" value={inviteForm.name} onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Rôle</Label>
                  <Select value={inviteForm.role} onValueChange={(v) => setInviteForm((f) => ({ ...f, role: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setShowInviteForm(false); setInviteForm(DEFAULT_INVITE_FORM) }}>Annuler</Button>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white h-7 text-xs" onClick={handleInviteUser} disabled={inviteSubmitting}>
                  {inviteSubmitting ? 'Envoi en cours...' : 'Envoyer l\'invitation'}
                </Button>
              </div>
            </div>
          )}

          {/* Users table */}
          {loadingUsers ? <Spinner /> : partnerUsers.length === 0 ? (
            <EmptyState message="Aucun utilisateur trouvé pour ce partenaire." />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead className="hidden md:table-cell">Statut</TableHead>
                    <TableHead className="hidden lg:table-cell">Créé le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partnerUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{user.email}</TableCell>
                      <TableCell><UserRoleBadge role={user.role} /></TableCell>
                      <TableCell className="hidden md:table-cell">
                        {user.isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Actif</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">Inactif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
