'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Trophy,
  Gift,
  TrendingUp,
  Users,
  CreditCard,
  Medal,
  Star,
  Crown,
  Zap,
  Wifi,
  Plane,
  Car,
  Coffee,
  Percent,
  Ticket,
  Armchair,
  Package,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Building,
  ShoppingBag,
  ClipboardCheck,
  Cake,
  Pencil,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Shield,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────

interface WalletBalance {
  id: string
  phone: string
  balance: number
  tier: string
  totalEarned: number
  totalSpent: number
  pointsToNextTier?: number
  nextTier?: string
}

interface Transaction {
  id: string
  type: string
  amount: number
  reason: string
  description: string | null
  createdAt: string
  balance?: number
}

interface LeaderboardEntry {
  phone: string
  balance: number
  name: string | null
}

interface TierBreakdownItem {
  tier: string
  count: number
  totalBalance: number
}

interface Reward {
  id: string
  name: string
  description: string
  costPoints: number
  type: string
  value: string
  status: string
}

interface Stats {
  totalWallets: number
  totalPointsInCirculation: number
  totalTransactions: number
  totalRewards: number
  tierDistribution: Record<string, number>
  tierBreakdown?: TierBreakdownItem[]
  redeemedRewards: number
  transactionsLast7Days: number
  topEarners?: LeaderboardEntry[]
}

// ─── Constants ─────────────────────────────────────────

const TIER_ICONS: Record<string, typeof Medal> = {
  bronze: Medal,
  silver: Star,
  gold: Crown,
  platinum: Trophy,
}

const TIER_COLORS: Record<string, string> = {
  bronze: 'text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400',
  silver: 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-400',
  gold: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400',
  platinum: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400',
}

const TIER_BORDER_COLORS: Record<string, string> = {
  bronze: 'border-l-amber-600',
  silver: 'border-l-gray-400',
  gold: 'border-l-yellow-500',
  platinum: 'border-l-purple-500',
}

const TIER_THRESHOLDS: Record<string, number> = {
  bronze: 0,
  silver: 500,
  gold: 2000,
  platinum: 5000,
}

const TIER_LABELS: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platine',
}

const TIER_RANGE: Record<string, string> = {
  bronze: '0 pts',
  silver: '500+ pts',
  gold: '2000+ pts',
  platinum: '5000+ pts',
}

const REWARD_ICONS: Record<string, typeof Gift> = {
  wifi: Wifi,
  lounge: Crown,
  discount: Percent,
  taxi: Car,
  coffee: Coffee,
  priority_checkin: Ticket,
  seat_upgrade: Armchair,
  priority_baggage: Package,
  flight: Plane,
  driver: Car,
}

const REWARD_TYPE_LABELS: Record<string, string> = {
  wifi: 'WiFi',
  lounge: 'Salon',
  discount: 'Réduction',
  taxi: 'Taxi',
  coffee: 'Café',
  priority_checkin: 'Check-in Prioritaire',
  seat_upgrade: 'Surclassement',
  priority_baggage: 'Bagages Prioritaires',
  flight: 'Vol',
  driver: 'Chauffeur',
}

const TIER_BENEFITS: Record<string, { label: string; color: string; benefits: string[] }> = {
  bronze: {
    label: 'Bronze',
    color: '#CD7F32',
    benefits: [
      'Avantages de base',
      '1x multiplicateur de points',
      'Accès support standard',
    ],
  },
  silver: {
    label: 'Silver',
    color: '#C0C0C0',
    benefits: [
      'Avantages Silver',
      '1.5x multiplicateur de points',
      'Accès prioritaire',
      '-10% dans les boutiques',
    ],
  },
  gold: {
    label: 'Gold',
    color: '#FFD700',
    benefits: [
      'Avantages Gold',
      '2x multiplicateur de points',
      'Accès Lounge',
      '-20% dans les boutiques',
      'Transport gratuit',
    ],
  },
  platinum: {
    label: 'Platine',
    color: '#E5E4E2',
    benefits: [
      'Avantages Platinum',
      '3x multiplicateur de points',
      'Accès Lounge VIP',
      '-30% dans les boutiques',
      'Transport premium',
      'Service dédié',
    ],
  },
}

