'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
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

const CREDIT_REASONS = [
  { value: 'flight_scan', label: '✈️ Scan de Vol (+50)', points: 50 },
  { value: 'feedback', label: '⭐ Feedback Donné (+25)', points: 25 },
  { value: 'checkin', label: '🎫 Check-in Vol (+30)', points: 30 },
  { value: 'hotel_booking', label: '🏨 Réservation Hôtel (+100)', points: 100 },
  { value: 'wifi_connect', label: '📡 Connexion WiFi (+10)', points: 10 },
  { value: 'daily_login', label: '🔐 Connexion Quotidienne (+5)', points: 5 },
  { value: 'baggage_scan', label: '🧳 Scan Bagage (+50)', points: 50 },
  { value: 'custom', label: '✏️ Montant Personnalisé', points: 0 },
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

      {/* Tier Distribution */}
      {stats?.tierDistribution && (
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

          {/* Quick credit buttons + Créditer Points dialog */}
          {balance && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground mr-1">Crédit rapide :</span>
              {[
                { reason: 'flight_scan', label: '✈️ +50 Scan Vol' },
                { reason: 'feedback', label: '⭐ +25 Feedback' },
                { reason: 'checkin', label: '🎫 +30 Check-in' },
              ].map(action => (
                <Button key={action.reason} variant="outline" size="sm" onClick={() => handleQuickCredit(action.reason)}>
                  {action.label}
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
                          {CREDIT_REASONS.map(reason => (
                            <SelectItem key={reason.value} value={reason.value}>
                              {reason.label}
                            </SelectItem>
                          ))}
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
              <CardHeader><CardTitle className="text-sm">Historique des Transactions</CardTitle></CardHeader>
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
