import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TIER_THRESHOLDS: Record<string, number> = {
  bronze: 0,
  silver: 500,
  gold: 2000,
  platinum: 5000,
};

export const POINT_RULES: Record<string, number> = {
  flight_scan: 50,
  hotel_booking: 100,
  feedback: 25,
  wifi_premium: 10,
  checkin: 30,
  baggage_scan: 40,
  daily_login: 5,
};

export type TierName = 'bronze' | 'silver' | 'gold' | 'platinum';

const TIER_ORDER: TierName[] = ['bronze', 'silver', 'gold', 'platinum'];

// ---------------------------------------------------------------------------
// TypeScript types
// ---------------------------------------------------------------------------

export interface CreditPointsInput {
  phone: string;
  reason: string;
  referenceId?: string;
}

export interface DebitPointsInput {
  phone: string;
  amount: number;
  reason: string;
}

export interface TierUpgradeResult {
  upgraded: boolean;
  previousTier: string;
  newTier: string;
  previousBalance: number;
  newBalance: number;
}

// ---------------------------------------------------------------------------
// Helper: determine tier from total earned points
// ---------------------------------------------------------------------------
function determineTier(totalEarned: number): TierName {
  if (totalEarned >= TIER_THRESHOLDS.platinum) return 'platinum';
  if (totalEarned >= TIER_THRESHOLDS.gold) return 'gold';
  if (totalEarned >= TIER_THRESHOLDS.silver) return 'silver';
  return 'bronze';
}