const CREDIT_REASONS = [
  { value: 'flight_scan', label: 'Vol scanné', subtitle: '+50', points: 50, icon: Plane },
  { value: 'feedback', label: 'Avis client', subtitle: '+25', points: 25, icon: Star },
  { value: 'checkin', label: 'Check-in', subtitle: '+30', points: 30, icon: ClipboardCheck },
  { value: 'hotel_booking', label: 'Réservation hôtel', subtitle: '+100', points: 100, icon: Building },
  { value: 'wifi_connect', label: 'Connexion WiFi', subtitle: '+10', points: 10, icon: Wifi },
  { value: 'daily_login', label: 'Connexion quotidienne', subtitle: '+5', points: 5, icon: Shield },
  { value: 'baggage_scan', label: 'Achat boutique', subtitle: '+50', points: 50, icon: ShoppingBag },
  { value: 'birthday', label: 'Anniversaire', subtitle: '+200', points: 200, icon: Cake },
  { value: 'referral', label: 'Parrainage', subtitle: '+150', points: 150, icon: Users },
  { value: 'custom', label: 'Custom', subtitle: '...', points: 0, icon: Pencil },
]

// ─── Module Component ───────────────────────────────────

export function MilesModule() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [balance, setBalance] = useState<WalletBalance | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Rewards tab state
  const [rewards, setRewards] = useState<Reward[]>([])
  const [rewardsLoading, setRewardsLoading] = useState(false)
  const [selectedRewardTier, setSelectedRewardTier] = useState('bronze')
  // Wallet lookup
  const [phoneLookup, setPhoneLookup] = useState('')

  // Créditer Points dialog state
  const [creditDialogOpen, setCreditDialogOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [creditDescription, setCreditDescription] = useState('')
  const [crediting, setCrediting] = useState(false)

  // Redeem dialog state
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false)
  const [redeemReward, setRedeemReward] = useState<Reward | null>(null)
  const [redeemPhone, setRedeemPhone] = useState('')
  const [redeemingConfirm, setRedeemingConfirm] = useState(false)

  // Active tab
  const [activeTab, setActiveTab] = useState<'overview' | 'wallet' | 'leaderboard' | 'rewards'>('overview')

  // Tier benefits panel
  const [expandedTier, setExpandedTier] = useState<string | null>(null)

  // Points expiration
  const [expirationExpanded, setExpirationExpanded] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    if (activeTab === 'rewards') {
      const fetchRewards = async () => {
        setRewardsLoading(true)
        try {
          const res = await fetch(`/api/miles?action=rewards&tier=${selectedRewardTier}`)
          const data = await res.json()
          setRewards(data.data || [])
        } catch (error) {
          console.error('Failed to load rewards:', error)
          toast.error('Erreur lors du chargement des récompenses')
        } finally {
          setRewardsLoading(false)
        }
      }
      fetchRewards()
    }
  }, [activeTab, selectedRewardTier])

  // ─── Data Fetching ──────────────────────────────────

  const loadStats = async () => {
    try {
      const [statsRes, lbRes] = await Promise.all([
        fetch('/api/miles?action=stats'),
        fetch('/api/miles?action=leaderboard'),
      ])
      const statsData = await statsRes.json()
      const lbData = await lbRes.json()

      // BUG FIX: Convert tierBreakdown array to tierDistribution Record
      if (statsData.data) {
        const raw = statsData.data
        if (raw.tierBreakdown && Array.isArray(raw.tierBreakdown)) {
          const tierDistribution: Record<string, number> = {}
          for (const item of raw.tierBreakdown) {
            tierDistribution[item.tier] = item.count
          }
          raw.tierDistribution = tierDistribution
        }
        setStats(raw)
      }

      setLeaderboard(lbData.data || [])
    } catch (error) {
      console.error('Failed to load miles data:', error)
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const lookupWallet = async () => {
    if (!phoneLookup.trim()) {
      toast.warning('Veuillez entrer un numéro de téléphone')
      return
    }
    try {
      const [balRes, histRes] = await Promise.all([
        fetch(`/api/miles?action=balance&phone=${encodeURIComponent(phoneLookup)}`),
        fetch(`/api/miles?action=history&phone=${encodeURIComponent(phoneLookup)}`),
      ])
      const balData = await balRes.json()
      const histData = await histRes.json()
      setBalance(balData.data || null)
      setTransactions(histData.data || [])
      if (balData.data) {
        toast.success('Portefeuille trouvé')
      } else {
        toast.info('Aucun portefeuille trouvé pour ce numéro')
      }
    } catch (error) {
      console.error('Failed to lookup wallet:', error)
      toast.error('Erreur lors de la recherche du portefeuille')
    }
  }

  // ─── Actions ────────────────────────────────────────

  const creditPoints = async (reason: string, amount?: number, description?: string) => {
    if (!phoneLookup.trim()) return
    setCrediting(true)
    try {
      const body: Record<string, unknown> = { action: 'credit', phone: phoneLookup, reason }
      if (amount !== undefined) body.amount = amount
      if (description) body.description = description

      const res = await fetch('/api/miles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (data.success) {
        toast.success('Points crédités avec succès !')
        setCreditDialogOpen(false)
        setSelectedReason('')
        setCustomAmount('')
        setCreditDescription('')
        lookupWallet()
        loadStats()
      } else {
        toast.error(data.error || 'Erreur lors du crédit de points')
      }
    } catch (error) {
      console.error('Failed to credit points:', error)
      toast.error('Erreur lors du crédit de points')
    } finally {
      setCrediting(false)
    }
  }

  const handleQuickCredit = (reason: string) => {
    creditPoints(reason)
  }

  const handleDialogCredit = () => {
    if (!selectedReason) {
      toast.warning('Veuillez sélectionner une raison')
      return
    }
    if (selectedReason === 'custom') {
      const amount = parseInt(customAmount)
      if (!amount || amount <= 0) {
        toast.warning('Veuillez entrer un montant valide')
        return
      }
      creditPoints('custom', amount, creditDescription || undefined)
    } else {
      const reasonObj = CREDIT_REASONS.find(r => r.value === selectedReason)
      creditPoints(selectedReason, reasonObj?.points, creditDescription || undefined)
    }
  }

  const openRedeemDialog = (reward: Reward) => {
    setRedeemReward(reward)
    setRedeemPhone(phoneLookup || '')
    setRedeemDialogOpen(true)
  }

  const handleRedeem = async () => {
    if (!redeemReward || !redeemPhone.trim()) {
      toast.warning('Veuillez entrer un numéro de téléphone')
      return
    }
    setRedeemingConfirm(true)
    try {
      const res = await fetch('/api/miles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'redeem', phone: redeemPhone, rewardId: redeemReward.id }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success(`Récompense "${redeemReward.name}" échangée avec succès !`)
        setRedeemDialogOpen(false)
        setRedeemReward(null)
        loadStats()
        // Refresh wallet if same phone
        if (redeemPhone === phoneLookup) {
          lookupWallet()
        }
      } else {
        toast.error(data.error || 'Erreur lors de l\'échange')
      }
    } catch (error) {
      console.error('Failed to redeem reward:', error)
      toast.error('Erreur lors de l\'échange de la récompense')
    } finally {
      setRedeemingConfirm(false)
    }
  }

  // ─── Helpers ────────────────────────────────────────

  const getPointsExpirationDays = (): number | null => {
    if (!balance || balance.balance === 0 || transactions.length === 0) return null
    const creditTransactions = transactions.filter(t => t.type === 'credit')
    if (creditTransactions.length === 0) return null
    const firstCredit = creditTransactions.reduce((earliest, t) => {
      return new Date(t.createdAt) < new Date(earliest.createdAt) ? t : earliest
    })
    const expirationDate = new Date(firstCredit.createdAt)
    expirationDate.setDate(expirationDate.getDate() + 365)
    const today = new Date()
    const diffTime = expirationDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const exportTransactionsCSV = () => {
    if (transactions.length === 0) {
      toast.warning('Aucune transaction à exporter')
      return
    }
    const headers = ['Date', 'Description', 'Points', 'Type', 'Solde']
    let runningBalance = balance?.balance ?? 0
    const rows = [...transactions].reverse().map((t, i) => {
      const balanceAtRow = runningBalance
      if (i < transactions.length - 1) {
        const next = [...transactions].reverse()[i + 1]
        runningBalance += next.type === 'credit' ? -next.amount : next.amount
      }
      return [
        new Date(t.createdAt).toLocaleDateString('fr-FR'),
        `${t.reason}${t.description ? ` — ${t.description}` : ''}`,
        `${t.type === 'credit' ? '+' : '-'}${t.amount}`,
        t.type === 'credit' ? 'Crédit' : 'Débit',
        String(balanceAtRow),
      ].join(';')
    })
    const csv = [headers.join(';'), ...rows].join('\n')
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `historique_transactions_${phoneLookup}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Historique exporté avec succès')
  }

  const tierIcon = (tier: string) => {
    const Icon = TIER_ICONS[tier] || Medal
    return <Icon className="size-5" />
  }

  const rewardIcon = (type: string) => {
    const Icon = REWARD_ICONS[type] || Gift
    return <Icon className="size-5" />
  }

  const getTierProgress = (bal: WalletBalance) => {
    const currentThreshold = TIER_THRESHOLDS[bal.tier] || 0
    const nextThreshold = bal.nextTier ? (TIER_THRESHOLDS[bal.nextTier] || currentThreshold + 1000) : currentThreshold
    if (!bal.nextTier) return 100 // Already at max tier
    const progress = ((bal.balance - currentThreshold) / (nextThreshold - currentThreshold)) * 100
    return Math.min(Math.max(progress, 0), 100)
  }

  const currentTierThreshold = (bal: WalletBalance) => {
    return TIER_THRESHOLDS[bal.tier] || 0
  }

  const nextTierThreshold = (bal: WalletBalance) => {
    if (!bal.nextTier) return null
    return TIER_THRESHOLDS[bal.nextTier] || null
  }

  // ─── Render ─────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🎮 Smartly Miles</h1>
          <p className="text-sm text-muted-foreground">
            Gamification & Fidélité — Gagnez des points à chaque action
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        stats && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Trophy className="size-8 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.totalWallets}</p>
                    <p className="text-xs text-muted-foreground">Portefeuilles Actifs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="size-8 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{(stats.totalPointsInCirculation || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Points en Circulation</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Gift className="size-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.redeemedRewards || 0}</p>
                    <p className="text-xs text-muted-foreground">Récompenses Échangées</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-teal-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="size-8 text-teal-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {stats.tierDistribution?.platinum || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Membres Platinum</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      )}

      {/* Tier Distribution with Benefits Panel */}
      {stats?.tierDistribution && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {['bronze', 'silver', 'gold', 'platinum'].map(tier => (
              <div
                key={tier}
                className={`rounded-lg border p-3 text-center ${TIER_COLORS[tier]}`}
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  {tierIcon(tier)}
                  <span className="text-xs font-bold uppercase">{tier}</span>
                </div>
                <p className="text-2xl font-bold">{stats.tierDistribution[tier] || 0}</p>
                <p className="text-[10px] opacity-70">{TIER_RANGE[tier]}</p>
                {stats.tierBreakdown && stats.tierBreakdown.find(t => t.tier === tier) && (
                  <p className="text-[10px] opacity-50 mt-0.5">
                    {(stats.tierBreakdown.find(t => t.tier === tier)?.totalBalance || 0).toLocaleString()} pts total
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Tier Benefits Expandable Panels */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {['bronze', 'silver', 'gold', 'platinum'].map(tier => {
              const info = TIER_BENEFITS[tier]
              const isExpanded = expandedTier === tier
              return (
                <Collapsible
                  key={tier}
                  open={isExpanded}
                  onOpenChange={(open) => setExpandedTier(open ? tier : null)}
                >
                  <CollapsibleTrigger asChild>
                    <Card
                      className="cursor-pointer hover:shadow-sm transition-all"
                      style={{ borderLeftWidth: '4px', borderLeftColor: info.color }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {tierIcon(tier)}
                            <span className="text-sm font-semibold">Avantages {info.label}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {info.benefits.length} avantages
                            </Badge>
                          </div>
                          {isExpanded
                            ? <ChevronUp className="size-4 text-muted-foreground" />
                            : <ChevronDown className="size-4 text-muted-foreground" />
                          }
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Card className="mt-0 rounded-t-none" style={{ borderLeftWidth: '4px', borderLeftColor: info.color }}>
                      <CardContent className="p-3 pt-2">
                        <ul className="space-y-1.5">
                          {info.benefits.map((benefit, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="size-3.5 shrink-0" style={{ color: info.color }} />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2 flex-wrap">
        {([
          { key: 'overview' as const, label: "📊 Vue d'ensemble" },
          { key: 'wallet' as const, label: '💳 Portefeuille' },
          { key: 'leaderboard' as const, label: '🏆 Classement' },
          { key: 'rewards' as const, label: '🎁 Récompenses' },
        ]).map(tab => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.key)}
            className={activeTab === tab.key ? 'bg-orange-500 hover:bg-orange-600' : ''}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="size-4" /> Gains de Points
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Scan bagage</span><Badge variant="outline">+50 pts</Badge></div>
              <div className="flex justify-between"><span>Réservation hôtel</span><Badge variant="outline">+100 pts</Badge></div>
              <div className="flex justify-between"><span>Feedback donné</span><Badge variant="outline">+25 pts</Badge></div>
              <div className="flex justify-between"><span>Check-in vol</span><Badge variant="outline">+30 pts</Badge></div>
              <div className="flex justify-between"><span>WiFi Premium</span><Badge variant="outline">+10 pts</Badge></div>
              <div className="flex justify-between"><span>Connexion quotidienne</span><Badge variant="outline">+5 pts</Badge></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="size-4" /> Actions Rapides
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setActiveTab('wallet')}>
                Consulter un portefeuille
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setActiveTab('leaderboard')}>
                Voir le classement
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setActiveTab('rewards')}>
                Parcourir les récompenses
              </Button>
            </CardContent>
          </Card>
          {stats?.transactionsLast7Days !== undefined && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="size-4" /> Activité Récente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Transactions (7j)</span>
                  <span className="text-2xl font-bold text-orange-500">{stats.transactionsLast7Days}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Récompenses disponibles</span>
                  <span className="text-2xl font-bold text-green-500">{stats.totalRewards || 0}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Wallet Tab */}
      {activeTab === 'wallet' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Numéro de téléphone..."
              value={phoneLookup}
              onChange={e => setPhoneLookup(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && lookupWallet()}
              className="max-w-xs"
            />
            <Button onClick={lookupWallet} className="bg-orange-500 hover:bg-orange-600">
              Rechercher
            </Button>
          </div>

          {balance && (
            <Card className={`border-l-4 ${TIER_BORDER_COLORS[balance.tier] || 'border-l-amber-600'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{balance.phone}</p>
                    <p className="text-3xl font-bold">{balance.balance.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">points</span></p>
                    <div className="flex items-center gap-1 mt-1">
                      {tierIcon(balance.tier)}
                      <Badge className={TIER_COLORS[balance.tier]} variant="secondary">{balance.tier}</Badge>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Gagnés: <span className="text-green-500 font-medium">{balance.totalEarned.toLocaleString()}</span></p>
                    <p>Dépensés: <span className="text-red-400 font-medium">{balance.totalSpent.toLocaleString()}</span></p>
                  </div>
                </div>

                {/* Tier Progress Bar */}
                {balance.nextTier && balance.pointsToNextTier !== undefined && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {TIER_LABELS[balance.tier]}
                        <span className="text-[10px] ml-1 opacity-60">({currentTierThreshold(balance)} pts)</span>
                      </span>
                      <span className="text-amber-500 font-medium">
                        {balance.pointsToNextTier} pts restants
                      </span>
                      <span className="text-muted-foreground">
                        {TIER_LABELS[balance.nextTier]}
                        <span className="text-[10px] ml-1 opacity-60">({nextTierThreshold(balance)} pts)</span>
                      </span>
                    </div>
                    <Progress
                      value={getTierProgress(balance)}
                      className="h-3 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-amber-500 [&>[data-slot=progress-indicator]]:to-orange-500"
                    />
                    <p className="text-center text-xs text-muted-foreground">
                      Prochain palier : <span className="font-medium text-orange-500">{TIER_LABELS[balance.nextTier]}</span>
                    </p>
                  </div>
                )}

                {!balance.nextTier && (
                  <div className="mt-4 flex items-center gap-2 p-2 rounded-md bg-amber-500/10 text-amber-500 text-xs">
                    <CheckCircle2 className="size-4" />
                    <span>Tier maximum atteint — {TIER_LABELS[balance.tier]}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Points Expiration Warning */}
          {balance && balance.balance > 0 && (() => {
            const daysLeft = getPointsExpirationDays()
            if (daysLeft === null || daysLeft > 365) return null
            return (
              <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
                <div
                  className="flex items-center gap-2 p-3 cursor-pointer select-none"
                  onClick={() => setExpirationExpanded(!expirationExpanded)}
                >
                  <Clock className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    {daysLeft <= 0
                      ? 'Vos points ont expiré'
                      : daysLeft <= 30
                        ? `Vos points expirent dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''} !`
                        : `Vos points expirent dans ${daysLeft} jours`
                    }
                  </span>
                  {daysLeft <= 30 && daysLeft > 0 && (
                    <Badge className="bg-amber-500 text-white text-[10px] shrink-0">Urgent</Badge>
                  )}
                  {daysLeft <= 0 && (
                    <Badge className="bg-red-500 text-white text-[10px] shrink-0">Expiré</Badge>
                  )}
                  <div className="flex-1" />
                  <span className="text-xs text-amber-600 dark:text-amber-400 underline">Plus de détails</span>
                  {expirationExpanded
                    ? <ChevronUp className="size-3.5 text-amber-600 dark:text-amber-400" />
                    : <ChevronDown className="size-3.5 text-amber-600 dark:text-amber-400" />
                  }
                </div>
                {expirationExpanded && (
                  <div className="px-3 pb-3 border-t border-amber-200 dark:border-amber-800">
                    <div className="mt-2 space-y-1 text-xs text-amber-800 dark:text-amber-300">
                      <div className="flex justify-between">
                        <span>Solde actuel</span>
                        <span className="font-medium">{balance.balance.toLocaleString()} points</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Premier crédit</span>
                        <span className="font-medium">
                          {transactions.filter(t => t.type === 'credit').length > 0
                            ? new Date(
                                transactions
                                  .filter(t => t.type === 'credit')
                                  .reduce((earliest, t) =>
                                    new Date(t.createdAt) < new Date(earliest.createdAt) ? t : earliest
                                  ).createdAt
                              ).toLocaleDateString('fr-FR')
                            : '—'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date d'expiration</span>
                        <span className="font-medium">
                          {transactions.filter(t => t.type === 'credit').length > 0
                            ? (() => {
                                const first = transactions
                                  .filter(t => t.type === 'credit')
                                  .reduce((earliest, t) =>
                                    new Date(t.createdAt) < new Date(earliest.createdAt) ? t : earliest
                                  )
                                const exp = new Date(first.createdAt)
                                exp.setDate(exp.getDate() + 365)
                                return exp.toLocaleDateString('fr-FR')
                              })()
                            : '—'
                          }
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-[10px] text-amber-600 dark:text-amber-400 opacity-70">
                      Les points expirent 365 jours après leur premier crédit.
                    </p>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Quick credit buttons + Créditer Points dialog */}
          {balance && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground mr-1">Crédit rapide :</span>
              {[
                { reason: 'flight_scan', label: 'Vol scanné', subtitle: '+50', icon: Plane },
                { reason: 'feedback', label: 'Avis client', subtitle: '+25', icon: Star },
                { reason: 'checkin', label: 'Check-in', subtitle: '+30', icon: ClipboardCheck },
              ].map(action => (
                <Button key={action.reason} variant="outline" size="sm" onClick={() => handleQuickCredit(action.reason)} className="gap-1">
                  <action.icon className="size-3.5" />
                  <span>{action.subtitle}</span>
                  <span className="text-[10px] opacity-70">{action.label}</span>
                </Button>
              ))}
              <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Plus className="size-3.5" /> Créditer Points
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Créditer des Points</DialogTitle>
                    <DialogDescription>
                      Créditez des points au portefeuille {phoneLookup}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Raison</label>
                      <Select value={selectedReason} onValueChange={setSelectedReason}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionner une raison..." />
                        </SelectTrigger>
                        <SelectContent>
                          {CREDIT_REASONS.map(reason => {
                            const IconComp = reason.icon
                            return (
                              <SelectItem key={reason.value} value={reason.value}>
                                <span className="flex items-center gap-2">
                                  <IconComp className="size-3.5" />
                                  {reason.label} {reason.subtitle !== '...' ? `(${reason.subtitle})` : ''}
                                </span>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedReason === 'custom' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Montant (points)</label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="Ex: 100"
                          value={customAmount}
                          onChange={e => setCustomAmount(e.target.value)}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Description <span className="text-muted-foreground font-normal">(optionnel)</span>
                      </label>
                      <Textarea
                        placeholder="Ajouter une note ou description..."
                        value={creditDescription}
                        onChange={e => setCreditDescription(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setCreditDialogOpen(false)}>Annuler</Button>
                    <Button
                      onClick={handleDialogCredit}
                      disabled={crediting || !selectedReason}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {crediting && <Loader2 className="size-4 animate-spin mr-1" />}
                      Créditer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Transaction History */}
          {transactions.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Historique des Transactions</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={exportTransactionsCSV}
                >
                  <Download className="size-3.5" />
                  Exporter l'historique
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Type</th>
                        <th className="p-2 text-left">Raison</th>
                        <th className="p-2 text-right">Points</th>
                        <th className="p-2 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(t => (
                        <tr key={t.id} className="border-t">
                          <td className="p-2">
                            <Badge variant={t.type === 'credit' ? 'default' : 'secondary'} className={t.type === 'credit' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}>
                              {t.type === 'credit' ? '+' : '-'}{t.amount}
                            </Badge>
                          </td>
                          <td className="p-2">
                            {t.reason}
                            {t.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                            )}
                          </td>
                          <td className="p-2 text-right font-medium">{t.amount}</td>
                          <td className="p-2 text-right text-xs text-muted-foreground">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="size-4" /> Classement des Membres
          </CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-3 text-center w-12">#</th>
                    <th className="p-3 text-left">Téléphone</th>
                    <th className="p-3 text-right">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => (
                    <tr key={entry.phone} className="border-t">
                      <td className="p-3 text-center">
                        {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                      </td>
                      <td className="p-3">{entry.phone}</td>
                      <td className="p-3 text-right font-bold">{entry.balance.toLocaleString()}</td>
                    </tr>
                  ))}
                  {leaderboard.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-muted-foreground">
                        Aucun membre encore
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rewards Tab */}
      {activeTab === 'rewards' && (
        <div className="space-y-4">
          {/* Tier Selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Filtrer par tier :</span>
            <Select value={selectedRewardTier} onValueChange={setSelectedRewardTier}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['bronze', 'silver', 'gold', 'platinum'].map(tier => (
                  <SelectItem key={tier} value={tier}>
                    <span className="flex items-center gap-2">
                      {TIER_LABELS[tier]}
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TIER_COLORS[tier]}`}>
                        {tier}
                      </Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {rewardsLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </div>

          {/* Rewards Grid */}
          {rewardsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : rewards.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Gift className="size-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Aucune récompense disponible pour ce tier</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rewards.map(reward => (
                <Card key={reward.id} className="group hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    {/* Header: icon + type badge */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-orange-500/10 p-2 text-orange-500">
                          {rewardIcon(reward.type)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm leading-tight">{reward.name}</h3>
                          <Badge variant="outline" className="text-[10px] mt-1">
                            {REWARD_TYPE_LABELS[reward.type] || reward.type}
                          </Badge>
                        </div>
                      </div>
                      <Badge
                        variant={reward.status === 'available' ? 'default' : 'secondary'}
                        className={
                          reward.status === 'available'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-[10px]'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-[10px]'
                        }
                      >
                        {reward.status === 'available' ? 'Disponible' : reward.status}
                      </Badge>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground leading-relaxed">{reward.description}</p>

                    {/* Value + Cost */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-xs">
                        <span className="text-muted-foreground">Valeur : </span>
                        <span className="font-medium">{reward.value}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-amber-500">{reward.costPoints} pts</span>
                        <Button
                          size="sm"
                          className="bg-orange-500 hover:bg-orange-600 text-xs h-7 px-3"
                          disabled={reward.status !== 'available'}
                          onClick={() => openRedeemDialog(reward)}
                        >
                          Échanger
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Tier Requirements Info */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold mb-2">🏅 Seuils des Tiers</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {['bronze', 'silver', 'gold', 'platinum'].map(tier => (
                  <div key={tier} className="flex items-center gap-2">
                    <div className="rounded-md p-1.5 bg-background border">
                      {tierIcon(tier)}
                    </div>
                    <div>
                      <p className="font-medium">{TIER_LABELS[tier]}</p>
                      <p className="text-muted-foreground">{TIER_RANGE[tier]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Redeem Confirmation Dialog */}
      <Dialog open={redeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="size-5 text-orange-500" />
              Échanger une Récompense
            </DialogTitle>
            <DialogDescription>
              Confirmez l'échange de la récompense ci-dessous
            </DialogDescription>
          </DialogHeader>
          {redeemReward && (
            <div className="space-y-4 py-2">
              {/* Reward Summary */}
              <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-orange-500/10 p-1.5 text-orange-500">
                    {rewardIcon(redeemReward.type)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{redeemReward.name}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {REWARD_TYPE_LABELS[redeemReward.type] || redeemReward.type}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{redeemReward.description}</p>
                <div className="flex items-center justify-between text-xs pt-2 border-t">
                  <span className="text-muted-foreground">Valeur</span>
                  <span className="font-medium">{redeemReward.value}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Coût</span>
                  <span className="font-bold text-amber-500">{redeemReward.costPoints} points</span>
                </div>
              </div>

              {/* Phone Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Numéro de téléphone du bénéficiaire</label>
                <Input
                  placeholder="+221 77 123 45 67"
                  value={redeemPhone}
                  onChange={e => setRedeemPhone(e.target.value)}
                />
                {redeemPhone && balance && redeemPhone !== phoneLookup && (
                  <p className="text-xs text-amber-500 flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    Ce numéro est différent du portefeuille actuellement consulté
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRedeemDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={handleRedeem}
              disabled={redeemingConfirm || !redeemPhone.trim()}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {redeemingConfirm && <Loader2 className="size-4 animate-spin mr-1" />}
              Confirmer l'Échange
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
