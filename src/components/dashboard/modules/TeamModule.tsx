'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Users,
  Wifi,
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  MoreHorizontal,
  Pencil,
  FileText,
  UserX,
  Download,
  TrendingUp,
  TrendingDown,
  Settings,
  ClipboardList,
  RefreshCw,
  Search,
  Filter,
  Handshake,
  Mail,
  Building2,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// ─── Types ───────────────────────────────────────────────────────
interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  status: 'en_ligne' | 'hors_ligne' | 'inactif'
  lastLogin: string
  airport: string
}

interface ConnectionLog {
  id: string
  timestamp: string
  user: string
  ipAddress: string
  action: string
  status: 'success' | 'failed'
  details: string
}

interface PermissionRow {
  label: string
  admin: boolean
  agentSupport: boolean
  analyste: boolean
  finance: boolean
}

interface AuditLogEntry {
  id: string
  adminId: string | null
  action: string
  module: string
  details: string | null
  ipAddress: string | null
  createdAt: string
  admin: {
    id: string
    name: string
    email: string
    role: string
  } | null
}

interface AuditPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ─── Constants ───────────────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  Admin: 'bg-red-500/15 text-red-700 border-red-200 dark:text-red-400 dark:border-red-800',
  'Agent Support': 'bg-sky-500/15 text-sky-700 border-sky-200 dark:text-sky-400 dark:border-sky-800',
  Analyste: 'bg-violet-500/15 text-violet-700 border-violet-200 dark:text-violet-400 dark:border-violet-800',
  Finance: 'bg-amber-500/15 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800',
  Superviseur: 'bg-orange-500/15 text-orange-700 border-orange-200 dark:text-orange-400 dark:border-orange-800',
}

const STATUS_DOT_COLORS: Record<string, string> = {
  en_ligne: 'bg-emerald-500',
  hors_ligne: 'bg-gray-400',
  inactif: 'bg-red-500',
}

const STATUS_LABELS: Record<string, string> = {
  en_ligne: 'En ligne',
  hors_ligne: 'Hors ligne',
  inactif: 'Inactif',
}

const ROLE_BADGE_COLORS: Record<string, string> = {
  Admin: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  'Agent Support': 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  Analyste: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  Finance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Superviseur: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
}

// ─── Mock Data ───────────────────────────────────────────────────
const MOCK_TEAM: TeamMember[] = [
  { id: 'tm-001', name: 'Amadou Diallo', email: 'a.diallo@maellis.sn', role: 'Admin', status: 'en_ligne', lastLogin: '2024-04-21T14:30:00Z', airport: 'DSS' },
  { id: 'tm-002', name: 'Fatou Ndiaye', email: 'f.ndiaye@maellis.sn', role: 'Superviseur', status: 'en_ligne', lastLogin: '2024-04-21T14:15:00Z', airport: 'DSS' },
  { id: 'tm-003', name: 'Moussa Sow', email: 'm.sow@maellis.ci', role: 'Agent Support', status: 'en_ligne', lastLogin: '2024-04-21T13:45:00Z', airport: 'ABJ' },
  { id: 'tm-004', name: 'Aissatou Ba', email: 'a.ba@maellis.ml', role: 'Analyste', status: 'en_ligne', lastLogin: '2024-04-21T12:30:00Z', airport: 'BKO' },
  { id: 'tm-005', name: 'Ibrahim Diop', email: 'i.diop@maellis.sn', role: 'Finance', status: 'en_ligne', lastLogin: '2024-04-21T11:00:00Z', airport: 'DSS' },
  { id: 'tm-006', name: 'Mariama Sy', email: 'm.sy@maellis.sn', role: 'Agent Support', status: 'hors_ligne', lastLogin: '2024-04-21T09:30:00Z', airport: 'DSS' },
  { id: 'tm-007', name: 'Cheikh Mbaye', email: 'c.mbaye@maellis.ci', role: 'Agent Support', status: 'hors_ligne', lastLogin: '2024-04-20T17:45:00Z', airport: 'ABJ' },
  { id: 'tm-008', name: 'Adama Traoré', email: 'a.traore@maellis.ml', role: 'Analyste', status: 'hors_ligne', lastLogin: '2024-04-20T16:00:00Z', airport: 'BKO' },
]