// ---------------------------------------------------------------------------
// 1. getOrCreateWallet — Get or create a wallet for a user
// ---------------------------------------------------------------------------
export async function getOrCreateWallet(
  phone: string,
  userId?: string,
) {
  try {
    // Try to find existing wallet by phone
    let wallet = await db.userWallet.findUnique({
      where: { phone },
      include: { user: true },
    });

    if (wallet) {
      return wallet;
    }

    // Try to find by userId if provided
    if (userId) {
      wallet = await db.userWallet.findUnique({
        where: { userId },
        include: { user: true },
      });

      if (wallet) {
        return wallet;
      }
    }

    // Find or create the user record first
    let user = await db.user.findUnique({ where: { phone } });

    if (!user && userId) {
      user = await db.user.findUnique({ where: { id: userId } });
    }

    if (!user) {
      user = await db.user.create({
        data: { phone, name: null, language: 'fr', isActive: true },
      });
    }

    // Create wallet
    wallet = await db.userWallet.create({
      data: {
        userId: user.id,
        phone: user.phone,
        balance: 0,
        tier: 'bronze',
        totalEarned: 0,
        totalSpent: 0,
        streakDays: 0,
      },
      include: { user: true },
    });

    return wallet;
  } catch (error) {
    console.error('[gamification.service] getOrCreateWallet error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 2. creditPoints — Add points and check for tier upgrade
// ---------------------------------------------------------------------------
export async function creditPoints(
  phone: string,
  reason: string,
  referenceId?: string,
) {
  try {
    const wallet = await getOrCreateWallet(phone);

    // Look up points for the reason, default to 10 if not in rules
    const points = POINT_RULES[reason] ?? 10;

    const previousTier = wallet.tier;
    const previousBalance = wallet.balance;

    // Create the transaction
    const transaction = await db.milesTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'credit',
        amount: points,
        reason,
        description: `+${points} points: ${reason}`,
        referenceId: referenceId ?? null,
      },
    });

    // Update wallet balance and totals
    const newTotalEarned = wallet.totalEarned + points;
    const newTier = determineTier(newTotalEarned);

    const updatedWallet = await db.userWallet.update({
      where: { id: wallet.id },
      data: {
        balance: { increment: points },
        totalEarned: newTotalEarned,
        tier: newTier,
        lastActivityAt: new Date(),
        tierUpdatedAt: newTier !== previousTier ? new Date() : wallet.tierUpdatedAt,
      },
      include: { user: true },
    });

    const tierUpgradeResult: TierUpgradeResult = {
      upgraded: newTier !== previousTier,
      previousTier,
      newTier,
      previousBalance,
      newBalance: updatedWallet.balance,
    };

    return { transaction, wallet: updatedWallet, tierUpgrade: tierUpgradeResult };
  } catch (error) {
    console.error('[gamification.service] creditPoints error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 3. debitPoints — Deduct points from wallet
// ---------------------------------------------------------------------------
export async function debitPoints(phone: string, amount: number, reason: string) {
  try {
    const wallet = await db.userWallet.findUnique({ where: { phone } });

    if (!wallet) {
      throw new Error('Wallet not found for this phone number');
    }

    if (wallet.balance < amount) {
      throw new Error(
        `Insufficient balance. Current: ${wallet.balance}, Required: ${amount}`,
      );
    }

    // Create the transaction
    const transaction = await db.milesTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'debit',
        amount,
        reason,
        description: `-${amount} points: ${reason}`,
      },
    });

    // Update wallet
    const updatedWallet = await db.userWallet.update({
      where: { id: wallet.id },
      data: {
        balance: { decrement: amount },
        totalSpent: { increment: amount },
        lastActivityAt: new Date(),
      },
      include: { user: true },
    });

    return { transaction, wallet: updatedWallet };
  } catch (error) {
    console.error('[gamification.service] debitPoints error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 4. getBalance — Get wallet with balance info
// ---------------------------------------------------------------------------
export async function getBalance(phone: string) {
  try {
    const wallet = await db.userWallet.findUnique({ where: { phone } });

    if (!wallet) {
      return null;
    }

    const nextTier =
      TIER_ORDER[TIER_ORDER.indexOf(wallet.tier as TierName) + 1] ?? null;

    return {
      ...wallet,
      pointsToNextTier: nextTier
        ? TIER_THRESHOLDS[nextTier] - wallet.totalEarned
        : 0,
      nextTier,
    };
  } catch (error) {
    console.error('[gamification.service] getBalance error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 5. getTransactionHistory — Get transaction history for a wallet
// ---------------------------------------------------------------------------
export async function getTransactionHistory(phone: string) {
  try {
    const wallet = await db.userWallet.findUnique({ where: { phone } });

    if (!wallet) {
      return [];
    }

    const transactions = await db.milesTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
    });

    return transactions;
  } catch (error) {
    console.error('[gamification.service] getTransactionHistory error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 6. getLeaderboard — Top users by balance
// ---------------------------------------------------------------------------
export async function getLeaderboard(limit: number = 10) {
  try {
    const leaders = await db.userWallet.findMany({
      orderBy: { balance: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, phone: true, name: true },
        },
      },
    });

    return leaders;
  } catch (error) {
    console.error('[gamification.service] getLeaderboard error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 7. getAvailableRewards — Rewards available for a tier
// ---------------------------------------------------------------------------
export async function getAvailableRewards(tier: string) {
  try {
    // Get all active reward templates (rewards that are not tied to a specific wallet
    // or are available across all tiers). Since the Reward model is tied to a wallet,
    // we return reward type definitions based on tier.
    const tierRewards: Record<
      string,
      Array<{
        type: string;
        name: string;
        description: string;
        costPoints: number;
        value: string;
      }>
    > = {
      bronze: [
        {
          type: 'wifi_premium',
          name: 'WiFi Premium (60 min)',
          description: 'Accès WiFi premium gratuit pendant 60 minutes',
          costPoints: 100,
          value: JSON.stringify({ duration_minutes: 60, plan: 'premium' }),
        },
        {
          type: 'discount',
          name: 'Réduction Transport 5%',
          description: '5% de réduction sur votre prochaine course',
          costPoints: 200,
          value: JSON.stringify({ discount_percent: 5 }),
        },
      ],
      silver: [
        {
          type: 'wifi_premium',
          name: 'WiFi Premium Plus (120 min)',
          description: 'Accès WiFi premium plus gratuit pendant 120 minutes',
          costPoints: 150,
          value: JSON.stringify({
            duration_minutes: 120,
            plan: 'premium_plus',
          }),
        },
        {
          type: 'discount',
          name: 'Réduction Transport 10%',
          description: '10% de réduction sur votre prochaine course',
          costPoints: 350,
          value: JSON.stringify({ discount_percent: 10 }),
        },
        {
          type: 'lounge_access',
          name: 'Lounge VIP (1h)',
          description: 'Accès gratuit au salon VIP pendant 1 heure',
          costPoints: 500,
          value: JSON.stringify({ lounge_hours: 1 }),
        },
      ],
      gold: [
        {
          type: 'lounge_access',
          name: 'Lounge VIP (3h)',
          description: 'Accès gratuit au salon VIP pendant 3 heures',
          costPoints: 800,
          value: JSON.stringify({ lounge_hours: 3 }),
        },
        {
          type: 'discount',
          name: 'Réduction Marketplace 15%',
          description: '15% de réduction sur le marketplace',
          costPoints: 600,
          value: JSON.stringify({ discount_percent: 15 }),
        },
        {
          type: 'wifi_premium',
          name: 'WiFi Premium Plus (480 min)',
          description: 'Accès WiFi premium plus gratuit pendant 8 heures',
          costPoints: 200,
          value: JSON.stringify({
            duration_minutes: 480,
            plan: 'premium_plus',
          }),
        },
      ],
      platinum: [
        {
          type: 'lounge_access',
          name: 'Lounge VIP (illimité)',
          description: 'Accès illimité au salon VIP',
          costPoints: 1500,
          value: JSON.stringify({ lounge_hours: 24 }),
        },
        {
          type: 'discount',
          name: 'Réduction Marketplace 25%',
          description: '25% de réduction sur le marketplace',
          costPoints: 1000,
          value: JSON.stringify({ discount_percent: 25 }),
        },
        {
          type: 'merchandise',
          name: 'Cadeau Smartly exclusif',
          description: 'Un cadeau surprise de la part de Smartly',
          costPoints: 2000,
          value: JSON.stringify({ merchandise: 'smartly_exclusive' }),
        },
      ],
    };

    return tierRewards[tier] ?? tierRewards.bronze;
  } catch (error) {
    console.error('[gamification.service] getAvailableRewards error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 8. redeemReward — Redeem a reward using wallet points
// ---------------------------------------------------------------------------
export async function redeemReward(phone: string, rewardId: string) {
  try {
    // Find the reward
    const reward = await db.reward.findUnique({
      where: { id: rewardId },
    });

    if (!reward) {
      throw new Error('Reward not found');
    }

    if (reward.status !== 'available') {
      throw new Error('Reward is no longer available');
    }

    if (reward.expiresAt && new Date(reward.expiresAt) < new Date()) {
      throw new Error('Reward has expired');
    }

    // Find wallet and verify it matches
    const wallet = await db.userWallet.findUnique({
      where: { phone },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.id !== reward.walletId) {
      throw new Error('Reward does not belong to this wallet');
    }

    if (wallet.balance < reward.costPoints) {
      throw new Error(
        `Insufficient points. Required: ${reward.costPoints}, Available: ${wallet.balance}`,
      );
    }

    // Deduct points
    const { transaction, wallet: updatedWallet } = await debitPoints(
      phone,
      reward.costPoints,
      `reward_redeemed:${reward.name}`,
    );

    // Mark reward as redeemed
    const redeemedReward = await db.reward.update({
      where: { id: rewardId },
      data: {
        status: 'redeemed',
        redeemedAt: new Date(),
      },
    });

    return { reward: redeemedReward, transaction, wallet: updatedWallet };
  } catch (error) {
    console.error('[gamification.service] redeemReward error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 9. getGamificationStats — Admin stats for gamification system
// ---------------------------------------------------------------------------
export async function getGamificationStats() {
  try {
    const [
      totalWallets,
      totalTransactions,
      totalRewards,
      totalPointsInCirculation,
      tierBreakdown,
      topEarners,
      recentTransactions,
      redeemedRewards,
    ] = await Promise.all([
      db.userWallet.count(),
      db.milesTransaction.count(),
      db.reward.count(),
      db.userWallet.aggregate({ _sum: { balance: true } }),
      db.userWallet.groupBy({
        by: ['tier'],
        _count: { tier: true },
        _sum: { balance: true },
      }),
      db.userWallet.findMany({
        orderBy: { totalEarned: 'desc' },
        take: 5,
        include: {
          user: {
            select: { id: true, phone: true, name: true },
          },
        },
      }),
      db.milesTransaction.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      db.reward.count({ where: { status: 'redeemed' } }),
    ]);

    return {
      totalWallets,
      totalTransactions,
      totalRewards,
      redeemedRewards,
      totalPointsInCirculation: totalPointsInCirculation._sum.balance ?? 0,
      tierBreakdown: tierBreakdown.map((t) => ({
        tier: t.tier,
        count: t._count.tier,
        totalBalance: t._sum.balance ?? 0,
      })),
      topEarners: topEarners.map((w) => ({
        phone: w.phone,
        name: w.user?.name ?? null,
        tier: w.tier,
        totalEarned: w.totalEarned,
        balance: w.balance,
      })),
      transactionsLast7Days: recentTransactions,
    };
  } catch (error) {
    console.error('[gamification.service] getGamificationStats error:', error);
    throw error;
  }
}
