'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
} from 'lucide-react'

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

interface Stats {
  totalWallets: number
  totalPointsInCirculation: number
  tierDistribution: Record<string, number>
  redeemedRewards: number
}

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

// ─── Module Component ───────────────────────────────────

export function MilesModule() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [balance, setBalance] = useState<WalletBalance | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [phoneLookup, setPhoneLookup] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'wallet' | 'leaderboard'>('overview')

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const [statsRes, lbRes] = await Promise.all([
        fetch('/api/miles?action=stats'),
        fetch('/api/miles?action=leaderboard'),
      ])
      const statsData = await statsRes.json()
      const lbData = await lbRes.json()
      setStats(statsData.data || null)
      setLeaderboard(lbData.data || [])
    } catch (error) {
      console.error('Failed to load miles data:', error)
    } finally {
      setLoading(false)
    }
  }

  const lookupWallet = async () => {
    if (!phoneLookup.trim()) return
    try {
      const [balRes, histRes] = await Promise.all([
        fetch(`/api/miles?action=balance&phone=${phoneLookup}`),
        fetch(`/api/miles?action=history&phone=${phoneLookup}`),
      ])
      const balData = await balRes.json()
      const histData = await histRes.json()
      setBalance(balData.data || null)
      setTransactions(histData.data || [])
    } catch (error) {
      console.error('Failed to lookup wallet:', error)
    }
  }

  const creditPoints = async (reason: string) => {
    if (!phoneLookup.trim()) return
    try {
      await fetch('/api/miles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'credit', phone: phoneLookup, reason }),
      })
      lookupWallet()
    } catch (error) {
      console.error('Failed to credit points:', error)
    }
  }

  const tierIcon = (tier: string) => {
    const Icon = TIER_ICONS[tier] || Medal
    return <Icon className="size-5" />
  }

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
      {stats && (
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
      )}

      {/* Tier Distribution */}
      {stats?.tierDistribution && (
        <div className="grid grid-cols-4 gap-3">
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
              <p className="text-[10px] opacity-70">
                {tier === 'bronze' ? '0 pts' : tier === 'silver' ? '500+ pts' : tier === 'gold' ? '2000+ pts' : '5000+ pts'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {(['overview', 'wallet', 'leaderboard'] as const).map(tab => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? 'bg-orange-500 hover:bg-orange-600' : ''}
          >
            {tab === 'overview' ? '📊 Vue d\'ensemble' : tab === 'wallet' ? '💳 Portefeuille' : '🏆 Classement'}
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* Wallet Tab */}
      {activeTab === 'wallet' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Numéro de téléphone..."
              value={phoneLookup}
              onChange={e => setPhoneLookup(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={lookupWallet} className="bg-orange-500 hover:bg-orange-600">
              Rechercher
            </Button>
          </div>

          {balance && (
            <Card className={`border-l-4 ${balance.tier === 'platinum' ? 'border-l-purple-500' : balance.tier === 'gold' ? 'border-l-yellow-500' : balance.tier === 'silver' ? 'border-l-gray-400' : 'border-l-amber-600'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{balance.phone}</p>
                    <p className="text-3xl font-bold">{balance.balance.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">points</span></p>
                    <div className="flex items-center gap-1 mt-1">
                      {tierIcon(balance.tier)}
                      <Badge className={TIER_COLORS[balance.tier]} variant="secondary">{balance.tier}</Badge>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Gagnés: {balance.totalEarned.toLocaleString()}</p>
                    <p>Dépensés: {balance.totalSpent.toLocaleString()}</p>
                    {balance.pointsToNextTier !== undefined && balance.nextTier && (
                      <p className="mt-1 text-orange-600">{balance.pointsToNextTier} pts → {balance.nextTier}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick credit buttons */}
          {balance && (
            <div className="flex flex-wrap gap-2">
              {[
                { reason: 'flight_scan', label: '✈️ +50 Scan Vol', icon: 'plane' },
                { reason: 'feedback', label: '⭐ +25 Feedback', icon: 'star' },
                { reason: 'checkin', label: '🎫 +30 Check-in', icon: 'ticket' },
              ].map(action => (
                <Button key={action.reason} variant="outline" size="sm" onClick={() => creditPoints(action.reason)}>
                  {action.label}
                </Button>
              ))}
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
                            <Badge variant={t.type === 'credit' ? 'default' : 'secondary'} className={t.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {t.type === 'credit' ? '+' : '-'}{t.amount}
                            </Badge>
                          </td>
                          <td className="p-2">{t.reason}</td>
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
    </div>
  )
}