const MOCK_LOGS: ConnectionLog[] = [
  { id: 'log-001', timestamp: '2024-04-21T14:30:00Z', user: 'Amadou Diallo', ipAddress: '41.82.157.33', action: 'Connexion', status: 'success', details: 'Navigateur Chrome / Dakar' },
  { id: 'log-002', timestamp: '2024-04-21T14:15:00Z', user: 'Fatou Ndiaye', ipAddress: '102.156.88.12', action: 'Connexion', status: 'success', details: 'Application mobile / Dakar' },
  { id: 'log-003', timestamp: '2024-04-21T13:45:00Z', user: 'Moussa Sow', ipAddress: '41.82.201.45', action: 'Connexion', status: 'success', details: 'Navigateur Firefox / Abidjan' },
  { id: 'log-004', timestamp: '2024-04-21T13:30:00Z', user: 'Utilisateur inconnu', ipAddress: '197.149.88.210', action: 'Tentative connexion échouée', status: 'failed', details: 'Mot de passe incorrect (3e tentative)' },
  { id: 'log-005', timestamp: '2024-04-21T12:30:00Z', user: 'Aissatou Ba', ipAddress: '197.2.45.178', action: 'Connexion', status: 'success', details: 'Navigateur Chrome / Bamako' },
  { id: 'log-006', timestamp: '2024-04-21T11:00:00Z', user: 'Ibrahim Diop', ipAddress: '41.82.89.67', action: 'Modification paramètres', status: 'success', details: 'Mise à jour du profil utilisateur' },
  { id: 'log-007', timestamp: '2024-04-21T10:30:00Z', user: 'Amadou Diallo', ipAddress: '41.82.157.33', action: 'Export rapport', status: 'success', details: 'Rapport mensuel des conversations (PDF)' },
  { id: 'log-008', timestamp: '2024-04-21T09:45:00Z', user: 'Fatou Ndiaye', ipAddress: '102.156.88.12', action: 'Modification paramètres', status: 'success', details: 'Changement de rôle utilisateur tm-006' },
  { id: 'log-009', timestamp: '2024-04-21T09:30:00Z', user: 'Mariama Sy', ipAddress: '41.82.112.99', action: 'Connexion', status: 'success', details: 'Navigateur Safari / Dakar' },
  { id: 'log-010', timestamp: '2024-04-21T08:15:00Z', user: 'Utilisateur inconnu', ipAddress: '197.149.201.55', action: 'Tentative connexion échouée', status: 'failed', details: 'Compte non trouvé' },
  { id: 'log-011', timestamp: '2024-04-20T17:45:00Z', user: 'Cheikh Mbaye', ipAddress: '102.156.45.88', action: 'Connexion', status: 'success', details: 'Navigateur Chrome / Abidjan' },
  { id: 'log-012', timestamp: '2024-04-20T17:30:00Z', user: 'Amadou Diallo', ipAddress: '41.82.157.33', action: 'Export rapport', status: 'success', details: 'Rapport hebdomadaire des paiements (CSV)' },
  { id: 'log-013', timestamp: '2024-04-20T16:00:00Z', user: 'Adama Traoré', ipAddress: '197.2.78.134', action: 'Connexion', status: 'success', details: 'Navigateur Edge / Bamako' },
  { id: 'log-014', timestamp: '2024-04-20T15:45:00Z', user: 'Fatou Ndiaye', ipAddress: '102.156.88.12', action: 'Déconnexion', status: 'success', details: 'Déconnexion manuelle' },
  { id: 'log-015', timestamp: '2024-04-20T15:00:00Z', user: 'Moussa Sow', ipAddress: '41.82.201.45', action: 'Modification paramètres', status: 'success', details: 'Configuration webhook WhatsApp' },
]

const PERMISSION_MATRIX: PermissionRow[] = [
  { label: 'Voir le tableau de bord', admin: true, agentSupport: true, analyste: true, finance: true },
  { label: 'Gérer les conversations', admin: true, agentSupport: true, analyste: false, finance: false },
  { label: 'Voir les paiements', admin: true, agentSupport: false, analyste: true, finance: true },
  { label: 'Gérer les urgences', admin: true, agentSupport: true, analyste: false, finance: false },
  { label: 'Accéder aux analytics', admin: true, agentSupport: false, analyste: true, finance: false },
  { label: 'Gérer l\'équipe', admin: true, agentSupport: false, analyste: false, finance: false },
  { label: 'Configurer les modules', admin: true, agentSupport: false, analyste: false, finance: false },
  { label: 'Exporter les rapports', admin: true, agentSupport: true, analyste: true, finance: true },
]

