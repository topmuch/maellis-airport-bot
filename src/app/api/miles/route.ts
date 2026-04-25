import { NextRequest, NextResponse } from 'next/server'
import {
  getOrCreateWallet,
  creditPoints,
  getBalance,
  getTransactionHistory,
  getLeaderboard,
  getAvailableRewards,
  redeemReward,
  getGamificationStats,
} from '@/lib/services/gamification.service'
import { requireAuth, requireRole } from '@/lib/auth'
import { parseBody, ValidationError } from '@/lib/validate'

// GET /api/miles - Multiple actions via query param
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const phone = searchParams.get('phone')
    const tier = searchParams.get('tier')

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'action query parameter is required (balance, history, leaderboard, rewards, stats)' },
        { status: 400 }
      )
    }

    // Admin-only actions
    if (action === 'stats') {
      const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request)
      if (!authResult.success) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
      }
      const stats = await getGamificationStats()
      return NextResponse.json({ success: true, data: stats })
    }

    // User-facing actions (require auth)
    const authResult = await requireAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    switch (action) {
      case 'balance': {
        if (!phone) {
          return NextResponse.json(
            { success: false, error: 'phone is required for balance action' },
            { status: 400 }
          )
        }
        const balance = await getOrCreateWallet(phone)
        const enriched = await getBalance(phone)
        return NextResponse.json({ success: true, data: enriched ?? balance })
      }

      case 'history': {
        if (!phone) {
          return NextResponse.json(
            { success: false, error: 'phone is required for history action' },
            { status: 400 }
          )
        }
        const history = await getTransactionHistory(phone)
        return NextResponse.json({ success: true, data: history })
      }

      case 'leaderboard': {
        const limitParam = searchParams.get('limit')
        const limit = Math.min(100, Math.max(1, limitParam ? parseInt(limitParam, 10) : 10))
        const leaderboard = await getLeaderboard(limit)
        return NextResponse.json({ success: true, data: leaderboard })
      }

      case 'rewards': {
        if (!tier) {
          return NextResponse.json(
            { success: false, error: 'tier is required for rewards action' },
            { status: 400 }
          )
        }
        const rewards = await getAvailableRewards(tier)
        return NextResponse.json({ success: true, data: rewards })
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Must be one of: balance, history, leaderboard, rewards, stats' },
          { status: 400 }
        )
    }
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error in miles GET handler:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process miles request' },
      { status: 500 }
    )
  }
}

// POST /api/miles - Credit points (admin) or redeem a reward (user)
export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request)
    const { action, phone, reason, rewardId } = body

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'action field is required in body (credit or redeem)' },
        { status: 400 }
      )
    }

    // Credit points requires admin role
    if (action === 'credit') {
      const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request)
      if (!authResult.success) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
      }

      if (!phone || !reason) {
        return NextResponse.json(
          { success: false, error: 'phone and reason are required for credit action' },
          { status: 400 }
        )
      }

      const result = await creditPoints(phone, reason, body.referenceId)
      return NextResponse.json({ success: true, data: result }, { status: 201 })
    }

    // Redeem reward requires auth
    if (action === 'redeem') {
      const authResult = await requireAuth(request)
      if (!authResult.success) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
      }

      if (!phone || !rewardId) {
        return NextResponse.json(
          { success: false, error: 'phone and rewardId are required for redeem action' },
          { status: 400 }
        )
      }

      const result = await redeemReward(phone, rewardId)
      return NextResponse.json({ success: true, data: result }, { status: 201 })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Must be one of: credit, redeem' },
      { status: 400 }
    )
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error in miles POST handler:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process miles request' },
      { status: 500 }
    )
  }
}
