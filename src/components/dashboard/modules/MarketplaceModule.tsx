'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Store, Package, ShoppingCart, Star, Plus, Eye, Pencil, Trash2,
  CheckCircle, Clock, AlertCircle, Search, Shield, MessageSquare, X,
  Wallet, ArrowUpRight, CheckCircle2,
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

interface Merchant {
  id: string; airportCode: string; name: string; description?: string; logo?: string
  category: string; terminal: string; gate?: string; phone: string; email: string
  isActive: boolean; isVerified: boolean; commissionRate: number; paymentSchedule: string
  totalSales: number; totalOrders: number; averageRating: number; reviewsCount: number
  productCount?: number; createdAt: string
}

interface Product {
  id: string; merchantId: string; merchantName?: string; name: string; description?: string
  category: string; price: number; currency: string; stock: number
  isAvailable: boolean; isPreOrder: boolean; tags: string[]; discountPercent: number; createdAt: string
}

interface Order {
  id: string; orderNumber: string; merchantId: string; merchantName?: string; airportCode: string
  customerName: string; customerPhone: string; type: string; status: string
  subtotal: number; tax: number; deliveryFee: number; total: number
  currency: string; paymentMethod?: string; paymentStatus: string
  items?: OrderItem[]; createdAt: string; completedAt?: string; cancelledAt?: string
}

interface OrderItem {
  id: string; productName: string; quantity: number; unitPrice: number; discount: number; total: number
}

interface Review {
  id: string; merchantId: string; merchantName?: string; customerName: string; rating: number
  comment?: string; isVerified: boolean; response?: string; createdAt: string
}

interface Payout {
  id: string; merchantId: string; merchantName?: string; merchantAirport?: string
  orderId: string; orderTotal: number; commissionRate: number; commissionAmount: number
  currency: string; status: string; paidAt?: string; reference?: string; notes?: string
  createdAt: string
}

// ── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  duty_free: 'Duty-Free', restaurant: 'Restaurant', cafe: 'Cafe', souvenir: 'Souvenirs',
  fashion: 'Mode', electronics: 'Electronique', pharmacy: 'Pharmacie', other: 'Autre',
}

const PRODUCT_CATEGORIES: Record<string, string> = {
  perfume: 'Parfum', alcohol: 'Alcool', tobacco: 'Tabac', food: 'Nourriture',
  beverage: 'Boisson', clothing: 'Vetements', accessory: 'Accessoire',
  electronics: 'Electronique', book: 'Livre', other: 'Autre',
}

const AIRPORT_OPTIONS = [
  { value: 'DSS', label: 'DSS - AIBD Dakar' },
  { value: 'ABJ', label: 'ABJ - Felix Houphouet-Boigny' },
  { value: 'BKO', label: 'BKO - Modibo Keita' },
  { value: 'LOS', label: 'LOS - Murtala Muhammed' },
  { value: 'ACC', label: 'ACC - Kotoka' },
]