const AIRPORTS = [
  { value: 'DSS', label: 'Dakar (DSS)' },
  { value: 'ABJ', label: 'Abidjan (ABJ)' },
  { value: 'BKO', label: 'Bamako (BKO)' },
  { value: 'OUA', label: 'Ouagadougou (OUA)' },
  { value: 'LOS', label: 'Lagos (LOS)' },
  { value: 'ACC', label: 'Accra (ACC)' },
  { value: 'CMN', label: 'Casablanca (CMN)' },
  { value: 'NBO', label: 'Nairobi (NBO)' },
]

const ROLES = ['Admin', 'Agent Support', 'Analyste', 'Finance', 'Superviseur']

const ACTION_BADGE_COLORS: Record<string, string> = {
  create: 'bg-orange-500/15 text-orange-700 border-orange-200 dark:text-orange-400 dark:border-orange-800',
  update: 'bg-sky-500/15 text-sky-700 border-sky-200 dark:text-sky-400 dark:border-sky-800',
  delete: 'bg-red-500/15 text-red-700 border-red-200 dark:text-red-400 dark:border-red-800',
  login: 'bg-emerald-500/15 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800',
  logout: 'bg-gray-500/15 text-gray-700 border-gray-200 dark:text-gray-400 dark:border-gray-800',
  export: 'bg-violet-500/15 text-violet-700 border-violet-200 dark:text-violet-400 dark:border-violet-800',
  view: 'bg-gray-500/15 text-gray-700 border-gray-200 dark:text-gray-400 dark:border-gray-800',
  configure: 'bg-amber-500/15 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800',
}

const MODULE_BADGE_COLORS: Record<string, string> = {
  emergency: 'bg-red-500/15 text-red-700 border-red-200 dark:text-red-400 dark:border-red-800',
  conversations: 'bg-orange-500/15 text-orange-700 border-orange-200 dark:text-orange-400 dark:border-orange-800',
  team: 'bg-blue-500/15 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-800',
  reports: 'bg-violet-500/15 text-violet-700 border-violet-200 dark:text-violet-400 dark:border-violet-800',
  settings: 'bg-amber-500/15 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800',
  flights: 'bg-sky-500/15 text-sky-700 border-sky-200 dark:text-sky-400 dark:border-sky-800',
  payments: 'bg-emerald-500/15 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800',
  auth: 'bg-gray-500/15 text-gray-700 border-gray-200 dark:text-gray-400 dark:border-gray-800',
}

const MODULE_LABELS: Record<string, string> = {
  emergency: 'Urgences',
  conversations: 'Conversations',
  team: 'Équipe',
  reports: 'Rapports',
  settings: 'Paramètres',
  flights: 'Vols',
  payments: 'Paiements',
  auth: 'Authentification',
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
  login: 'Connexion',
  logout: 'Déconnexion',
  export: 'Export',
  view: 'Consultation',
  configure: 'Configuration',
}

