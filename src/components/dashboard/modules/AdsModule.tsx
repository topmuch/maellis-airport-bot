'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Megaphone, Plus, Eye, Pencil, Trash2, CheckCircle, Clock, BarChart3,
  Search, DollarSign, Target, TrendingUp, AlertTriangle, Play, Pause, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

interface Campaign { id: string; airportCode: string; name: string; description?: string; startDate: string; endDate: string; totalBudget: number; spentBudget: number; status: string; _count?: { advertisements: number }; createdAt: string }

interface Ad { id: string; airportCode: string; campaignId?: string; campaignName?: string; merchantId?: string; merchantName?: string; title: string; description?: string; type: string; placement: string; imageUrl: string; targetUrl?: string; ctaText: string; startDate: string; endDate: string; budget: number; budgetType: string; cpmRate?: number; cpcRate?: number; impressions: number; clicks: number; conversions: number; revenue: number; status: string; rejectionReason?: string; createdAt: string }

// ── Constants ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = { banner: 'Banniere', sponsored_message: 'Message sponsorise', push_notification: 'Push notification', native: 'Natif', video: 'Video' }
const PLACEMENT_LABELS: Record<string, string> = { home: 'Accueil', between_messages: 'Entre messages', bottom_banner: 'Banniere bas', search_results: 'Resultats recherche', flight_status: 'Statut vol' }
const BUDGET_TYPE_LABELS: Record<string, string> = { total: 'Total', daily: 'Quotidien', cpm: 'CPM', cpc: 'CPC' }

