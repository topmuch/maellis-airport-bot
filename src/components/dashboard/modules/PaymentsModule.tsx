'use client'

import React, { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  DollarSign,
  CreditCard,
  Smartphone,
  Waves,
  Search,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

// ─── Types ───────────────────────────────────────────────────────
interface Payment {
  id: string
  externalRef: string | null
  phone: string
  provider: string
  country: string
  currency: string
  amount: number
  bookingType: string
  status: string
  createdAt: string
}

// ─── Colors ──────────────────────────────────────────────────────
const PROVIDER_COLORS: Record<string, string> = {
  orange_money: 'bg-orange-500/15 text-orange-700 border-orange-200',
  wave: 'bg-sky-500/15 text-sky-700 border-sky-200',
  mtn_momo: 'bg-yellow-500/15 text-yellow-700 border-yellow-200',
  cash: 'bg-gray-500/15 text-gray-700 border-gray-200',
}

const PROVIDER_LABELS: Record<string, string> = {
  orange_money: 'Orange Money',
  wave: 'Wave',
  mtn_momo: 'MTN MoMo',
  cash: 'Cash',
}

const STATUS_COLORS: Record<string, string> = {
  success: 'bg-orange-500/15 text-orange-600 border-orange-200',
  completed: 'bg-orange-500/15 text-orange-600 border-orange-200',
  pending: 'bg-amber-500/15 text-amber-700 border-amber-200',
  processing: 'bg-blue-500/15 text-blue-700 border-blue-200',
  failed: 'bg-red-500/15 text-red-700 border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  success: 'Succès',
  completed: 'Complété',
  pending: 'En attente',
  processing: 'Traitement',
  failed: 'Échoué',
}

// ─── Pie Chart Data ──────────────────────────────────────────────
const PIE_DATA = [
  { name: 'Wave', value: 45, fill: '#0ea5e9' },
  { name: 'Orange Money', value: 40, fill: '#f97316' },
  { name: 'MTN MoMo', value: 10, fill: '#eab308' },
  { name: 'Cash', value: 5, fill: '#9ca3af' },
]

// ─── Mock Data ───────────────────────────────────────────────────
const MOCK_PAYMENTS: Payment[] = [
  {
    id: 'pay-001',
    externalRef: 'OM-20240421-001',
    phone: '+221 77 123 45 67',
    provider: 'orange_money',
    country: 'SN',
    currency: 'XOF',
    amount: 25000,
    bookingType: 'lounge',
    status: 'success',
    createdAt: '2024-04-21T10:30:00Z',
  },
  {
    id: 'pay-002',
    externalRef: 'WV-20240421-002',
    phone: '+221 78 234 56 78',
    provider: 'wave',
    country: 'SN',
    currency: 'XOF',
    amount: 15000,
    bookingType: 'transport',
    status: 'success',
    createdAt: '2024-04-21T10:15:00Z',
  },
  {
    id: 'pay-003',
    externalRef: 'OM-20240421-003',
    phone: '+223 70 456 78 90',
    provider: 'orange_money',
    country: 'ML',
    currency: 'XOF',
    amount: 35000,
    bookingType: 'lounge',
    status: 'pending',
    createdAt: '2024-04-21T09:45:00Z',
  },
  {
    id: 'pay-004',
    externalRef: 'MM-20240421-004',
    phone: '+225 07 567 89 01',
    provider: 'mtn_momo',
    country: 'CI',
    currency: 'XOF',
    amount: 50000,
    bookingType: 'transport',
    status: 'processing',
    createdAt: '2024-04-21T09:30:00Z',
  },
  {
    id: 'pay-005',
    externalRef: 'WV-20240421-005',
    phone: '+221 76 678 90 12',
    provider: 'wave',
    country: 'SN',
    currency: 'XOF',
    amount: 20000,
    bookingType: 'lounge',
    status: 'success',
    createdAt: '2024-04-21T09:00:00Z',
  },
  {
    id: 'pay-006',
    externalRef: 'OM-20240420-006',
    phone: '+221 77 789 01 23',
    provider: 'orange_money',
    country: 'SN',
    currency: 'XOF',
    amount: 40000,
    bookingType: 'lounge',
    status: 'success',
    createdAt: '2024-04-20T18:20:00Z',
  },
  {
    id: 'pay-007',
    externalRef: 'CS-20240420-007',
    phone: '+221 78 890 12 34',
    provider: 'cash',
    country: 'SN',
    currency: 'XOF',
    amount: 10000,
    bookingType: 'transport',
    status: 'success',
    createdAt: '2024-04-20T17:45:00Z',
  },
  {
    id: 'pay-008',
    externalRef: 'WV-20240420-008',
    phone: '+223 65 901 23 45',
    provider: 'wave',
    country: 'ML',
    currency: 'XOF',
    amount: 30000,
    bookingType: 'transport',
    status: 'failed',
    createdAt: '2024-04-20T16:30:00Z',
  },
  {
    id: 'pay-009',
    externalRef: 'OM-20240420-009',
    phone: '+225 05 012 34 56',
    provider: 'orange_money',
    country: 'CI',
    currency: 'XOF',
    amount: 55000,
    bookingType: 'lounge',
    status: 'success',
    createdAt: '2024-04-20T15:15:00Z',
  },
  {
    id: 'pay-010',
    externalRef: 'MM-20240420-010',
    phone: '+221 77 123 78 90',
    provider: 'mtn_momo',
    country: 'SN',
    currency: 'XOF',
    amount: 18000,
    bookingType: 'transport',
    status: 'success',
    createdAt: '2024-04-20T14:00:00Z',
  },
  {
    id: 'pay-011',
    externalRef: 'WV-20240420-011',
    phone: '+221 78 456 12 34',
    provider: 'wave',
    country: 'SN',
    currency: 'XOF',
    amount: 45000,
    bookingType: 'lounge',
    status: 'pending',
    createdAt: '2024-04-20T12:30:00Z',
  },
  {
    id: 'pay-012',
    externalRef: 'OM-20240420-012',
    phone: '+221 76 567 34 56',
    provider: 'orange_money',
    country: 'SN',
    currency: 'XOF',
    amount: 25000,
    bookingType: 'transport',
    status: 'success',
    createdAt: '2024-04-20T11:00:00Z',
  },
]

// ─── Stats Cards ─────────────────────────────────────────────────
function StatCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor,
  iconBgClass,
  borderColor,
  valueColor,
  changeColor,
}: {
  title: string
  value: string
  change?: string
  icon: React.ElementType
  iconColor: string
  iconBgClass?: string
  borderColor: string
  valueColor?: string
  changeColor?: string
}) {
  return (
    <Card className={`border-l-4 ${borderColor} overflow-hidden`}>
      <CardContent className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBgClass || iconColor}`}
        >
          <Icon className={`h-6 w-6 ${iconBgClass ? iconColor : 'text-white'}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground truncate text-sm">{title}</p>
          <p className={`text-xl font-bold tracking-tight ${valueColor || ''}`}>{value}</p>
          {change && (
            <div className="mt-0.5 flex items-center gap-1">
              {change.startsWith('+') ? (
                <TrendingUp className={`h-3.5 w-3.5 ${changeColor || 'text-emerald-500'}`} />
              ) : (
                <TrendingDown className={`h-3.5 w-3.5 ${changeColor || 'text-rose-500'}`} />
              )}
              <span
                className={`text-xs font-medium ${changeColor || (change.startsWith('+') ? 'text-emerald-500' : 'text-rose-500')}`}
              >
                {change}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Component ───────────────────────────────────────────────────
export function PaymentsModule() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [providerFilter, setProviderFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchPayments() {
      try {
        const result = await apiClient.get('/api/payments')
        if (result.success) {
          const json = result.data as Record<string, unknown>
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            setPayments(json.data as Payment[])
          } else {
            setPayments([])
          }
        } else {
          setPayments([])
        }
      } catch {
        setPayments([])
      } finally {
        setLoading(false)
      }
    }
    fetchPayments()
  }, [])

  const filteredPayments = payments.filter((p) => {
    if (providerFilter !== 'all' && p.provider !== providerFilter) return false
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return (
        p.externalRef?.toLowerCase().includes(s) ||
        p.phone.toLowerCase().includes(s) ||
        p.provider.toLowerCase().includes(s) ||
        p.amount.toString().includes(s)
      )
    }
    return true
  })

  const totalAmount = payments
    .filter((p) => p.status === 'success' || p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)

  const todayPayments = payments.filter(
    (p) =>
      p.status !== 'failed' &&
      new Date(p.createdAt).toDateString() === new Date().toDateString()
  )
  const todayTotal = todayPayments.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Paiements</h2>
        <p className="text-muted-foreground text-sm">
          Gestion des paiements mobile money et cash
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Revenus Total"
          value={`${totalAmount.toLocaleString('fr-FR')} FCFA`}
          change="+18%"
          icon={DollarSign}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
          borderColor="border-l-emerald-500"
          valueColor="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          title="Paiements Aujourd'hui"
          value={`${todayTotal.toLocaleString('fr-FR')} FCFA`}
          change="+5%"
          icon={CreditCard}
          iconColor="text-orange-600 dark:text-orange-400"
          iconBgClass="bg-orange-100 dark:bg-orange-900/30"
          borderColor="border-l-orange-500"
          valueColor="text-orange-600 dark:text-orange-400"
        />
        <StatCard
          title="Orange Money"
          value="67%"
          icon={Smartphone}
          iconColor="text-violet-600 dark:text-violet-400"
          iconBgClass="bg-violet-100 dark:bg-violet-900/30"
          borderColor="border-l-violet-500"
          valueColor="text-violet-600 dark:text-violet-400"
        />
        <StatCard
          title="Wave"
          value="33%"
          icon={Waves}
          iconColor="text-sky-600 dark:text-sky-400"
          iconBgClass="bg-sky-100 dark:bg-sky-900/30"
          borderColor="border-l-sky-500"
          valueColor="text-sky-600 dark:text-sky-400"
        />
      </div>

      {/* Chart + Filters */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Pie Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Répartition par fournisseur</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={PIE_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {PIE_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, 'Part']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-xs">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Filtres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-muted-foreground text-xs font-medium">
                  Fournisseur
                </label>
                <Select value={providerFilter} onValueChange={setProviderFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="orange_money">Orange Money</SelectItem>
                    <SelectItem value="wave">Wave</SelectItem>
                    <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-muted-foreground text-xs font-medium">
                  Statut
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="success">Succès</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="processing">Traitement</SelectItem>
                    <SelectItem value="failed">Échoué</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-muted-foreground text-xs font-medium">
                  Recherche
                </label>
                <div className="relative">
                  <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                  <Input
                    placeholder="Réf, téléphone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Transactions ({filteredPayments.length})
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
                    <TableHead>Réf Externe</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Devise</TableHead>
                    <TableHead>Type Réservation</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">
                        {payment.externalRef || '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {payment.phone}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            PROVIDER_COLORS[payment.provider] || 'bg-gray-100 text-gray-700'
                          }
                          variant="outline"
                        >
                          {PROVIDER_LABELS[payment.provider] || payment.provider}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {payment.amount.toLocaleString('fr-FR')} FCFA
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {payment.currency}
                      </TableCell>
                      <TableCell className="capitalize text-sm">
                        {payment.bookingType === 'lounge' ? 'Salon' : 'Transport'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={STATUS_COLORS[payment.status] || 'bg-gray-100 text-gray-700'}
                          variant="outline"
                        >
                          {STATUS_LABELS[payment.status] || payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(payment.createdAt), 'dd MMM yyyy HH:mm', {
                          locale: fr,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredPayments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
                        Aucun paiement trouvé
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