// ─── Helpers ─────────────────────────────────────────────────────
function formatLoginTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return "À l'instant"
  if (diffMin < 60) return `Il y a ${diffMin} min`
  if (diffHour < 24) return `Il y a ${diffHour}h`
  if (diffDay < 7) return `Il y a ${diffDay}j`
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ─── Component ───────────────────────────────────────────────────
export function TeamModule() {
  // Team tab state
  const [team] = useState<TeamMember[]>(MOCK_TEAM)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRole, setFormRole] = useState('')
  const [formAirport, setFormAirport] = useState('')

  // Logs tab state
  const [logs] = useState<ConnectionLog[]>(MOCK_LOGS)
  const [logUserFilter, setLogUserFilter] = useState('all')
  const [logActionFilter, setLogActionFilter] = useState('all')

  const resetInviteForm = () => {
    setFormName('')
    setFormEmail('')
    setFormRole('')
    setFormAirport('')
  }

  const handleInvite = () => {
    // Mock invite action
    setInviteOpen(false)
    resetInviteForm()
  }

  // Unique users and actions for filters
  const uniqueUsers = [...new Set(logs.map((l) => l.user))]
  const uniqueActions = [...new Set(logs.map((l) => l.action))]

  const filteredLogs = logs.filter((log) => {
    if (logUserFilter !== 'all' && log.user !== logUserFilter) return false
    if (logActionFilter !== 'all' && log.action !== logActionFilter) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Gestion d&apos;Équipe
        </h2>
        <p className="text-muted-foreground text-sm">
          Gérez les membres, les permissions et suivez les connexions
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="equipe" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="equipe" className="gap-1.5">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Équipe</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-1.5">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Permissions</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Logs de Connexion</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Journaux d&apos;Audit</span>
          </TabsTrigger>
          <TabsTrigger value="partners" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Partenaires</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════ TAB 1: Équipe ═══════════════════ */}
        <TabsContent value="equipe" className="space-y-6">
          {/* KPI Row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Membres Actifs */}
            <Card className="border-l-4 border-l-emerald-500 overflow-hidden">
              <CardContent className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                  <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-muted-foreground text-sm">Membres Actifs</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">12</p>
                    <span className="flex items-center gap-0.5 text-xs text-green-600 dark:text-green-400">
                      <TrendingUp className="h-3 w-3" />
                      +2
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* En Ligne */}
            <Card className="border-l-4 border-l-sky-500 overflow-hidden">
              <CardContent className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/30">
                  <Wifi className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                </div>
                <div className="flex-1">
                  <p className="text-muted-foreground text-sm">En Ligne</p>
                  <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">8</p>
                </div>
              </CardContent>
            </Card>

            {/* Sessions Aujourd'hui */}
            <Card className="border-l-4 border-l-violet-500 overflow-hidden">
              <CardContent className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
                  <Activity className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex-1">
                  <p className="text-muted-foreground text-sm">Sessions Aujourd&apos;hui</p>
                  <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">34</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-base">Membres de l&apos;équipe</CardTitle>
                <CardDescription className="text-xs">
                  {team.length} membres • {team.filter((m) => m.status === 'en_ligne').length} en ligne
                </CardDescription>
              </div>
              <Dialog open={inviteOpen} onOpenChange={(open) => { setInviteOpen(open); if (!open) resetInviteForm() }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Inviter un Membre
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Inviter un Membre</DialogTitle>
                    <DialogDescription>
                      Envoyez une invitation à un nouveau membre de l&apos;équipe.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="invite-name">Nom</Label>
                      <Input
                        id="invite-name"
                        placeholder="Nom complet"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="invite-email">Email</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="email@maellis.sn"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Rôle</Label>
                      <Select value={formRole} onValueChange={setFormRole}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionner un rôle" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Aéroport</Label>
                      <Select value={formAirport} onValueChange={setFormAirport}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionner un aéroport" />
                        </SelectTrigger>
                        <SelectContent>
                          {AIRPORTS.map((apt) => (
                            <SelectItem key={apt.value} value={apt.value}>
                              {apt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setInviteOpen(false)}>
                      Annuler
                    </Button>
                    <Button
                      onClick={handleInvite}
                      disabled={!formName || !formEmail || !formRole || !formAirport}
                    >
                      Envoyer l&apos;invitation
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="max-h-[480px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membre</TableHead>
                      <TableHead className="hidden sm:table-cell">Email</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="hidden md:table-cell">Dernière Connexion</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {team.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                                {getInitials(member.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{member.name}</p>
                              <p className="text-muted-foreground text-xs sm:hidden">{member.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-muted-foreground text-sm">{member.email}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={ROLE_COLORS[member.role] || 'bg-gray-100 text-gray-700'}
                            variant="outline"
                          >
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${STATUS_DOT_COLORS[member.status]}`} />
                            <span className="text-sm">{STATUS_LABELS[member.status]}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-muted-foreground text-sm">
                            {formatLoginTime(member.lastLogin)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Pencil className="mr-2 h-4 w-4" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <FileText className="mr-2 h-4 w-4" />
                                Voir Logs
                              </DropdownMenuItem>
                              <DropdownMenuItem variant="destructive">
                                <UserX className="mr-2 h-4 w-4" />
                                Désactiver
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════ TAB 2: Permissions ═══════════════════ */}
        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Matrice des Permissions</CardTitle>
              <CardDescription>
                Configuration des accès par rôle. Admin a tous les droits.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[520px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Permission</TableHead>
                      <TableHead className="text-center">
                        <Badge className={ROLE_BADGE_COLORS['Admin'] || ''} variant="outline">
                          Admin
                        </Badge>
                      </TableHead>
                      <TableHead className="text-center hidden sm:table-cell">
                        <Badge className={ROLE_BADGE_COLORS['Agent Support'] || ''} variant="outline">
                          Agent Support
                        </Badge>
                      </TableHead>
                      <TableHead className="text-center">
                        <Badge className={ROLE_BADGE_COLORS['Analyste'] || ''} variant="outline">
                          Analyste
                        </Badge>
                      </TableHead>
                      <TableHead className="text-center">
                        <Badge className={ROLE_BADGE_COLORS['Finance'] || ''} variant="outline">
                          Finance
                        </Badge>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PERMISSION_MATRIX.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium text-sm">
                          {row.label}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.admin ? (
                            <CheckCircle2 className="mx-auto h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle className="mx-auto h-5 w-5 text-red-400 dark:text-red-500" />
                          )}
                        </TableCell>
                        <TableCell className="text-center hidden sm:table-cell">
                          {row.agentSupport ? (
                            <CheckCircle2 className="mx-auto h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle className="mx-auto h-5 w-5 text-red-400 dark:text-red-500" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.analyste ? (
                            <CheckCircle2 className="mx-auto h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle className="mx-auto h-5 w-5 text-red-400 dark:text-red-500" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.finance ? (
                            <CheckCircle2 className="mx-auto h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle className="mx-auto h-5 w-5 text-red-400 dark:text-red-500" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════ TAB 3: Logs de Connexion ═══════════════════ */}
        <TabsContent value="logs" className="space-y-6">
          {/* KPI Row */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Connexions 24h */}
            <Card className="border-l-4 border-l-amber-500 overflow-hidden">
              <CardContent className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                  <Shield className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-muted-foreground text-sm">Connexions 24h</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">156</p>
                </div>
              </CardContent>
            </Card>

            {/* Actions suspectes */}
            <Card className="border-l-4 border-l-red-500 overflow-hidden">
              <CardContent className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-muted-foreground text-sm">Actions suspectes</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">2</p>
                    <span className="flex items-center gap-0.5 text-xs text-green-600 dark:text-green-400">
                      <TrendingDown className="h-3 w-3" />
                      -50%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Logs Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">Journal de Connexion</CardTitle>
                  <CardDescription className="text-xs">
                    {filteredLogs.length} entrée(s) affichée(s)
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* User Filter */}
                  <Select value={logUserFilter} onValueChange={setLogUserFilter}>
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="Tous les utilisateurs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les utilisateurs</SelectItem>
                      {uniqueUsers.map((user) => (
                        <SelectItem key={user} value={user}>
                          {user}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Action Filter */}
                  <Select value={logActionFilter} onValueChange={setLogActionFilter}>
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="Tous les types d'action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types d&apos;action</SelectItem>
                      {uniqueActions.map((action) => (
                        <SelectItem key={action} value={action}>
                          {action}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Export Button */}
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Exporter les Logs
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[480px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="hidden lg:table-cell">Timestamp</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead className="hidden sm:table-cell">IP Address</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="hidden md:table-cell">Détails</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-muted-foreground text-xs font-mono">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{log.user}</span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-muted-foreground text-xs font-mono">{log.ipAddress}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{log.action}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              log.status === 'success'
                                ? 'bg-green-500/15 text-green-700 border-green-200 dark:text-green-400 dark:border-green-800'
                                : 'bg-red-500/15 text-red-700 border-red-200 dark:text-red-400 dark:border-red-800'
                            }
                            variant="outline"
                          >
                            {log.status === 'success' ? 'Succès' : 'Échoué'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-muted-foreground text-xs max-w-[200px] truncate block">
                            {log.details}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                          Aucun log trouvé pour les filtres sélectionnés
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* ═══════════════════ TAB 4: Journaux d'Audit ═══════════════════ */}
        <TabsContent value="audit" className="space-y-6">
          <AuditLogsTab />
        </TabsContent>
        {/* ═══════════════════ TAB 5: Partenaires ═══════════════════ */}
        <TabsContent value="partners" className="space-y-6">
          <PartnersTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Audit Logs Sub-Component ─────────────────────────────────────
function AuditLogsTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [moduleFilter, setModuleFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [autoRefreshKey, setAutoRefreshKey] = useState(0)
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '100' })
      if (moduleFilter !== 'all') params.set('module', moduleFilter)
      if (actionFilter !== 'all') params.set('action', actionFilter)

      const res = await fetch(`/api/audit-logs?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setLogs(json.data)
        setTotalPages(json.pagination.totalPages)
      }
    } catch {
      // Silently fail — audit logs are non-critical UI
    } finally {
      setLoading(false)
    }
  }, [page, moduleFilter, actionFilter])

  // Initial fetch + reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [moduleFilter, actionFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs, autoRefreshKey])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      setAutoRefreshKey((k) => k + 1)
    }, 30000)
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    }
  }, [])

  // Client-side search filter
  const filteredLogs = logs.filter((log) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const adminName = log.admin?.name?.toLowerCase() || ''
    const adminEmail = log.admin?.email?.toLowerCase() || ''
    const details = log.details?.toLowerCase() || ''
    return adminName.includes(q) || adminEmail.includes(q) || details.includes(q)
  })

  const handleExportCSV = () => {
    const params = new URLSearchParams({ format: 'csv' })
    if (moduleFilter !== 'all') params.set('module', moduleFilter)
    window.open(`/api/audit-logs/export?${params.toString()}`, '_blank')
  }

  const moduleOptions = [
    { value: 'all', label: 'Tous les modules' },
    { value: 'emergency', label: 'Urgences' },
    { value: 'conversations', label: 'Conversations' },
    { value: 'team', label: 'Équipe' },
    { value: 'reports', label: 'Rapports' },
    { value: 'settings', label: 'Paramètres' },
    { value: 'flights', label: 'Vols' },
    { value: 'payments', label: 'Paiements' },
    { value: 'auth', label: 'Authentification' },
  ]

  const actionOptions = [
    { value: 'all', label: 'Toutes les actions' },
    { value: 'create', label: 'Création' },
    { value: 'update', label: 'Modification' },
    { value: 'delete', label: 'Suppression' },
    { value: 'login', label: 'Connexion' },
    { value: 'logout', label: 'Déconnexion' },
    { value: 'export', label: 'Export' },
    { value: 'view', label: 'Consultation' },
    { value: 'configure', label: 'Configuration' },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Journaux d&apos;Audit</CardTitle>
            <CardDescription className="text-xs">
              {filteredLogs.length} entrée(s) affichée(s) — Actualisation automatique toutes les 30s
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setAutoRefreshKey((k) => k + 1)}
              disabled={loading}
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExportCSV}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Exporter CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par admin ou détails..."
              className="h-8 pl-8 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-[170px] h-8 text-xs">
              <Filter className="mr-1.5 h-3.5 w-3.5" />
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              {moduleOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[170px] h-8 text-xs">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              {actionOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Audit Logs Table */}
        <div className="max-h-[480px] overflow-y-auto">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead className="hidden md:table-cell">Détails</TableHead>
                  <TableHead className="hidden sm:table-cell">IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-muted-foreground text-xs font-mono">
                        {formatTimestamp(log.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">
                          {log.admin?.name || 'Système'}
                        </p>
                        {log.admin?.email && (
                          <p className="text-muted-foreground text-xs">{log.admin.email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={ACTION_BADGE_COLORS[log.action] || ACTION_BADGE_COLORS.view}
                        variant="outline"
                      >
                        {ACTION_LABELS[log.action] || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={MODULE_BADGE_COLORS[log.module] || MODULE_BADGE_COLORS.auth}
                        variant="outline"
                      >
                        {MODULE_LABELS[log.module] || log.module}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-muted-foreground text-xs max-w-[220px] truncate block">
                        {log.details || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-muted-foreground text-xs font-mono">
                        {log.ipAddress || '—'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLogs.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                      Aucun journal d&apos;audit trouvé pour les filtres sélectionnés
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Load More / Pagination */}
        {page < totalPages && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Chargement...
                </>
              ) : (
                'Charger plus'
              )}
            </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

// ─── Partners Tab Sub-Component ───────────────────────────────────
interface Partner {
  id: string
  name: string
  type: string
  email: string
  phone?: string
  contactPerson?: string
  airportCode?: string
  commissionRate?: number
  contractStart?: string
  contractEnd?: string
  notes?: string
  status: string
  usersCount?: number
  createdAt?: string
}

const PARTNER_TYPE_LABELS: Record<string, string> = {
  TRAVEL_AGENCY: 'Agence de Voyage',
  AIRLINE: 'Compagnie Aérienne',
  SERVICE_PROVIDER: 'Prestataire',
}

const PARTNER_TYPE_COLORS: Record<string, string> = {
  TRAVEL_AGENCY: 'bg-violet-100 text-violet-700',
  AIRLINE: 'bg-sky-100 text-sky-700',
  SERVICE_PROVIDER: 'bg-amber-100 text-amber-700',
}

const PARTNER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-700 border-amber-200',
  active: 'bg-green-500/15 text-green-700 border-green-200',
  inactive: 'bg-red-500/15 text-red-700 border-red-200',
}

const PARTNER_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  active: 'Actif',
  inactive: 'Inactif',
}

const PARTNER_TYPE_OPTIONS = [
  { value: 'TRAVEL_AGENCY', label: 'Agence de Voyage' },
  { value: 'AIRLINE', label: 'Compagnie Aérienne' },
  { value: 'SERVICE_PROVIDER', label: 'Prestataire' },
]

function PartnersTab() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sendInvitation, setSendInvitation] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [pType, setPType] = useState('TRAVEL_AGENCY')
  const [pName, setPName] = useState('')
  const [pEmail, setPEmail] = useState('')
  const [pPhone, setPPhone] = useState('')
  const [pContactPerson, setPContactPerson] = useState('')
  const [pAirportCode, setPAirportCode] = useState('DSS')
  const [pCommissionRate, setPCommissionRate] = useState('')
  const [pContractStart, setPContractStart] = useState('')
  const [pContractEnd, setPContractEnd] = useState('')
  const [pNotes, setPNotes] = useState('')

  // Fetch partners
  useEffect(() => {
    async function fetchPartners() {
      setLoading(true)
      try {
        const res = await fetch('/api/partners?airport=DSS')
        if (res.ok) {
          const json = await res.json()
          const items = json.data ?? json ?? []
          setPartners(Array.isArray(items) ? items : [])
        } else {
          setPartners([])
        }
      } catch {
        setPartners([])
      } finally {
        setLoading(false)
      }
    }
    fetchPartners()
  }, [])

  const resetForm = () => {
    setPType('TRAVEL_AGENCY'); setPName(''); setPEmail('')
    setPPhone(''); setPContactPerson(''); setPAirportCode('DSS')
    setPCommissionRate(''); setPContractStart(''); setPContractEnd('')
    setPNotes(''); setSendInvitation(true)
  }

  const openDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!pName || !pEmail) {
      toast.error('Nom et email sont requis')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        type: pType,
        name: pName,
        email: pEmail,
        phone: pPhone || undefined,
        contactPerson: pContactPerson || undefined,
        airportCode: pAirportCode,
        commissionRate: pCommissionRate ? parseFloat(pCommissionRate) : undefined,
        contractStart: pContractStart || undefined,
        contractEnd: pContractEnd || undefined,
        notes: pNotes || undefined,
        sendInvitation,
      }
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success('Partenaire ajouté avec succès')
        setDialogOpen(false)
        resetForm()
        // Re-fetch
        const json = await res.json()
        const newPartner = json.data || json
        if (newPartner?.id) {
          setPartners((prev) => [newPartner, ...prev])
        } else {
          const listRes = await fetch('/api/partners?airport=DSS')
          if (listRes.ok) {
            const listJson = await listRes.json()
            const items = listJson.data ?? listJson ?? []
            setPartners(Array.isArray(items) ? items : [])
          }
        }
        if (sendInvitation) {
          toast.success('Invitation envoyée par email')
        }
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? "Erreur lors de l'ajout")
      }
    } catch {
      toast.error('Erreur réseau.')
    } finally {
      setSubmitting(false)
    }
  }

  // Stats
  const totalPartners = partners.length
  const activePartners = partners.filter((p) => p.status === 'active').length
  const pendingPartners = partners.filter((p) => p.status === 'pending').length

  return (
    <>
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-orange-500 overflow-hidden">
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100">
              <Handshake className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Total Partenaires</p>
              <p className="text-2xl font-bold text-orange-600">{totalPartners}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 overflow-hidden">
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Actifs</p>
              <p className="text-2xl font-bold text-green-600">{activePartners}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 overflow-hidden">
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">En attente</p>
              <p className="text-2xl font-bold text-amber-600">{pendingPartners}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Partners Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Partenaires ({totalPartners})</CardTitle>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={openDialog}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Inviter un partenaire</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="border-orange-500 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          ) : partners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Handshake className="size-10 mb-3 opacity-40" />
              <p>Aucun partenaire</p>
            </div>
          ) : (
            <div className="max-h-[480px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden sm:table-cell">Contact</TableHead>
                    <TableHead className="hidden md:table-cell">Commission</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="hidden lg:table-cell">Utilisateurs</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.map((partner) => (
                    <TableRow key={partner.id}>
                      <TableCell className="font-medium">{partner.name}</TableCell>
                      <TableCell>
                        <Badge className={PARTNER_TYPE_COLORS[partner.type] ?? 'bg-gray-100 text-gray-600'} variant="secondary">
                          {PARTNER_TYPE_LABELS[partner.type] ?? partner.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {partner.contactPerson || partner.email}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {partner.commissionRate != null ? `${partner.commissionRate}%` : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={PARTNER_STATUS_COLORS[partner.status] ?? ''} variant="outline">
                          {PARTNER_STATUS_LABELS[partner.status] ?? partner.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {partner.usersCount ?? 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Pencil className="mr-2 h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              Renvoyer l&apos;invitation
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(partner)}>
                              <UserX className="mr-2 h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Partner Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm() } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Inviter un partenaire</DialogTitle>
            <DialogDescription>
              Ajoutez un nouveau partenaire et envoyez-lui une invitation par email.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Type de partenaire *</Label>
              <Select value={pType} onValueChange={setPType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PARTNER_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Nom de la société *</Label>
              <Input placeholder="Ex: Voyages Dakar SARL" value={pName} onChange={(e) => setPName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Email *</Label>
                <Input type="email" placeholder="contact@partenaire.sn" value={pEmail} onChange={(e) => setPEmail(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Téléphone</Label>
                <Input placeholder="+221 33 000 00 00" value={pPhone} onChange={(e) => setPPhone(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Personne de contact</Label>
              <Input placeholder="Nom du responsable" value={pContactPerson} onChange={(e) => setPContactPerson(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Aéroport</Label>
                <Select value={pAirportCode} onValueChange={setPAirportCode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AIRPORTS.filter((a) => ['DSS', 'ABJ', 'BKO', 'LOS', 'ACC'].includes(a.value)).map((apt) => (
                      <SelectItem key={apt.value} value={apt.value}>{apt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Commission (%)</Label>
                <Input type="number" min="0" max="100" step="0.1" placeholder="5.0" value={pCommissionRate} onChange={(e) => setPCommissionRate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Début de contrat</Label>
                <Input type="date" value={pContractStart} onChange={(e) => setPContractStart(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Fin de contrat</Label>
                <Input type="date" value={pContractEnd} onChange={(e) => setPContractEnd(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea placeholder="Informations complémentaires..." value={pNotes} onChange={(e) => setPNotes(e.target.value)} rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="send-invitation" checked={sendInvitation} onCheckedChange={(checked) => setSendInvitation(checked === true)} />
              <Label htmlFor="send-invitation" className="cursor-pointer">
                Envoyer une invitation par email
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>Annuler</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSubmit} disabled={submitting || !pName || !pEmail}>
              {submitting ? 'Envoi en cours...' : 'Ajouter le partenaire'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le partenaire</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deleteTarget?.name}</strong> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
              onClick={async (e) => {
                e.preventDefault()
                if (!deleteTarget) return
                setDeleting(true)
                try {
                  const res = await fetch(`/api/partners/${deleteTarget.id}`, { method: 'DELETE' })
                  if (res.ok) {
                    toast.success(`Partenaire ${deleteTarget.name} supprimé`)
                    setPartners((prev) => prev.filter((p) => p.id !== deleteTarget.id))
                    setDeleteTarget(null)
                  } else {
                    const err = await res.json().catch(() => ({}))
                    toast.error(err.error ?? 'Erreur lors de la suppression')
                  }
                } catch {
                  toast.error('Erreur réseau.')
                } finally {
                  setDeleting(false)
                }
              }}
            >
              {deleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