const CAMP_STATUS: Record<string, { cls: string; label: string }> = {
  draft: { cls: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Brouillon' },
  active: { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Active' },
  paused: { cls: 'bg-amber-100 text-amber-800 border-amber-200', label: 'En pause' },
  completed: { cls: 'bg-sky-100 text-sky-800 border-sky-200', label: 'Terminee' },
}

const AD_STATUS: Record<string, { cls: string; label: string }> = {
  draft: { cls: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Brouillon' },
  pending: { cls: 'bg-amber-100 text-amber-800 border-amber-200', label: 'En attente' },
  active: { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Active' },
  paused: { cls: 'bg-amber-100 text-amber-800 border-amber-200', label: 'En pause' },
  completed: { cls: 'bg-sky-100 text-sky-800 border-sky-200', label: 'Terminee' },
  rejected: { cls: 'bg-red-100 text-red-800 border-red-200', label: 'Rejetee' },
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(p: number): string { return new Intl.NumberFormat('fr-FR').format(Math.round(p)) + ' FCFA' }
function pct(a: number, b: number): string { return b === 0 ? '0%' : (a / b * 100).toFixed(1) + '%' }
function fmtDate(d: string): string { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }

function Spinner() { return (<div className="flex items-center justify-center py-12"><div className="size-8 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" /></div>) }
function EmptyState({ message, icon: Icon }: { message: string; icon: React.ElementType }) { return (<div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Icon className="size-10 mb-3 opacity-40" /><p>{message}</p></div>) }

function StatCard({ title, value, icon, colorClass, iconBgClass }: { title: string; value: string | number; icon: React.ReactNode; colorClass: string; iconBgClass: string }) {
  return (
    <Card className={`border-l-4 ${colorClass.replace('text-', 'border-l-')} overflow-hidden`}>
      <CardContent className="flex items-center gap-4"><div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBgClass}`}>{icon}</div><div><p className="text-sm text-muted-foreground">{title}</p><p className={`text-2xl font-bold ${colorClass}`}>{value}</p></div></CardContent>
    </Card>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

export function AdsModule() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [pendingAds, setPendingAds] = useState<Ad[]>([])
  const [loadingC, setLoadingC] = useState(true)
  const [loadingA, setLoadingA] = useState(true)
  const [loadingP, setLoadingP] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('campaigns')

  // Revenue stats
  const [stats, setStats] = useState({ totalRevenue: 0, totalImpressions: 0, totalClicks: 0, avgCtr: 0, totalConversions: 0 })

  // Campaign dialog
  const [cDialog, setCDialog] = useState(false)
  const [editingC, setEditingC] = useState<Campaign | null>(null)
  const [cForm, setCForm] = useState({ name: '', airportCode: 'DSS', description: '', startDate: '', endDate: '', totalBudget: 0 })
  const [cSubmitting, setCSubmitting] = useState(false)
  const [deleteCDialog, setDeleteCDialog] = useState(false)
  const [deletingC, setDeletingC] = useState<Campaign | null>(null)

  // Ad dialog
  const [aDialog, setADialog] = useState(false)
  const [editingA, setEditingA] = useState<Ad | null>(null)
  const [aForm, setAForm] = useState({ title: '', type: 'banner', placement: 'home', description: '', imageUrl: '', videoUrl: '', targetUrl: '', ctaText: 'En savoir plus', campaignId: '', merchantId: '', targetAudience: '', startDate: '', endDate: '', budget: 0, budgetType: 'total', cpmRate: 0, cpcRate: 0 })
  const [aSubmitting, setASubmitting] = useState(false)

  // Reject dialog
  const [rejectDialog, setRejectDialog] = useState(false)
  const [rejectingA, setRejectingA] = useState<Ad | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchCampaigns = useCallback(async () => {
    setLoadingC(true)
    try { const r = await fetch('/api/ads/campaigns?airport=DSS'); if (r.ok) { const j = await r.json(); setCampaigns(j.success ? j.data : []) } else setCampaigns([]) } catch { setCampaigns([]) } finally { setLoadingC(false) }
  }, [])
  const fetchAds = useCallback(async () => {
    setLoadingA(true)
    try { const r = await fetch('/api/ads?airport=DSS'); if (r.ok) { const j = await r.json(); setAds(j.success ? j.data : []) } else setAds([]) } catch { setAds([]) } finally { setLoadingA(false) }
  }, [])
  const fetchPending = useCallback(async () => {
    setLoadingP(true)
    try { const r = await fetch('/api/admin/ads/pending'); if (r.ok) { const j = await r.json(); setPendingAds(j.success ? j.data : []) } else setPendingAds([]) } catch { setPendingAds([]) } finally { setLoadingP(false) }
  }, [])
  const fetchStats = useCallback(async () => {
    try { const r = await fetch('/api/admin/ads/stats?airport=DSS'); if (r.ok) { const j = await r.json(); if (j.success) setStats(j.data) } } catch {}
  }, [])

  useEffect(() => { fetchCampaigns(); fetchAds(); fetchPending(); fetchStats() }, [fetchCampaigns, fetchAds, fetchPending, fetchStats])

  // ── Campaign CRUD ──────────────────────────────────────────────────────────
  const openCreateC = () => { setEditingC(null); setCForm({ name: '', airportCode: 'DSS', description: '', startDate: '', endDate: '', totalBudget: 0 }); setCDialog(true) }
  const openEditC = (c: Campaign) => { setEditingC(c); setCForm({ name: c.name, airportCode: c.airportCode, description: c.description || '', startDate: c.startDate?.split('T')[0] || '', endDate: c.endDate?.split('T')[0] || '', totalBudget: c.totalBudget }); setCDialog(true) }

  const handleSaveC = async () => {
    if (!cForm.name.trim()) { toast.error('Le nom est requis'); return }
    if (!cForm.startDate || !cForm.endDate) { toast.error('Les dates sont requises'); return }
    setCSubmitting(true)
    try {
      const url = editingC ? `/api/ads/campaigns/${editingC.id}` : '/api/ads/campaigns'
      const res = await fetch(url, { method: editingC ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...cForm, startDate: new Date(cForm.startDate).toISOString(), endDate: new Date(cForm.endDate).toISOString() }) })
      if (res.ok) { toast.success(editingC ? 'Campagne mise a jour' : 'Campagne creee'); setCDialog(false); fetchCampaigns() } else { const e = await res.json().catch(() => ({})); toast.error(e.error || 'Erreur') }
    } catch { toast.error('Erreur') } finally { setCSubmitting(false) }
  }

  const handleDeleteC = async () => {
    if (!deletingC) return
    try { const r = await fetch(`/api/ads/campaigns/${deletingC.id}`, { method: 'DELETE' }); if (r.ok) { toast.success('Campagne supprimee'); fetchCampaigns(); fetchAds() } else toast.error('Erreur') } catch { toast.error('Erreur') } finally { setDeleteCDialog(false); setDeletingC(null) }
  }

  // ── Ad CRUD ────────────────────────────────────────────────────────────────
  const openCreateA = () => { setEditingA(null); setAForm({ title: '', type: 'banner', placement: 'home', description: '', imageUrl: '', videoUrl: '', targetUrl: '', ctaText: 'En savoir plus', campaignId: '', merchantId: '', targetAudience: '', startDate: '', endDate: '', budget: 0, budgetType: 'total', cpmRate: 0, cpcRate: 0 }); setADialog(true) }
  const openEditA = (a: Ad) => { setEditingA(a); setAForm({ title: a.title, type: a.type, placement: a.placement, description: a.description || '', imageUrl: a.imageUrl, videoUrl: a.videoUrl || '', targetUrl: a.targetUrl || '', ctaText: a.ctaText, campaignId: a.campaignId || '', merchantId: a.merchantId || '', targetAudience: '', startDate: a.startDate?.split('T')[0] || '', endDate: a.endDate?.split('T')[0] || '', budget: a.budget, budgetType: a.budgetType, cpmRate: a.cpmRate || 0, cpcRate: a.cpcRate || 0 }); setADialog(true) }

  const handleSaveA = async () => {
    if (!aForm.title.trim()) { toast.error('Le titre est requis'); return }
    if (!aForm.imageUrl.trim()) { toast.error("L'image est requise"); return }
    setASubmitting(true)
    try {
      const url = editingA ? `/api/ads/${editingA.id}` : '/api/ads'
      const body: Record<string, unknown> = { ...aForm, startDate: new Date(aForm.startDate).toISOString(), endDate: new Date(aForm.endDate).toISOString() }
      if (!body.campaignId) delete body.campaignId
      if (!body.merchantId) delete body.merchantId
      if (!body.targetAudience) delete body.targetAudience
      if (!body.videoUrl) delete body.videoUrl
      if (!body.targetUrl) delete body.targetUrl
      if (body.budgetType !== 'cpm') delete body.cpmRate
      if (body.budgetType !== 'cpc') delete body.cpcRate
      const res = await fetch(url, { method: editingA ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { toast.success(editingA ? 'Annonce mise a jour' : 'Annonce creee'); setADialog(false); fetchAds(); fetchCampaigns() } else { const e = await res.json().catch(() => ({})); toast.error(e.error || 'Erreur') }
    } catch { toast.error('Erreur') } finally { setASubmitting(false) }
  }

  const adAction = async (id: string, action: string) => {
    try { const r = await fetch(`/api/ads/${id}/${action}`, { method: 'POST' }); if (r.ok) { toast.success(`Annonce ${action === 'submit' ? 'soumise' : action === 'pause' ? 'pausee' : action === 'resume' ? 'reactivee' : 'mise a jour'}`); fetchAds(); fetchPending() } else toast.error('Erreur') } catch { toast.error('Erreur') }
  }

  const deleteAd = async (id: string) => {
    try { const r = await fetch(`/api/ads/${id}`, { method: 'DELETE' }); if (r.ok) { toast.success('Annonce supprimee'); fetchAds() } else toast.error('Erreur') } catch { toast.error('Erreur') }
  }

  // ── Admin Actions ──────────────────────────────────────────────────────────
  const approveAd = async (id: string) => {
    try { const r = await fetch(`/api/admin/ads/${id}/approve`, { method: 'PUT' }); if (r.ok) { toast.success('Annonce approuvee'); fetchPending(); fetchAds() } else toast.error('Erreur') } catch { toast.error('Erreur') }
  }

  const openRejectA = (a: Ad) => { setRejectingA(a); setRejectReason(''); setRejectDialog(true) }
  const handleReject = async () => {
    if (!rejectingA) return
    try { const r = await fetch(`/api/admin/ads/${rejectingA.id}/reject`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: rejectReason }) }); if (r.ok) { toast.success('Annonce rejetee'); setRejectDialog(false); fetchPending(); fetchAds() } else toast.error('Erreur') } catch { toast.error('Erreur') }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredCampaigns = useMemo(() => { if (!search) return campaigns; const q = search.toLowerCase(); return campaigns.filter((c) => c.name.toLowerCase().includes(q)) }, [campaigns, search])
  const filteredAds = useMemo(() => { if (!search) return ads; const q = search.toLowerCase(); return ads.filter((a) => a.title.toLowerCase().includes(q) || (a.campaignName || '').toLowerCase().includes(q)) }, [ads, search])

  const totalBudget = campaigns.reduce((s, c) => s + c.totalBudget, 0)
  const totalSpent = campaigns.reduce((s, c) => s + c.spentBudget, 0)

  // ══════════════════════════════════════════════════════════════════════════
  // ── RENDER ──────────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Publicite & Monetisation</h2>
        <p className="text-muted-foreground text-sm">Gestion des campagnes publicitaires et revenus</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearch('') }} className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="campaigns" className="gap-1.5"><Megaphone className="h-4 w-4" /><span className="hidden sm:inline">Campagnes</span></TabsTrigger>
          <TabsTrigger value="ads" className="gap-1.5"><Target className="h-4 w-4" /><span className="hidden sm:inline">Annonces</span></TabsTrigger>
          <TabsTrigger value="validation" className="gap-1.5"><CheckCircle className="h-4 w-4" /><span className="hidden sm:inline">Validation</span></TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5"><BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">Statistiques</span></TabsTrigger>
        </TabsList>

        {/* ═══ TAB: Campagnes ═══ */}
        <TabsContent value="campaigns" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Campagnes" value={campaigns.length} icon={<Megaphone className="size-6 text-orange-600 dark:text-orange-400" />} colorClass="text-orange-600 dark:text-orange-400" iconBgClass="bg-orange-100 dark:bg-orange-900/30" />
            <StatCard title="Actives" value={campaigns.filter((c) => c.status === 'active').length} icon={<Play className="size-6 text-emerald-600 dark:text-emerald-400" />} colorClass="text-emerald-600 dark:text-emerald-400" iconBgClass="bg-emerald-100 dark:bg-emerald-900/30" />
            <StatCard title="Budget Total" value={formatPrice(totalBudget)} icon={<DollarSign className="size-6 text-sky-600 dark:text-sky-400" />} colorClass="text-sky-600 dark:text-sky-400" iconBgClass="bg-sky-100 dark:bg-sky-900/30" />
            <StatCard title="Depense" value={formatPrice(totalSpent)} icon={<TrendingUp className="size-6 text-amber-600 dark:text-amber-400" />} colorClass="text-amber-600 dark:text-amber-400" iconBgClass="bg-amber-100 dark:bg-amber-900/30" />
          </div>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Campagnes ({campaigns.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-60"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Rechercher..." className="pl-9 h-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={openCreateC}><Plus className="size-4" /><span className="hidden sm:inline ml-1">Creer</span></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingC ? <Spinner /> : filteredCampaigns.length === 0 ? <EmptyState message="Aucune campagne trouvee" icon={Megaphone} /> : (
                <div className="max-h-[500px] overflow-y-auto"><Table><TableHeader><TableRow>
                  <TableHead>Nom</TableHead><TableHead className="hidden md:table-cell">Budget</TableHead><TableHead className="hidden sm:table-cell">Depense</TableHead>
                  <TableHead className="hidden lg:table-cell">Periode</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader><TableBody>
                  {filteredCampaigns.map((c) => {
                    const st = CAMP_STATUS[c.status] || { cls: '', label: c.status }
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="hidden md:table-cell">{formatPrice(c.totalBudget)}</TableCell>
                        <TableCell className="hidden sm:table-cell"><div className="flex items-center gap-2"><div className="w-16 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min((c.spentBudget / c.totalBudget) * 100, 100)}%` }} /></div><span className="text-xs">{pct(c.spentBudget, c.totalBudget)}</span></div></TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{fmtDate(c.startDate)} - {fmtDate(c.endDate)}</TableCell>
                        <TableCell><Badge className={st.cls}>{st.label}</Badge></TableCell>
                        <TableCell className="text-right"><div className="flex items-center justify-end gap-1">
                          <Button variant="outline" size="sm" className="h-7 text-xs text-orange-500 border-orange-200" onClick={() => openEditC(c)}><Pencil className="size-3" /></Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs text-red-500 border-red-200" onClick={() => { setDeletingC(c); setDeleteCDialog(true) }}><Trash2 className="size-3" /></Button>
                        </div></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody></Table></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB: Annonces ═══ */}
        <TabsContent value="ads" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Annonces" value={ads.length} icon={<Target className="size-6 text-orange-600 dark:text-orange-400" />} colorClass="text-orange-600 dark:text-orange-400" iconBgClass="bg-orange-100 dark:bg-orange-900/30" />
            <StatCard title="Actives" value={ads.filter((a) => a.status === 'active').length} icon={<Play className="size-6 text-emerald-600 dark:text-emerald-400" />} colorClass="text-emerald-600 dark:text-emerald-400" iconBgClass="bg-emerald-100 dark:bg-emerald-900/30" />
            <StatCard title="En Attente" value={ads.filter((a) => a.status === 'pending').length} icon={<Clock className="size-6 text-amber-600 dark:text-amber-400" />} colorClass="text-amber-600 dark:text-amber-400" iconBgClass="bg-amber-100 dark:bg-amber-900/30" />
            <StatCard title="Impressions" value={ads.reduce((s, a) => s + a.impressions, 0).toLocaleString()} icon={<BarChart3 className="size-6 text-sky-600 dark:text-sky-400" />} colorClass="text-sky-600 dark:text-sky-400" iconBgClass="bg-sky-100 dark:bg-sky-900/30" />
          </div>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Annonces ({ads.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-60"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Rechercher..." className="pl-9 h-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={openCreateA}><Plus className="size-4" /><span className="hidden sm:inline ml-1">Creer</span></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingA ? <Spinner /> : filteredAds.length === 0 ? <EmptyState message="Aucune annonce trouvee" icon={Target} /> : (
                <div className="max-h-[500px] overflow-y-auto"><Table><TableHeader><TableRow>
                  <TableHead>Titre</TableHead><TableHead className="hidden md:table-cell">Type</TableHead><TableHead className="hidden lg:table-cell">Placement</TableHead>
                  <TableHead className="text-right">Impressions</TableHead><TableHead className="text-right hidden sm:table-cell">Clicks</TableHead>
                  <TableHead className="hidden md:table-cell">CTR</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader><TableBody>
                  {filteredAds.map((a) => {
                    const st = AD_STATUS[a.status] || { cls: '', label: a.status }
                    return (
                      <TableRow key={a.id}>
                        <TableCell><p className="font-medium">{a.title}</p><p className="text-xs text-muted-foreground">{a.campaignName || 'Campagne directe'}</p></TableCell>
                        <TableCell className="hidden md:table-cell"><Badge variant="outline">{TYPE_LABELS[a.type] || a.type}</Badge></TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{PLACEMENT_LABELS[a.placement] || a.placement}</TableCell>
                        <TableCell className="text-right text-sm">{a.impressions.toLocaleString()}</TableCell>
                        <TableCell className="text-right hidden sm:table-cell text-sm">{a.clicks.toLocaleString()}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm font-medium">{pct(a.clicks, a.impressions)}</TableCell>
                        <TableCell><Badge className={st.cls}>{st.label}</Badge></TableCell>
                        <TableCell className="text-right"><div className="flex items-center justify-end gap-1">
                          <Button variant="outline" size="sm" className="h-7 text-xs text-orange-500 border-orange-200" onClick={() => openEditA(a)}><Pencil className="size-3" /></Button>
                          {a.status === 'draft' && <Button variant="outline" size="sm" className="h-7 text-xs text-sky-500 border-sky-200" onClick={() => adAction(a.id, 'submit')} title="Soumettre"><CheckCircle className="size-3" /></Button>}
                          {a.status === 'active' && <Button variant="outline" size="sm" className="h-7 text-xs text-amber-500 border-amber-200" onClick={() => adAction(a.id, 'pause')} title="Pause"><Pause className="size-3" /></Button>}
                          {a.status === 'paused' && <Button variant="outline" size="sm" className="h-7 text-xs text-emerald-500 border-emerald-200" onClick={() => adAction(a.id, 'resume')} title="Reprendre"><Play className="size-3" /></Button>}
                          <Button variant="outline" size="sm" className="h-7 text-xs text-red-500 border-red-200" onClick={() => deleteAd(a.id)}><Trash2 className="size-3" /></Button>
                        </div></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody></Table></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB: Validation ═══ */}
        <TabsContent value="validation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="size-5 text-amber-500" />Annonces en attente ({pendingAds.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingP ? <Spinner /> : pendingAds.length === 0 ? <EmptyState message="Aucune annonce en attente de validation" icon={CheckCircle} /> : (
                <div className="max-h-[500px] overflow-y-auto"><Table><TableHeader><TableRow>
                  <TableHead>Titre</TableHead><TableHead className="hidden md:table-cell">Type</TableHead><TableHead className="hidden md:table-cell">Placement</TableHead>
                  <TableHead className="hidden sm:table-cell">Budget</TableHead><TableHead className="hidden sm:table-cell">Campagne</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader><TableBody>
                  {pendingAds.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell><div className="flex items-center gap-3"><img src={a.imageUrl} alt="" className="size-10 rounded object-cover bg-muted" /><div><p className="font-medium">{a.title}</p><p className="text-xs text-muted-foreground max-w-48 truncate">{a.description || '—'}</p></div></div></TableCell>
                      <TableCell className="hidden md:table-cell"><Badge variant="outline">{TYPE_LABELS[a.type] || a.type}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{PLACEMENT_LABELS[a.placement] || a.placement}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{formatPrice(a.budget)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{a.campaignName || '—'}</TableCell>
                      <TableCell className="text-sm">{fmtDate(a.createdAt)}</TableCell>
                      <TableCell className="text-right"><div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm" className="h-7 text-xs text-emerald-500 border-emerald-200" onClick={() => approveAd(a.id)}>Approuver</Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs text-red-500 border-red-200" onClick={() => openRejectA(a)}>Rejeter</Button>
                      </div></TableCell>
                    </TableRow>
                  ))}
                </TableBody></Table></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB: Statistiques ═══ */}
        <TabsContent value="stats" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard title="Revenu Total" value={formatPrice(stats.totalRevenue)} icon={<DollarSign className="size-6 text-emerald-600 dark:text-emerald-400" />} colorClass="text-emerald-600 dark:text-emerald-400" iconBgClass="bg-emerald-100 dark:bg-emerald-900/30" />
            <StatCard title="Impressions" value={stats.totalImpressions.toLocaleString()} icon={<BarChart3 className="size-6 text-sky-600 dark:text-sky-400" />} colorClass="text-sky-600 dark:text-sky-400" iconBgClass="bg-sky-100 dark:bg-sky-900/30" />
            <StatCard title="Clicks" value={stats.totalClicks.toLocaleString()} icon={<Target className="size-6 text-orange-600 dark:text-orange-400" />} colorClass="text-orange-600 dark:text-orange-400" iconBgClass="bg-orange-100 dark:bg-orange-900/30" />
            <StatCard title="CTR Moyen" value={stats.avgCtr + '%'} icon={<TrendingUp className="size-6 text-amber-600 dark:text-amber-400" />} colorClass="text-amber-600 dark:text-amber-400" iconBgClass="bg-amber-100 dark:bg-amber-900/30" />
            <StatCard title="Conversions" value={stats.totalConversions.toLocaleString()} icon={<CheckCircle className="size-6 text-purple-600 dark:text-purple-400" />} colorClass="text-purple-600 dark:text-purple-400" iconBgClass="bg-purple-100 dark:bg-purple-900/30" />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Performance par annonce</CardTitle></CardHeader>
            <CardContent>
              {ads.length === 0 ? <EmptyState message="Aucune donnee disponible" icon={BarChart3} /> : (
                <div className="max-h-[500px] overflow-y-auto"><Table><TableHeader><TableRow>
                  <TableHead>Titre</TableHead><TableHead className="hidden md:table-cell">Type</TableHead><TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Clicks</TableHead><TableHead className="hidden sm:table-cell">CTR</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Conversions</TableHead><TableHead className="text-right">Revenu</TableHead>
                </TableRow></TableHeader><TableBody>
                  {ads.filter((a) => a.status === 'active' || a.status === 'paused' || a.status === 'completed').sort((a, b) => b.revenue - a.revenue).slice(0, 20).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.title}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{TYPE_LABELS[a.type] || a.type}</TableCell>
                      <TableCell className="text-right text-sm">{a.impressions.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm">{a.clicks.toLocaleString()}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm font-medium">{pct(a.clicks, a.impressions)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right text-sm">{a.conversions}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">{formatPrice(a.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody></Table></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══ CAMPAIGN DIALOG ═══ */}
      <Dialog open={cDialog} onOpenChange={(o) => { if (!o) setCDialog(false) }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingC ? 'Modifier la Campagne' : 'Creer une Campagne'}</DialogTitle><DialogDescription>Definissez le budget et la periode de votre campagne.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Nom *</Label><Input placeholder="Ex: Promo Parfums Juin" value={cForm.name} onChange={(e) => setCForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Aeroport</Label><Select value={cForm.airportCode} onValueChange={(v) => setCForm((f) => ({ ...f, airportCode: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DSS">DSS - Dakar</SelectItem><SelectItem value="ABJ">ABJ - Abidjan</SelectItem><SelectItem value="BKO">BKO - Bamako</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Date debut *</Label><Input type="date" value={cForm.startDate} onChange={(e) => setCForm((f) => ({ ...f, startDate: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Date fin *</Label><Input type="date" value={cForm.endDate} onChange={(e) => setCForm((f) => ({ ...f, endDate: e.target.value }))} /></div>
            </div>
            <div className="grid gap-2"><Label>Budget total (FCFA) *</Label><Input type="number" min={0} value={cForm.totalBudget} onChange={(e) => setCForm((f) => ({ ...f, totalBudget: parseInt(e.target.value) || 0 }))} /></div>
            <div className="grid gap-2"><Label>Description</Label><Textarea placeholder="Description..." value={cForm.description} onChange={(e) => setCForm((f) => ({ ...f, description: e.target.value }))} rows={3} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCDialog(false)}>Annuler</Button><Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSaveC} disabled={cSubmitting}>{cSubmitting ? 'Enregistrement...' : editingC ? 'Mettre a jour' : 'Creer'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ AD DIALOG ═══ */}
      <Dialog open={aDialog} onOpenChange={(o) => { if (!o) setADialog(false) }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingA ? "Modifier l'Annonce" : "Creer une Annonce"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Titre *</Label><Input placeholder="Ex: Promo Parfums -20%" value={aForm.title} onChange={(e) => setAForm((f) => ({ ...f, title: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Type *</Label><Select value={aForm.type} onValueChange={(v) => setAForm((f) => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TYPE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2"><Label>Placement *</Label><Select value={aForm.placement} onValueChange={(v) => setAForm((f) => ({ ...f, placement: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PLACEMENT_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid gap-2"><Label>Image URL *</Label><Input placeholder="https://..." value={aForm.imageUrl} onChange={(e) => setAForm((f) => ({ ...f, imageUrl: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Description</Label><Textarea placeholder="Description de l'annonce..." value={aForm.description} onChange={(e) => setAForm((f) => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>URL cible</Label><Input placeholder="https://..." value={aForm.targetUrl} onChange={(e) => setAForm((f) => ({ ...f, targetUrl: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Texte CTA</Label><Input placeholder="En savoir plus" value={aForm.ctaText} onChange={(e) => setAForm((f) => ({ ...f, ctaText: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Date debut *</Label><Input type="date" value={aForm.startDate} onChange={(e) => setAForm((f) => ({ ...f, startDate: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Date fin *</Label><Input type="date" value={aForm.endDate} onChange={(e) => setAForm((f) => ({ ...f, endDate: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Budget (FCFA) *</Label><Input type="number" min={0} value={aForm.budget} onChange={(e) => setAForm((f) => ({ ...f, budget: parseInt(e.target.value) || 0 }))} /></div>
              <div className="grid gap-2"><Label>Type budget</Label><Select value={aForm.budgetType} onValueChange={(v) => setAForm((f) => ({ ...f, budgetType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(BUDGET_TYPE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
            </div>
            {aForm.budgetType === 'cpm' && <div className="grid gap-2"><Label>Taux CPM (FCFA)</Label><Input type="number" min={0} value={aForm.cpmRate} onChange={(e) => setAForm((f) => ({ ...f, cpmRate: parseFloat(e.target.value) || 0 }))} /></div>}
            {aForm.budgetType === 'cpc' && <div className="grid gap-2"><Label>Taux CPC (FCFA)</Label><Input type="number" min={0} value={aForm.cpcRate} onChange={(e) => setAForm((f) => ({ ...f, cpcRate: parseFloat(e.target.value) || 0 }))} /></div>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setADialog(false)}>Annuler</Button><Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSaveA} disabled={aSubmitting}>{aSubmitting ? 'Enregistrement...' : editingA ? 'Mettre a jour' : 'Creer'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ REJECT DIALOG ═══ */}
      <Dialog open={rejectDialog} onOpenChange={(o) => { if (!o) setRejectDialog(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Rejeter l&apos;annonce</DialogTitle><DialogDescription>Annonce: {rejectingA?.title}</DialogDescription></DialogHeader>
          <div className="py-4"><Label className="text-sm">Raison du rejet *</Label><Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="Expliquez pourquoi cette annonce est rejetee..." /></div>
          <DialogFooter><Button variant="outline" onClick={() => setRejectDialog(false)}>Annuler</Button><Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleReject}>Rejeter</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE CAMPAIGN DIALOG ═══ */}
      <AlertDialog open={deleteCDialog} onOpenChange={setDeleteCDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la campagne</AlertDialogTitle>
            <AlertDialogDescription>Supprimer &quot;{deletingC?.name}&quot; ? Cette action supprimera egalement toutes les annonces associees.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteC}>Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
