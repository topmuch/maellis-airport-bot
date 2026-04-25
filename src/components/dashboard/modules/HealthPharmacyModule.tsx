'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Pill, ShoppingCart, Clock, DollarSign, AlertTriangle, Plus,
  Eye, Search, Store, BarChart3, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ── Types ───────────────────────────────────────────────────────────────────

interface PharmacyOrder {
  id: string
  airportCode: string
  orderRef: string
  customerName: string
  customerPhone: string
  flightNumber: string
  gate: string
  urgency: 'normal' | 'urgent' | 'critical'
  items: string // JSON string of array
  subtotal: number
  deliveryFee: number
  total: number
  currency: string
  estimatedMinutes: number
  pharmacyId: string
  pharmacyName: string
  status: string
  paymentStatus: string
  createdAt: string
}

interface PharmacyStats {
  totalOrders: number
  statusBreakdown: Record<string, number>
  urgencyBreakdown: Record<string, number>
  totalRevenue: number
}

interface PharmacyMerchant {
  id: string
  name: string
  airportCode: string
  category: string
  terminal: string
  phone: string
  email: string
  isActive: boolean
  isVerified: boolean
  totalOrders: number
  averageRating: number
  description?: string
  gate?: string
}

interface CreateOrderForm {
  customerName: string
  customerPhone: string
  flightNumber: string
  gate: string
  urgency: 'normal' | 'urgent' | 'critical'
  items: string
}

// ── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { cls: string; label: string }> = {
  pending: { cls: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100', label: 'En attente' },
  confirmed: { cls: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100', label: 'Confirmée' },
  preparing: { cls: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100', label: 'En préparation' },
  ready: { cls: 'bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-100', label: 'Prête' },
  delivered: { cls: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100', label: 'Livrée' },
  completed: { cls: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100', label: 'Terminée' },
  cancelled: { cls: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100', label: 'Annulée' },
}

const URGENCY_CONFIG: Record<string, { cls: string; label: string; pulse?: boolean }> = {
  normal: { cls: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100', label: 'Normal' },
  urgent: { cls: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100', label: 'Urgent' },
  critical: { cls: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100', label: 'Critique', pulse: true },
}

const PAYMENT_STATUS_CONFIG: Record<string, { cls: string; label: string }> = {
  pending: { cls: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100', label: 'En attente' },
  paid: { cls: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100', label: 'Payé' },
  failed: { cls: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100', label: 'Échoué' },
  refunded: { cls: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100', label: 'Remboursé' },
}

const DEFAULT_ORDER_FORM: CreateOrderForm = {
  customerName: '',
  customerPhone: '',
  flightNumber: '',
  gate: '',
  urgency: 'normal',
  items: '',
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(p: number): string {
  return new Intl.NumberFormat('fr-FR').format(p) + ' FCFA'
}

function parseItems(itemsJson: string): Array<{ name: string; qty: number; price: number }> {
  try {
    const parsed = JSON.parse(itemsJson)
    if (Array.isArray(parsed)) return parsed
  } catch {
    // ignore
  }
  return []
}

// ── Badge Components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { cls: 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100', label: status }
  return <Badge className={cfg.cls}>{cfg.label}</Badge>
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const cfg = URGENCY_CONFIG[urgency] ?? { cls: 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100', label: urgency }
  return (
    <Badge className={`${cfg.cls} ${cfg.pulse ? 'animate-pulse' : ''}`}>
      {cfg.label}
    </Badge>
  )
}

function PaymentBadge({ paymentStatus }: { paymentStatus: string }) {
  const cfg = PAYMENT_STATUS_CONFIG[paymentStatus] ?? { cls: 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100', label: paymentStatus }
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
      <Loader2 className="size-8 animate-spin text-orange-500" />
    </div>
  )
}

// ── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ message, icon: Icon }: { message: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Icon className="size-10 mb-3 opacity-40" />
      <p>{message}</p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

export function HealthPharmacyModule() {
  // ── Data ──────────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<PharmacyOrder[]>([])
  const [stats, setStats] = useState<PharmacyStats>({
    totalOrders: 0,
    statusBreakdown: {},
    urgencyBreakdown: {},
    totalRevenue: 0,
  })
  const [merchants, setMerchants] = useState<PharmacyMerchant[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingMerchants, setLoadingMerchants] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // ── Dialog states ─────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PharmacyOrder | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [orderForm, setOrderForm] = useState<CreateOrderForm>(DEFAULT_ORDER_FORM)

  // ── Fetch Stats ───────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const res = await fetch('/api/pharmacy?action=stats')
      if (res.ok) {
        const json = await res.json()
        const data = json.data ?? json
        setStats({
          totalOrders: data.totalOrders ?? 0,
          statusBreakdown: data.statusBreakdown ?? {},
          urgencyBreakdown: data.urgencyBreakdown ?? {},
          totalRevenue: data.totalRevenue ?? 0,
        })
        return
      }
    } catch {
      // fallback
    }
    setStats({ totalOrders: 0, statusBreakdown: {}, urgencyBreakdown: {}, totalRevenue: 0 })
  }, [])

  // ── Fetch Orders ──────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true)
    try {
      const res = await fetch('/api/pharmacy?action=orders')
      if (res.ok) {
        const json = await res.json()
        const items = Array.isArray(json) ? json : (json.data ?? json.items ?? [])
        setOrders(items as PharmacyOrder[])
        return
      }
    } catch {
      // fallback
    }
    setOrders([])
  }, [])

  // ── Fetch Merchants ───────────────────────────────────────────────────────

  const fetchMerchants = useCallback(async () => {
    setLoadingMerchants(true)
    try {
      const res = await fetch('/api/merchants?category=pharmacy')
      if (res.ok) {
        const json = await res.json()
        const data = json.success ? json.data : (Array.isArray(json) ? json : [])
        setMerchants(data as PharmacyMerchant[])
        return
      }
    } catch {
      // fallback
    }
    setMerchants([])
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      await Promise.all([fetchStats(), fetchOrders(), fetchMerchants()])
      if (!cancelled) {
        setLoadingOrders(false)
        setLoadingStats(false)
        setLoadingMerchants(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreateOrder = async () => {
    if (!orderForm.customerName.trim() || !orderForm.customerPhone.trim() || !orderForm.gate.trim()) {
      toast.error('Veuillez remplir les champs obligatoires (client, téléphone, porte)')
      return
    }

    // Parse items from text input
    let parsedItems: Array<{ name: string; qty: number; price: number }> = []
    try {
      parsedItems = JSON.parse(orderForm.items)
      if (!Array.isArray(parsedItems)) parsedItems = []
    } catch {
      toast.error('Le format des articles doit être un tableau JSON valide')
      return
    }

    if (parsedItems.length === 0) {
      toast.error('Ajoutez au moins un article à la commande')
      return
    }

    setSubmitting(true)
    try {
      const subtotal = parsedItems.reduce((s, i) => s + (i.qty * i.price), 0)
      const deliveryFee = orderForm.urgency === 'critical' ? 2000 : orderForm.urgency === 'urgent' ? 1000 : 500

      const res = await fetch('/api/pharmacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: orderForm.customerName,
          customerPhone: orderForm.customerPhone,
          flightNumber: orderForm.flightNumber || undefined,
          gate: orderForm.gate,
          urgency: orderForm.urgency,
          items: parsedItems,
          subtotal,
          deliveryFee,
          total: subtotal + deliveryFee,
          currency: 'FCFA',
          estimatedMinutes: orderForm.urgency === 'critical' ? 10 : orderForm.urgency === 'urgent' ? 20 : 30,
        }),
      })

      if (res.ok) {
        toast.success('Commande pharmacie créée avec succès')
        setCreateOpen(false)
        setOrderForm(DEFAULT_ORDER_FORM)
        fetchOrders()
        fetchStats()
        return
      }
    } catch {
      // fallback to local
    }

    // Local fallback creation
    const subtotal = parsedItems.reduce((s, i) => s + (i.qty * i.price), 0)
    const deliveryFee = orderForm.urgency === 'critical' ? 2000 : orderForm.urgency === 'urgent' ? 1000 : 500
    const newOrder: PharmacyOrder = {
      id: `pharm-${Date.now()}`,
      airportCode: 'DSS',
      orderRef: `PHARM-${Date.now().toString(36).toUpperCase()}`,
      customerName: orderForm.customerName,
      customerPhone: orderForm.customerPhone,
      flightNumber: orderForm.flightNumber,
      gate: orderForm.gate,
      urgency: orderForm.urgency,
      items: JSON.stringify(parsedItems),
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      currency: 'FCFA',
      estimatedMinutes: orderForm.urgency === 'critical' ? 10 : orderForm.urgency === 'urgent' ? 20 : 30,
      pharmacyId: '',
      pharmacyName: 'Pharmacie Aéroport',
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
    }
    setOrders((prev) => [newOrder, ...prev])
    setStats((prev) => ({
      ...prev,
      totalOrders: prev.totalOrders + 1,
      totalRevenue: prev.totalRevenue + newOrder.total,
      statusBreakdown: {
        ...prev.statusBreakdown,
        pending: (prev.statusBreakdown.pending ?? 0) + 1,
      },
      urgencyBreakdown: {
        ...prev.urgencyBreakdown,
        [orderForm.urgency]: (prev.urgencyBreakdown[orderForm.urgency] ?? 0) + 1,
      },
    }))
    toast.success('Commande pharmacie créée avec succès')
    setCreateOpen(false)
    setOrderForm(DEFAULT_ORDER_FORM)
    setSubmitting(false)
  }

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      o.orderRef.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.gate.toLowerCase().includes(q) ||
      o.flightNumber.toLowerCase().includes(q) ||
      o.pharmacyName.toLowerCase().includes(q)
    )
  })

  // ── Derived stats ─────────────────────────────────────────────────────────

  const activeOrders = stats.totalOrders - (stats.statusBreakdown.completed ?? 0) - (stats.statusBreakdown.delivered ?? 0) - (stats.statusBreakdown.cancelled ?? 0)
  const urgentOrders = (stats.urgencyBreakdown.urgent ?? 0) + (stats.urgencyBreakdown.critical ?? 0)

  // ══════════════════════════════════════════════════════════════════════════
  // ── RENDER ────────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">💊 Pharmacie & Santé Express</h2>
          <p className="text-muted-foreground text-sm">
            Commande médicaments et produits de santé — Livraison à la porte d&apos;embarquement
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              <Plus className="size-4" />
              Nouvelle Commande
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvelle Commande Pharmacie</DialogTitle>
              <DialogDescription>
                Créez une commande de médicaments ou produits de santé avec livraison à la porte.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ph-customer">Nom du Client *</Label>
                  <Input
                    id="ph-customer"
                    placeholder="Ex: Amadou Diallo"
                    value={orderForm.customerName}
                    onChange={(e) => setOrderForm((f) => ({ ...f, customerName: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ph-phone">Téléphone *</Label>
                  <Input
                    id="ph-phone"
                    placeholder="+221 77 123 45 67"
                    value={orderForm.customerPhone}
                    onChange={(e) => setOrderForm((f) => ({ ...f, customerPhone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ph-flight">N° Vol</Label>
                  <Input
                    id="ph-flight"
                    placeholder="Ex: AF 722"
                    value={orderForm.flightNumber}
                    onChange={(e) => setOrderForm((f) => ({ ...f, flightNumber: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ph-gate">Porte d&apos;embarquement *</Label>
                  <Input
                    id="ph-gate"
                    placeholder="Ex: B12"
                    value={orderForm.gate}
                    onChange={(e) => setOrderForm((f) => ({ ...f, gate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Urgence</Label>
                <Select
                  value={orderForm.urgency}
                  onValueChange={(v) => setOrderForm((f) => ({ ...f, urgency: v as CreateOrderForm['urgency'] }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">
                      <span className="flex items-center gap-2">🟢 Normal (30 min)</span>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <span className="flex items-center gap-2">🟠 Urgent (20 min)</span>
                    </SelectItem>
                    <SelectItem value="critical">
                      <span className="flex items-center gap-2">🔴 Critique (10 min)</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ph-items">Articles (JSON) *</Label>
                <Input
                  id="ph-items"
                  placeholder='[{"name":"Paracétamol","qty":2,"price":500}]'
                  value={orderForm.items}
                  onChange={(e) => setOrderForm((f) => ({ ...f, items: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  {'Format : [{"name": "Produit", "qty": 1, "price": 500}]'}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Annuler
              </Button>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleCreateOrder}
                disabled={submitting}
              >
                {submitting ? 'Création...' : 'Créer la commande'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Commandes Totales"
          value={stats.totalOrders}
          icon={<ShoppingCart className="size-6 text-orange-600 dark:text-orange-400" />}
          colorClass="text-orange-600 dark:text-orange-400"
          iconBgClass="bg-orange-100 dark:bg-orange-900/30"
        />
        <StatCard
          title="En Cours"
          value={activeOrders}
          icon={<Clock className="size-6 text-blue-600 dark:text-blue-400" />}
          colorClass="text-blue-600 dark:text-blue-400"
          iconBgClass="bg-blue-100 dark:bg-blue-900/30"
        />
        <StatCard
          title="Revenu Total (FCFA)"
          value={formatPrice(stats.totalRevenue)}
          icon={<DollarSign className="size-6 text-emerald-600 dark:text-emerald-400" />}
          colorClass="text-emerald-600 dark:text-emerald-400"
          iconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
        />
        <StatCard
          title="Commandes Urgentes"
          value={urgentOrders}
          icon={<AlertTriangle className="size-6 text-red-600 dark:text-red-400" />}
          colorClass="text-red-600 dark:text-red-400"
          iconBgClass="bg-red-100 dark:bg-red-900/30"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="commandes" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="commandes" className="gap-1.5">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">📋 Commandes</span>
          </TabsTrigger>
          <TabsTrigger value="statistiques" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">📊 Statistiques</span>
          </TabsTrigger>
          <TabsTrigger value="pharmacies" className="gap-1.5">
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">🏪 Pharmacies</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════ TAB 1: Commandes ═══════════════════ */}
        <TabsContent value="commandes" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">
                  Commandes Pharmacie ({orders.length})
                </CardTitle>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par réf, client, porte..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingOrders ? (
                <Spinner />
              ) : filteredOrders.length === 0 ? (
                <EmptyState
                  icon={Pill}
                  message="Aucune commande pharmacie trouvée."
                />
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky top-0 bg-background z-10">Réf</TableHead>
                        <TableHead className="sticky top-0 bg-background z-10">Client</TableHead>
                        <TableHead className="sticky top-0 bg-background z-10 hidden sm:table-cell">Porte</TableHead>
                        <TableHead className="sticky top-0 bg-background z-10 hidden md:table-cell">Urgence</TableHead>
                        <TableHead className="sticky top-0 bg-background z-10 text-right">Montant</TableHead>
                        <TableHead className="sticky top-0 bg-background z-10 hidden sm:table-cell">Statut</TableHead>
                        <TableHead className="sticky top-0 bg-background z-10 hidden lg:table-cell">Date</TableHead>
                        <TableHead className="sticky top-0 bg-background z-10 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => {
                        const parsedItems = parseItems(order.items)
                        return (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-xs">
                              {order.orderRef}
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-sm">{order.customerName}</p>
                              <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <span className="text-sm font-medium">{order.gate}</span>
                              {order.flightNumber && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({order.flightNumber})
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <UrgencyBadge urgency={order.urgency} />
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {formatPrice(order.total)}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <StatusBadge status={order.status} />
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                              {format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs text-orange-500 border-orange-200 hover:bg-orange-50"
                                onClick={() => {
                                  setSelectedOrder(order)
                                  setViewOpen(true)
                                }}
                              >
                                <Eye className="size-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════ TAB 2: Statistiques ═══════════════════ */}
        <TabsContent value="statistiques" className="space-y-6">
          {loadingStats ? (
            <Card>
              <CardContent>
                <Spinner />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Status Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="size-5 text-orange-500" />
                    Répartition par Statut
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                    const count = stats.statusBreakdown[key] ?? 0
                    const pct = stats.totalOrders > 0 ? Math.round((count / stats.totalOrders) * 100) : 0
                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{cfg.label}</span>
                          <span className="text-muted-foreground">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              key === 'pending'
                                ? 'bg-yellow-500'
                                : key === 'confirmed'
                                  ? 'bg-blue-500'
                                  : key === 'preparing'
                                    ? 'bg-orange-500'
                                    : key === 'ready'
                                      ? 'bg-teal-500'
                                      : key === 'delivered' || key === 'completed'
                                        ? 'bg-green-500'
                                        : 'bg-red-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {/* Urgency Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="size-5 text-orange-500" />
                    Répartition par Urgence
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(URGENCY_CONFIG).map(([key, cfg]) => {
                    const count = stats.urgencyBreakdown[key] ?? 0
                    const pct = stats.totalOrders > 0 ? Math.round((count / stats.totalOrders) * 100) : 0
                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 font-medium">
                            <UrgencyBadge urgency={key} />
                          </span>
                          <span className="text-muted-foreground">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              key === 'normal'
                                ? 'bg-gray-400'
                                : key === 'urgent'
                                  ? 'bg-orange-500'
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </CardContent>

                {/* Summary Cards */}
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 p-3 text-center">
                    <p className="text-lg font-bold text-gray-600">{stats.urgencyBreakdown.normal ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Normales</p>
                  </div>
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-center">
                    <p className="text-lg font-bold text-orange-600">{stats.urgencyBreakdown.urgent ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Urgentes</p>
                  </div>
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                    <p className="text-lg font-bold text-red-600">{stats.urgencyBreakdown.critical ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Critiques</p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════ TAB 3: Pharmacies ═══════════════════ */}
        <TabsContent value="pharmacies" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">
                  Pharmacies Partenaires ({merchants.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loadingMerchants ? (
                <Spinner />
              ) : merchants.length === 0 ? (
                <EmptyState
                  icon={Store}
                  message="Aucune pharmacie partenaire trouvée."
                />
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky top-0 bg-background z-10">Nom</TableHead>
                        <TableHead className="sticky top-0 bg-background z-10 hidden md:table-cell">Terminal</TableHead>
                        <TableHead className="sticky top-0 bg-background z-10 hidden sm:table-cell">Contact</TableHead>
                        <TableHead className="sticky top-0 bg-background z-10 text-right hidden md:table-cell">Commandes</TableHead>
                        <TableHead className="sticky top-0 bg-background z-10 hidden lg:table-cell">Note</TableHead>
                        <TableHead className="sticky top-0 bg-background z-10">Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {merchants.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                                <Pill className="size-4 text-orange-600 dark:text-orange-400" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{m.name}</p>
                                <p className="text-xs text-muted-foreground">{m.description?.slice(0, 40) || m.category}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {m.terminal}{m.gate ? ` / ${m.gate}` : ''}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">
                            <p>{m.phone}</p>
                            <p className="text-xs text-muted-foreground">{m.email}</p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-right font-medium text-sm">
                            {m.totalOrders ?? 0}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">
                            <span className="flex items-center gap-1">
                              {'★'.repeat(Math.round(m.averageRating || 0))}
                              {'☆'.repeat(5 - Math.round(m.averageRating || 0))}
                              <span className="text-xs text-muted-foreground ml-1">
                                ({m.averageRating?.toFixed(1) || '—'})
                              </span>
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Badge
                                className={
                                  m.isActive
                                    ? 'bg-green-100 text-green-700 border-green-200'
                                    : 'bg-gray-100 text-gray-500 border-gray-200'
                                }
                              >
                                {m.isActive ? 'Actif' : 'Inactif'}
                              </Badge>
                              {m.isVerified && (
                                <Badge className="bg-sky-100 text-sky-700 border-sky-200">
                                  Vérifié
                                </Badge>
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
      </Tabs>

      {/* ═══════════════════ VIEW ORDER DIALOG ═══════════════════ */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de la Commande</DialogTitle>
            <DialogDescription>
              {selectedOrder?.orderRef} — {selectedOrder?.pharmacyName}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Client Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Client :</span>
                  <p className="font-medium">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Téléphone :</span>
                  <p className="font-medium">{selectedOrder.customerPhone}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">N° Vol :</span>
                  <p className="font-medium">{selectedOrder.flightNumber || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Porte :</span>
                  <p className="font-medium">{selectedOrder.gate}</p>
                </div>
              </div>

              {/* Status badges */}
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={selectedOrder.status} />
                <UrgencyBadge urgency={selectedOrder.urgency} />
                <PaymentBadge paymentStatus={selectedOrder.paymentStatus} />
                <Badge variant="outline">
                  Livraison : ~{selectedOrder.estimatedMinutes} min
                </Badge>
              </div>

              {/* Items */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Articles commandés</h4>
                {(() => {
                  const items = parseItems(selectedOrder.items)
                  if (items.length === 0) {
                    return <p className="text-sm text-muted-foreground">Aucun article détaillé.</p>
                  }
                  return (
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Produit</TableHead>
                            <TableHead className="text-xs text-center">Qté</TableHead>
                            <TableHead className="text-xs text-right">Prix</TableHead>
                            <TableHead className="text-xs text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-sm">{item.name}</TableCell>
                              <TableCell className="text-sm text-center">{item.qty}</TableCell>
                              <TableCell className="text-sm text-right">{formatPrice(item.price)}</TableCell>
                              <TableCell className="text-sm text-right font-medium">
                                {formatPrice(item.qty * item.price)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )
                })()}
              </div>

              {/* Totals */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span>{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frais de livraison</span>
                  <span>{formatPrice(selectedOrder.deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-orange-600">{formatPrice(selectedOrder.total)}</span>
                </div>
              </div>

              {/* Pharmacy Info */}
              <div className="text-sm">
                <span className="text-muted-foreground">Pharmacie :</span>
                <p className="font-medium">{selectedOrder.pharmacyName || 'Non assignée'}</p>
              </div>

              {/* Date */}
              <div className="text-xs text-muted-foreground">
                Créée le {format(new Date(selectedOrder.createdAt), "dd MMMM yyyy à HH:mm", { locale: fr })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