const ORDER_STATUS: Record<string, { cls: string; label: string }> = {
  pending: { cls: 'bg-amber-100 text-amber-800 border-amber-200', label: 'En attente' },
  confirmed: { cls: 'bg-sky-100 text-sky-800 border-sky-200', label: 'Confirmee' },
  preparing: { cls: 'bg-orange-100 text-orange-800 border-orange-200', label: 'En preparation' },
  ready: { cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Pret' },
  completed: { cls: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Terminee' },
  cancelled: { cls: 'bg-red-100 text-red-800 border-red-200', label: 'Annulee' },
}

const PAYMENT_STATUS: Record<string, { cls: string; label: string }> = {
  pending: { cls: 'bg-amber-100 text-amber-800 border-amber-200', label: 'En attente' },
  paid: { cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Paye' },
  refunded: { cls: 'bg-red-100 text-red-800 border-red-200', label: 'Rembourse' },
}

const PAYOUT_STATUS: Record<string, { cls: string; label: string }> = {
  pending: { cls: 'bg-amber-100 text-amber-800 border-amber-200', label: 'En attente' },
  processing: { cls: 'bg-sky-100 text-sky-800 border-sky-200', label: 'En cours' },
  paid: { cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Paye' },
  failed: { cls: 'bg-red-100 text-red-800 border-red-200', label: 'Echoue' },
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(p: number): string { return new Intl.NumberFormat('fr-FR').format(p) + ' FCFA' }

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <Star key={i} className={`size-3 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{rating}/5</span>
    </span>
  )
}

function Spinner() {
  return (<div className="flex items-center justify-center py-12"><div className="size-8 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" /></div>)
}

function EmptyState({ message, icon: Icon }: { message: string; icon: React.ElementType }) {
  return (<div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Icon className="size-10 mb-3 opacity-40" /><p>{message}</p></div>)
}

function StatCard({ title, value, icon, colorClass, iconBgClass }: {
  title: string; value: number | string; icon: React.ReactNode; colorClass: string; iconBgClass: string
}) {
  return (
    <Card className={`border-l-4 ${colorClass.replace('text-', 'border-l-')} overflow-hidden`}>
      <CardContent className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBgClass}`}>{icon}</div>
        <div><p className="text-sm text-muted-foreground">{title}</p><p className={`text-2xl font-bold ${colorClass}`}>{value}</p></div>
      </CardContent>
    </Card>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

export function MarketplaceModule() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loadingM, setLoadingM] = useState(true)
  const [loadingP, setLoadingP] = useState(true)
  const [loadingO, setLoadingO] = useState(true)
  const [loadingR, setLoadingR] = useState(false)
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loadingPayout, setLoadingPayout] = useState(false)
  const [payoutStats, setPayoutStats] = useState({ totalPending: 0, totalPaid: 0, totalAmount: 0 })
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('merchants')

  // Merchant dialog
  const [mDialog, setMDialog] = useState(false)
  const [editingM, setEditingM] = useState<Merchant | null>(null)
  const [mForm, setMForm] = useState({ name: '', airportCode: 'DSS', category: 'duty_free', terminal: '', gate: '', phone: '', email: '', description: '', commissionRate: 10, paymentSchedule: 'weekly' })
  const [mSubmitting, setMSubmitting] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [deletingM, setDeletingM] = useState<Merchant | null>(null)

  // Product dialog
  const [pDialog, setPDialog] = useState(false)
  const [editingP, setEditingP] = useState<Product | null>(null)
  const [pForm, setPForm] = useState({ merchantId: '', name: '', category: 'other', price: 0, stock: 0, description: '', tags: '', discountPercent: 0, isPreOrder: false, isAvailable: true })
  const [pSubmitting, setPSubmitting] = useState(false)

  // Order view dialog
  const [oDialog, setODialog] = useState(false)
  const [viewOrder, setViewOrder] = useState<Order | null>(null)

  // Review response dialog
  const [rDialog, setRDialog] = useState(false)
  const [editingR, setEditingR] = useState<Review | null>(null)
  const [rResponse, setRResponse] = useState('')

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchMerchants = useCallback(async () => {
    setLoadingM(true)
    try {
      const res = await fetch('/api/merchants?airport=DSS')
      if (res.ok) { const j = await res.json(); setMerchants(j.success ? j.data : []) } else setMerchants([])
    } catch { setMerchants([]) } finally { setLoadingM(false) }
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoadingP(true)
    try {
      const res = await fetch('/api/products?available=false')
      if (res.ok) { const j = await res.json(); setProducts(j.success ? j.data : []) } else setProducts([])
    } catch { setProducts([]) } finally { setLoadingP(false) }
  }, [])

  const fetchOrders = useCallback(async () => {
    setLoadingO(true)
    try {
      const res = await fetch('/api/orders')
      if (res.ok) { const j = await res.json(); setOrders(j.success ? j.data : []) } else setOrders([])
    } catch { setOrders([]) } finally { setLoadingO(false) }
  }, [])

  const fetchReviews = useCallback(async (merchantId?: string) => {
    if (!merchantId) return
    setLoadingR(true)
    try {
      const res = await fetch(`/api/merchants/${merchantId}/reviews`)
      if (res.ok) { const j = await res.json(); setReviews(j.success ? j.data : []) } else setReviews([])
    } catch { setReviews([]) } finally { setLoadingR(false) }
  }, [])

  const fetchPayouts = useCallback(async () => {
    setLoadingPayout(true)
    try {
      const res = await fetch('/api/payouts')
      if (res.ok) { const j = await res.json(); setPayouts(j.success ? j.data : []); if (j.success && j.stats) setPayoutStats(j.stats) }
    } catch { setPayouts([]) } finally { setLoadingPayout(false) }
  }, [])

  useEffect(() => { fetchMerchants(); fetchProducts(); fetchOrders(); fetchPayouts() }, [fetchMerchants, fetchProducts, fetchOrders, fetchPayouts])

  // ── Merchant CRUD ──────────────────────────────────────────────────────────
  const openCreateM = () => { setEditingM(null); setMForm({ name: '', airportCode: 'DSS', category: 'duty_free', terminal: '', gate: '', phone: '', email: '', description: '', commissionRate: 10, paymentSchedule: 'weekly' }); setMDialog(true) }
  const openEditM = (m: Merchant) => { setEditingM(m); setMForm({ name: m.name, airportCode: m.airportCode, category: m.category, terminal: m.terminal, gate: m.gate || '', phone: m.phone, email: m.email, description: m.description || '', commissionRate: Math.round(m.commissionRate * 100), paymentSchedule: m.paymentSchedule }); setMDialog(true) }

  const handleSaveM = async () => {
    if (!mForm.name.trim()) { toast.error('Le nom est requis'); return }
    if (!mForm.phone.trim()) { toast.error('Le telephone est requis'); return }
    if (!mForm.email.trim()) { toast.error("L'email est requis"); return }
    setMSubmitting(true)
    try {
      const url = editingM ? `/api/merchants/${editingM.id}` : '/api/merchants'
      const res = await fetch(url, { method: editingM ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...mForm, commissionRate: mForm.commissionRate / 100 }) })
      if (res.ok) { toast.success(editingM ? 'Marchand mis a jour' : 'Marchand cree'); setMDialog(false); fetchMerchants() } else { const e = await res.json().catch(() => ({})); toast.error(e.error || 'Erreur') }
    } catch { toast.error('Erreur reseau') } finally { setMSubmitting(false) }
  }

  const handleVerifyM = async (m: Merchant) => {
    try {
      const res = await fetch(`/api/merchants/${m.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isVerified: !m.isVerified }) })
      if (res.ok) { toast.success(m.isVerified ? 'Marchand de-verifie' : 'Marchand verifie'); fetchMerchants() }
    } catch { toast.error('Erreur') }
  }

  const handleDeleteM = async () => {
    if (!deletingM) return
    try {
      const res = await fetch(`/api/merchants/${deletingM.id}`, { method: 'DELETE' })
      if (res.ok) { toast.success('Marchand desactive'); fetchMerchants() } else toast.error('Erreur')
    } catch { toast.error('Erreur') } finally { setDeleteDialog(false); setDeletingM(null) }
  }

  // ── Product CRUD ───────────────────────────────────────────────────────────
  const openCreateP = () => { setEditingP(null); setPForm({ merchantId: merchants[0]?.id || '', name: '', category: 'other', price: 0, stock: 0, description: '', tags: '', discountPercent: 0, isPreOrder: false, isAvailable: true }); setPDialog(true) }
  const openEditP = (p: Product) => { setEditingP(p); setPForm({ merchantId: p.merchantId, name: p.name, category: p.category, price: p.price, stock: p.stock, description: p.description || '', tags: Array.isArray(p.tags) ? p.tags.join(', ') : '', discountPercent: p.discountPercent, isPreOrder: p.isPreOrder, isAvailable: p.isAvailable }); setPDialog(true) }

  const handleSaveP = async () => {
    if (!pForm.name.trim()) { toast.error('Le nom est requis'); return }
    if (!pForm.merchantId) { toast.error('Selectionnez un marchand'); return }
    setPSubmitting(true)
    try {
      const url = editingP ? `/api/products/${editingP.id}` : `/api/merchants/${pForm.merchantId}/products`
      const res = await fetch(url, { method: editingP ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...pForm, tags: pForm.tags.split(',').map((t) => t.trim()).filter(Boolean) }) })
      if (res.ok) { toast.success(editingP ? 'Produit mis a jour' : 'Produit cree'); setPDialog(false); fetchProducts() } else { const e = await res.json().catch(() => ({})); toast.error(e.error || 'Erreur') }
    } catch { toast.error('Erreur') } finally { setPSubmitting(false) }
  }

  const handleDeleteP = async (id: string) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (res.ok) { toast.success('Produit supprime'); fetchProducts() } else toast.error('Erreur')
    } catch { toast.error('Erreur') }
  }

  // ── Order Actions ──────────────────────────────────────────────────────────
  const updateOrder = async (id: string, action: string) => {
    try {
      const res = await fetch(`/api/orders/${id}/${action}`, { method: 'PUT' })
      if (res.ok) { toast.success(`Commande ${action === 'confirm' ? 'confirmee' : action === 'ready' ? 'prete' : action === 'complete' ? 'terminee' : 'annulee'}`); fetchOrders() } else toast.error('Erreur')
    } catch { toast.error('Erreur') }
  }

  // ── Review Response ────────────────────────────────────────────────────────
  const openReviewResponse = (r: Review) => { setEditingR(r); setRResponse(r.response || ''); setRDialog(true) }
  const handleReviewResponse = async () => {
    if (!editingR) return
    try {
      const res = await fetch(`/api/reviews/${editingR.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ response: rResponse }) })
      if (res.ok) { toast.success('Reponse enregistree'); setRDialog(false); if (editingR.merchantId) fetchReviews(editingR.merchantId) } else toast.error('Erreur')
    } catch { toast.error('Erreur') }
  }

  // ── Payout Action ──────────────────────────────────────────────────────────
  const processPayout = async (payoutId: string) => {
    try {
      const res = await fetch(`/api/payouts/${payoutId}/pay`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminId: 'system', reference: `PAY-${Date.now()}` }) })
      if (res.ok) { toast.success('Commission marquee comme payee'); fetchPayouts() } else toast.error('Erreur')
    } catch { toast.error('Erreur') }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (activeTab === 'merchants') return merchants.filter((m) => { if (!search) return true; const q = search.toLowerCase(); return m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) })
    if (activeTab === 'products') return products.filter((p) => { if (!search) return true; const q = search.toLowerCase(); return p.name.toLowerCase().includes(q) || (p.merchantName || '').toLowerCase().includes(q) })
    if (activeTab === 'orders') return orders.filter((o) => { if (!search) return true; const q = search.toLowerCase(); return o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || (o.merchantName || '').toLowerCase().includes(q) })
    if (activeTab === 'payouts') return payouts
    return reviews
  }, [activeTab, search, merchants, products, orders, reviews, payouts])

  const activeMerchants = merchants.filter((m) => m.isActive).length
  const verifiedMerchants = merchants.filter((m) => m.isVerified).length
  const totalRevenue = orders.filter((o) => o.status === 'completed').reduce((s, o) => s + o.total, 0)

  // ══════════════════════════════════════════════════════════════════════════
  // ── RENDER ──────────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Marketplace Marchands</h2>
        <p className="text-muted-foreground text-sm">Gestion des commercants, produits et commandes</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearch('') }} className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="merchants" className="gap-1.5"><Store className="h-4 w-4" /><span className="hidden sm:inline">Marchands</span></TabsTrigger>
          <TabsTrigger value="products" className="gap-1.5"><Package className="h-4 w-4" /><span className="hidden sm:inline">Produits</span></TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5"><ShoppingCart className="h-4 w-4" /><span className="hidden sm:inline">Commandes</span></TabsTrigger>
          <TabsTrigger value="reviews" className="gap-1.5"><Star className="h-4 w-4" /><span className="hidden sm:inline">Avis</span></TabsTrigger>
          <TabsTrigger value="payouts" className="gap-1.5"><Wallet className="h-4 w-4" /><span className="hidden sm:inline">Commissions</span></TabsTrigger>
        </TabsList>

        {/* ═══ TAB: Marchands ═══ */}
        <TabsContent value="merchants" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard title="Total Marchands" value={merchants.length} icon={<Store className="size-6 text-orange-600 dark:text-orange-400" />} colorClass="text-orange-600 dark:text-orange-400" iconBgClass="bg-orange-100 dark:bg-orange-900/30" />
            <StatCard title="Actifs" value={activeMerchants} icon={<CheckCircle className="size-6 text-emerald-600 dark:text-emerald-400" />} colorClass="text-emerald-600 dark:text-emerald-400" iconBgClass="bg-emerald-100 dark:bg-emerald-900/30" />
            <StatCard title="Verifies" value={verifiedMerchants} icon={<Shield className="size-6 text-sky-600 dark:text-sky-400" />} colorClass="text-sky-600 dark:text-sky-400" iconBgClass="bg-sky-100 dark:bg-sky-900/30" />
          </div>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Marchands ({merchants.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-60"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Rechercher..." className="pl-9 h-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={openCreateM}><Plus className="size-4" /><span className="hidden sm:inline ml-1">Ajouter</span></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingM ? <Spinner /> : filtered.length === 0 ? <EmptyState message="Aucun marchand trouve" icon={Store} /> : (
                <div className="max-h-[500px] overflow-y-auto"><Table><TableHeader><TableRow>
                  <TableHead>Nom</TableHead><TableHead>Categorie</TableHead><TableHead className="hidden md:table-cell">Terminal</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Commission</TableHead><TableHead>Note</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader><TableBody>
                  {(filtered as Merchant[]).map((m) => (
                    <TableRow key={m.id}>
                      <TableCell><p className="font-medium">{m.name}</p><p className="text-xs text-muted-foreground">{m.email}</p></TableCell>
                      <TableCell><Badge variant="outline">{CATEGORY_LABELS[m.category] || m.category}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{m.terminal || '—'}{m.gate ? ` / ${m.gate}` : ''}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right text-sm">{m.commissionRate > 0 ? `${Math.round(m.commissionRate * 100)}%` : '—'}</TableCell>
                      <TableCell><Stars rating={Math.round(m.averageRating)} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge className={m.isActive ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}>{m.isActive ? 'Actif' : 'Inactif'}</Badge>
                          {m.isVerified && <Badge className="bg-sky-100 text-sky-700 border-sky-200">Verifie</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="outline" size="sm" className="h-7 text-xs text-sky-500 border-sky-200" onClick={() => handleVerifyM(m)} title={m.isVerified ? 'De-verifier' : 'Verifier'}><Shield className="size-3" /></Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs text-orange-500 border-orange-200" onClick={() => openEditM(m)}><Pencil className="size-3" /></Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs text-red-500 border-red-200" onClick={() => { setDeletingM(m); setDeleteDialog(true) }}><Trash2 className="size-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody></Table></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB: Produits ═══ */}
        <TabsContent value="products" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard title="Total Produits" value={products.length} icon={<Package className="size-6 text-orange-600 dark:text-orange-400" />} colorClass="text-orange-600 dark:text-orange-400" iconBgClass="bg-orange-100 dark:bg-orange-900/30" />
            <StatCard title="Disponibles" value={products.filter((p) => p.isAvailable).length} icon={<CheckCircle className="size-6 text-emerald-600 dark:text-emerald-400" />} colorClass="text-emerald-600 dark:text-emerald-400" iconBgClass="bg-emerald-100 dark:bg-emerald-900/30" />
            <StatCard title="En Rupture" value={products.filter((p) => p.stock === 0).length} icon={<AlertCircle className="size-6 text-red-600 dark:text-red-400" />} colorClass="text-red-600 dark:text-red-400" iconBgClass="bg-red-100 dark:bg-red-900/30" />
          </div>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Produits ({products.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-60"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Rechercher..." className="pl-9 h-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={openCreateP}><Plus className="size-4" /><span className="hidden sm:inline ml-1">Ajouter</span></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingP ? <Spinner /> : filtered.length === 0 ? <EmptyState message="Aucun produit trouve" icon={Package} /> : (
                <div className="max-h-[500px] overflow-y-auto"><Table><TableHeader><TableRow>
                  <TableHead>Nom</TableHead><TableHead className="hidden md:table-cell">Marchand</TableHead><TableHead>Categorie</TableHead>
                  <TableHead className="text-right">Prix</TableHead><TableHead className="hidden sm:table-cell">Stock</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader><TableBody>
                  {(filtered as Product[]).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.merchantName || '—'}</TableCell>
                      <TableCell><Badge variant="outline">{PRODUCT_CATEGORIES[p.category] || p.category}</Badge></TableCell>
                      <TableCell className="text-right text-sm">{p.discountPercent > 0 ? <><span className="text-red-500 line-through">{formatPrice(p.price)}</span><br /><span className="font-medium">{formatPrice(p.price * (1 - p.discountPercent / 100))}</span></> : <span className="font-medium">{formatPrice(p.price)}</span>}</TableCell>
                      <TableCell className="hidden sm:table-cell"><span className={p.stock === 0 ? 'text-red-600 font-medium' : ''}>{p.stock}</span></TableCell>
                      <TableCell><Badge className={p.isAvailable ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}>{p.isAvailable ? 'Disponible' : 'Indisponible'}</Badge></TableCell>
                      <TableCell className="text-right"><div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm" className="h-7 text-xs text-orange-500 border-orange-200" onClick={() => openEditP(p)}><Pencil className="size-3" /></Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs text-red-500 border-red-200" onClick={() => handleDeleteP(p.id)}><Trash2 className="size-3" /></Button>
                      </div></TableCell>
                    </TableRow>
                  ))}
                </TableBody></Table></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB: Commandes ═══ */}
        <TabsContent value="orders" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Commandes" value={orders.length} icon={<ShoppingCart className="size-6 text-orange-600 dark:text-orange-400" />} colorClass="text-orange-600 dark:text-orange-400" iconBgClass="bg-orange-100 dark:bg-orange-900/30" />
            <StatCard title="En Cours" value={orders.filter((o) => !['completed', 'cancelled'].includes(o.status)).length} icon={<Clock className="size-6 text-amber-600 dark:text-amber-400" />} colorClass="text-amber-600 dark:text-amber-400" iconBgClass="bg-amber-100 dark:bg-amber-900/30" />
            <StatCard title="Terminees" value={orders.filter((o) => o.status === 'completed').length} icon={<CheckCircle className="size-6 text-emerald-600 dark:text-emerald-400" />} colorClass="text-emerald-600 dark:text-emerald-400" iconBgClass="bg-emerald-100 dark:bg-emerald-900/30" />
            <StatCard title="Revenu Total" value={formatPrice(totalRevenue)} icon={<Package className="size-6 text-sky-600 dark:text-sky-400" />} colorClass="text-sky-600 dark:text-sky-400" iconBgClass="bg-sky-100 dark:bg-sky-900/30" />
          </div>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Commandes ({orders.length})</CardTitle>
                <div className="relative w-full sm:w-60"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Rechercher..." className="pl-9 h-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingO ? <Spinner /> : filtered.length === 0 ? <EmptyState message="Aucune commande trouvee" icon={ShoppingCart} /> : (
                <div className="max-h-[500px] overflow-y-auto"><Table><TableHeader><TableRow>
                  <TableHead>N°</TableHead><TableHead>Client</TableHead><TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="text-right">Total</TableHead><TableHead className="hidden sm:table-cell">Paiement</TableHead>
                  <TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader><TableBody>
                  {(filtered as Order[]).map((o) => {
                    const st = ORDER_STATUS[o.status] || { cls: '', label: o.status }
                    const ps = PAYMENT_STATUS[o.paymentStatus] || { cls: '', label: o.paymentStatus }
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.orderNumber}</TableCell>
                        <TableCell><p className="font-medium">{o.customerName}</p><p className="text-xs text-muted-foreground">{o.customerPhone}</p></TableCell>
                        <TableCell className="hidden md:table-cell"><Badge variant="outline">{o.type === 'delivery_gate' ? 'Livraison porte' : o.type === 'reservation' ? 'Reservation' : 'Retrait'}</Badge></TableCell>
                        <TableCell className="text-right font-medium">{formatPrice(o.total)}</TableCell>
                        <TableCell className="hidden sm:table-cell"><Badge className={ps.cls}>{ps.label}</Badge></TableCell>
                        <TableCell><Badge className={st.cls}>{st.label}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="outline" size="sm" className="h-7 text-xs text-sky-500 border-sky-200" onClick={() => { setViewOrder(o); setODialog(true) }}><Eye className="size-3" /></Button>
                            {o.status === 'pending' && <Button variant="outline" size="sm" className="h-7 text-xs text-emerald-500 border-emerald-200" onClick={() => updateOrder(o.id, 'confirm')}><CheckCircle className="size-3" /></Button>}
                            {o.status === 'confirmed' && <Button variant="outline" size="sm" className="h-7 text-xs text-orange-500 border-orange-200" onClick={() => updateOrder(o.id, 'ready')}>Pret</Button>}
                            {o.status === 'ready' && <Button variant="outline" size="sm" className="h-7 text-xs text-emerald-500 border-emerald-200" onClick={() => updateOrder(o.id, 'complete')}>Terminer</Button>}
                            {!['completed', 'cancelled'].includes(o.status) && <Button variant="outline" size="sm" className="h-7 text-xs text-red-500 border-red-200" onClick={() => updateOrder(o.id, 'cancel')}><X className="size-3" /></Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody></Table></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB: Avis ═══ */}
        <TabsContent value="reviews" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Avis ({reviews.length})</CardTitle>
                <Select onValueChange={(v) => fetchReviews(v)}><SelectTrigger className="w-60"><SelectValue placeholder="Selectionner un marchand" /></SelectTrigger>
                  <SelectContent>{merchants.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loadingR ? <Spinner /> : reviews.length === 0 ? <EmptyState message="Selectionnez un marchand pour voir les avis" icon={Star} /> : (
                <div className="max-h-[500px] overflow-y-auto"><Table><TableHeader><TableRow>
                  <TableHead>Client</TableHead><TableHead>Note</TableHead><TableHead>Commentaire</TableHead>
                  <TableHead className="hidden sm:table-cell">Verifie</TableHead><TableHead className="hidden md:table-cell">Reponse</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader><TableBody>
                  {reviews.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.customerName}</TableCell>
                      <TableCell><Stars rating={r.rating} /></TableCell>
                      <TableCell className="max-w-48 text-sm">{r.comment || '—'}</TableCell>
                      <TableCell className="hidden sm:table-cell"><Badge className={r.isVerified ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}>{r.isVerified ? 'Oui' : 'Non'}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell text-sm max-w-48">{r.response || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="h-7 text-xs text-orange-500 border-orange-200" onClick={() => openReviewResponse(r)}><MessageSquare className="size-3" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody></Table></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB: Commissions ═══ */}
        <TabsContent value="payouts" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard title="Total Commissions" value={formatPrice(payoutStats.totalAmount)} icon={<Wallet className="size-6 text-orange-600 dark:text-orange-400" />} colorClass="text-orange-600 dark:text-orange-400" iconBgClass="bg-orange-100 dark:bg-orange-900/30" />
            <StatCard title="En Attente" value={formatPrice(payoutStats.totalPending)} icon={<Clock className="size-6 text-amber-600 dark:text-amber-400" />} colorClass="text-amber-600 dark:text-amber-400" iconBgClass="bg-amber-100 dark:bg-amber-900/30" />
            <StatCard title="Payees" value={formatPrice(payoutStats.totalPaid)} icon={<CheckCircle className="size-6 text-emerald-600 dark:text-emerald-400" />} colorClass="text-emerald-600 dark:text-emerald-400" iconBgClass="bg-emerald-100 dark:bg-emerald-900/30" />
          </div>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Commissions ({payouts.length})</CardTitle>
                <Button variant="outline" onClick={fetchPayouts}><CheckCircle2 className="size-4 mr-1" /> Rafraichir</Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPayout ? <Spinner /> : payouts.length === 0 ? <EmptyState message="Aucune commission trouvee" icon={Wallet} /> : (
                <div className="max-h-[500px] overflow-y-auto"><Table><TableHeader><TableRow>
                  <TableHead>Marchand</TableHead>
                  <TableHead className="hidden md:table-cell">N° Commande</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Commission</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader><TableBody>
                  {payouts.map((p) => {
                    const ps = PAYOUT_STATUS[p.status] || { cls: '', label: p.status }
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.merchantName || p.merchantId}</TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-xs">{p.orderId.slice(0, 8)}...</TableCell>
                        <TableCell className="text-right text-sm">{formatPrice(p.orderTotal)}</TableCell>
                        <TableCell className="hidden sm:table-cell text-right font-medium text-orange-600">{formatPrice(p.commissionAmount)}</TableCell>
                        <TableCell><Badge className={ps.cls}>{ps.label}</Badge></TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell className="text-right">
                          {p.status === 'pending' && (
                            <Button variant="outline" size="sm" className="h-7 text-xs text-emerald-500 border-emerald-200" onClick={() => processPayout(p.id)}><ArrowUpRight className="size-3 mr-1" />Payer</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody></Table></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══ MERCHANT DIALOG ═══ */}
      <Dialog open={mDialog} onOpenChange={(o) => { if (!o) setMDialog(false) }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingM ? 'Modifier le Marchand' : 'Ajouter un Marchand'}</DialogTitle><DialogDescription>{editingM ? 'Modifiez les informations.' : 'Creez un nouveau marchand.'}</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Nom *</Label><Input placeholder="Ex: Dakar Duty-Free" value={mForm.name} onChange={(e) => setMForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Categorie *</Label><Select value={mForm.category} onValueChange={(v) => setMForm((f) => ({ ...f, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CATEGORY_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2"><Label>Aeroport</Label><Select value={mForm.airportCode} onValueChange={(v) => setMForm((f) => ({ ...f, airportCode: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{AIRPORT_OPTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Terminal</Label><Input placeholder="Ex: Terminal 1" value={mForm.terminal} onChange={(e) => setMForm((f) => ({ ...f, terminal: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Porte</Label><Input placeholder="Ex: B12-B15" value={mForm.gate} onChange={(e) => setMForm((f) => ({ ...f, gate: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Telephone *</Label><Input placeholder="+221 77 123 45 67" value={mForm.phone} onChange={(e) => setMForm((f) => ({ ...f, phone: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Email *</Label><Input type="email" placeholder="contact@marchand.sn" value={mForm.email} onChange={(e) => setMForm((f) => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Commission (%)</Label><Input type="number" min={0} max={50} value={mForm.commissionRate} onChange={(e) => setMForm((f) => ({ ...f, commissionRate: parseFloat(e.target.value) || 0 }))} /></div>
              <div className="grid gap-2"><Label>Paiement</Label><Select value={mForm.paymentSchedule} onValueChange={(v) => setMForm((f) => ({ ...f, paymentSchedule: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Quotidien</SelectItem><SelectItem value="weekly">Hebdomadaire</SelectItem><SelectItem value="monthly">Mensuel</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid gap-2"><Label>Description</Label><Textarea placeholder="Description du marchand..." value={mForm.description} onChange={(e) => setMForm((f) => ({ ...f, description: e.target.value }))} rows={3} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setMDialog(false)}>Annuler</Button><Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSaveM} disabled={mSubmitting}>{mSubmitting ? 'Enregistrement...' : editingM ? 'Mettre a jour' : 'Creer'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ PRODUCT DIALOG ═══ */}
      <Dialog open={pDialog} onOpenChange={(o) => { if (!o) setPDialog(false) }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingP ? 'Modifier le Produit' : 'Ajouter un Produit'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Marchand *</Label><Select value={pForm.merchantId} onValueChange={(v) => setPForm((f) => ({ ...f, merchantId: v }))} disabled={!!editingP}><SelectTrigger><SelectValue placeholder="Selectionner" /></SelectTrigger><SelectContent>{merchants.filter((m) => m.isActive).map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2"><Label>Categorie *</Label><Select value={pForm.category} onValueChange={(v) => setPForm((f) => ({ ...f, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PRODUCT_CATEGORIES).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid gap-2"><Label>Nom *</Label><Input placeholder="Ex: Chanel N5" value={pForm.name} onChange={(e) => setPForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2"><Label>Prix (FCFA) *</Label><Input type="number" min={0} value={pForm.price} onChange={(e) => setPForm((f) => ({ ...f, price: parseInt(e.target.value) || 0 }))} /></div>
              <div className="grid gap-2"><Label>Stock *</Label><Input type="number" min={0} value={pForm.stock} onChange={(e) => setPForm((f) => ({ ...f, stock: parseInt(e.target.value) || 0 }))} /></div>
              <div className="grid gap-2"><Label>Remise (%)</Label><Input type="number" min={0} max={100} value={pForm.discountPercent} onChange={(e) => setPForm((f) => ({ ...f, discountPercent: parseInt(e.target.value) || 0 }))} /></div>
            </div>
            <div className="grid gap-2"><Label>Tags (separes par virgule)</Label><Input placeholder="bestseller, promo, new" value={pForm.tags} onChange={(e) => setPForm((f) => ({ ...f, tags: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Description</Label><Textarea placeholder="Description..." value={pForm.description} onChange={(e) => setPForm((f) => ({ ...f, description: e.target.value }))} rows={3} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPDialog(false)}>Annuler</Button><Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSaveP} disabled={pSubmitting}>{pSubmitting ? 'Enregistrement...' : editingP ? 'Mettre a jour' : 'Creer'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ ORDER VIEW DIALOG ═══ */}
      <Dialog open={oDialog} onOpenChange={(o) => { if (!o) setODialog(false) }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Commande {viewOrder?.orderNumber}</DialogTitle></DialogHeader>
          {viewOrder && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Client:</span><br /><strong>{viewOrder.customerName}</strong><br />{viewOrder.customerPhone}</div>
                <div><span className="text-muted-foreground">Type:</span><br /><Badge variant="outline">{viewOrder.type}</Badge><br /><span className="text-muted-foreground">Statut: <Badge className={ORDER_STATUS[viewOrder.status]?.cls}>{ORDER_STATUS[viewOrder.status]?.label}</Badge></span></div>
              </div>
              {viewOrder.items && viewOrder.items.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Articles</h4>
                  <div className="space-y-2">{viewOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm p-2 bg-muted rounded">
                      <div>{item.productName} x{item.quantity}</div>
                      <div className="font-medium">{formatPrice(item.total)}</div>
                    </div>
                  ))}</div>
                </div>
              )}
              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>Sous-total</span><span>{formatPrice(viewOrder.subtotal)}</span></div>
                <div className="flex justify-between"><span>TVA (18%)</span><span>{formatPrice(viewOrder.tax)}</span></div>
                <div className="flex justify-between"><span>Livraison</span><span>{viewOrder.deliveryFee > 0 ? formatPrice(viewOrder.deliveryFee) : 'Gratuite'}</span></div>
                <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span className="text-orange-600">{formatPrice(viewOrder.total)}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ REVIEW RESPONSE DIALOG ═══ */}
      <Dialog open={rDialog} onOpenChange={(o) => { if (!o) setRDialog(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Repondre a l&apos;avis</DialogTitle><DialogDescription>Avis de {editingR?.customerName} - {editingR?.rating}/5</DialogDescription></DialogHeader>
          <div className="py-4"><p className="text-sm mb-3 italic">&ldquo;{editingR?.comment || 'Pas de commentaire'}&rdquo;</p><Label className="text-sm">Votre reponse</Label><Textarea value={rResponse} onChange={(e) => setRResponse(e.target.value)} rows={3} placeholder="Repondez a cet avis..." /></div>
          <DialogFooter><Button variant="outline" onClick={() => setRDialog(false)}>Annuler</Button><Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleReviewResponse}>Envoyer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE DIALOG ═══ */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactiver le marchand</AlertDialogTitle>
            <AlertDialogDescription>Desactiver &quot;{deletingM?.name}&quot; ? Les donnees seront conservees.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteM}>Desactiver</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
