import { db } from '@/lib/db';

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

/** Phone used by the internal system wallet that holds template/default rewards. */
const SYSTEM_REWARDS_PHONE = '__system_rewards__';

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

export interface CreateRewardInput {
  walletId: string;
  name: string;
  description?: string;
  costPoints: number;
  type: string;
  value?: string;
  expiresAt?: Date | null;
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
// Helper: get or create the internal system wallet used for default rewards
// ---------------------------------------------------------------------------
async function getOrCreateSystemWallet() {
  // Try to find an existing system wallet
  let wallet = await db.userWallet.findUnique({
    where: { phone: SYSTEM_REWARDS_PHONE },
  });

  if (wallet) {
    return wallet;
  }

  // Create the system user first
  const userId = 'system_rewards_user';
  let user = await db.user.findUnique({ where: { id: userId } });

  if (!user) {
    user = await db.user.create({
      data: {
        id: userId,
        phone: SYSTEM_REWARDS_PHONE,
        name: 'System Rewards',
        language: 'fr',
        isActive: true,
      },
    });
  }

  wallet = await db.userWallet.create({
    data: {
      userId: user.id,
      phone: user.phone,
      balance: 0,
      tier: 'platinum',
      totalEarned: 0,
      totalSpent: 0,
      streakDays: 0,
    },
  });

  return wallet;
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
      include: { User: true },
    });

    if (wallet) {
      return wallet;
    }

    // Try to find by userId if provided
    if (userId) {
      wallet = await db.userWallet.findUnique({
        where: { userId },
        include: { User: true },
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
      include: { User: true },
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
      include: { User: true },
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
      include: { User: true },
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
        User: {
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
// 7. seedDefaultRewards — Create default reward records in the DB (idempotent)
// ---------------------------------------------------------------------------
export async function seedDefaultRewards() {
  try {
    const systemWallet = await getOrCreateSystemWallet();

    // Define all default rewards per tier
    const defaultRewards: Array<{
      name: string;
      description: string;
      costPoints: number;
      type: string;
      value: string;
      seedKey: string;
    }> = [
      // Bronze rewards
      {
        name: 'Réduction 5% salon VIP',
        description: '[default_bronze_vip_discount]',
        costPoints: 100,
        type: 'bronze',
        value: 'Réduction de 5% sur l\'accès au salon VIP',
        seedKey: 'default_bronze_vip_discount',
      },
      {
        name: 'WiFi gratuit 2h',
        description: '[default_bronze_wifi]',
        costPoints: 50,
        type: 'bronze',
        value: 'Accès WiFi gratuit pendant 2 heures',
        seedKey: 'default_bronze_wifi',
      },

      // Silver rewards
      {
        name: 'Réduction 10% taxi',
        description: '[default_silver_taxi_discount]',
        costPoints: 200,
        type: 'silver',
        value: 'Réduction de 10% sur votre prochaine course en taxi',
        seedKey: 'default_silver_taxi_discount',
      },
      {
        name: 'Café offert',
        description: '[default_silver_coffee]',
        costPoints: 150,
        type: 'silver',
        value: 'Un café offert dans les boutiques de l\'aéroport',
        seedKey: 'default_silver_coffee',
      },
      {
        name: 'Priorité check-in',
        description: '[default_silver_priority_checkin]',
        costPoints: 300,
        type: 'silver',
        value: 'Accès au guichet check-in prioritaire',
        seedKey: 'default_silver_priority_checkin',
      },

      // Gold rewards
      {
        name: 'Salon VIP gratuit',
        description: '[default_gold_lounge]',
        costPoints: 500,
        type: 'gold',
        value: 'Accès gratuit au salon VIP pendant 3 heures',
        seedKey: 'default_gold_lounge',
      },
      {
        name: 'Upgrade siège',
        description: '[default_gold_seat_upgrade]',
        costPoints: 800,
        type: 'gold',
        value: 'Upgrade de siège disponible sur votre prochain vol',
        seedKey: 'default_gold_seat_upgrade',
      },
      {
        name: 'Bagage prioritaire',
        description: '[default_gold_priority_baggage]',
        costPoints: 400,
        type: 'gold',
        value: 'Traitement prioritaire de vos bagages',
        seedKey: 'default_gold_priority_baggage',
      },

      // Platinum rewards
      {
        name: 'Lounge accès illimité 1 mois',
        description: '[default_platinum_lounge_unlimited]',
        costPoints: 1500,
        type: 'platinum',
        value: 'Accès illimité au salon VIP pendant 1 mois',
        seedKey: 'default_platinum_lounge_unlimited',
      },
      {
        name: 'Vol offert',
        description: '[default_platinum_free_flight]',
        costPoints: 5000,
        type: 'platinum',
        value: 'Un vol offert vers une destination de votre choix',
        seedKey: 'default_platinum_free_flight',
      },
      {
        name: 'Chauffeur privé',
        description: '[default_platinum_private_driver]',
        costPoints: 3000,
        type: 'platinum',
        value: 'Transfert aéroport avec chauffeur privé',
        seedKey: 'default_platinum_private_driver',
      },
    ];

    // Fetch existing seeded rewards for this wallet to avoid duplicates
    const existingRewards = await db.reward.findMany({
      where: {
        walletId: systemWallet.id,
        description: { startsWith: '[default_' },
      },
      select: { description: true },
    });

    const existingKeys = new Set(
      existingRewards.map((r) => r.description),
    );

    // Only create rewards that don't already exist
    const toCreate = defaultRewards.filter(
      (r) => !existingKeys.has(r.description),
    );

    if (toCreate.length === 0) {
      console.log('[gamification.service] seedDefaultRewards: all default rewards already exist, skipping.');
      return { created: 0, skipped: defaultRewards.length };
    }

    const results = await db.reward.createMany({
      data: toCreate.map((r) => ({
        walletId: systemWallet.id,
        name: r.name,
        description: r.description,
        costPoints: r.costPoints,
        type: r.type,
        value: r.value,
        status: 'available',
        expiresAt: null,
      })),
    });

    console.log(
      `[gamification.service] seedDefaultRewards: created ${results.count} rewards, skipped ${existingKeys.size}.`,
    );

    return { created: results.count, skipped: existingKeys.size };
  } catch (error) {
    console.error('[gamification.service] seedDefaultRewards error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 8. getAvailableRewards — Rewards available for a tier (DB-backed)
// ---------------------------------------------------------------------------
export async function getAvailableRewards(tier: string) {
  try {
    // Ensure default rewards exist (idempotent — safe to call every time)
    await seedDefaultRewards();

    // Get the system wallet that holds the template rewards
    const systemWallet = await db.userWallet.findUnique({
      where: { phone: SYSTEM_REWARDS_PHONE },
    });

    if (!systemWallet) {
      // Fallback: return empty if system wallet was never created
      return [];
    }

    // Query available rewards for this tier (or rewards available to "all")
    const rewards = await db.reward.findMany({
      where: {
        walletId: systemWallet.id,
        status: 'available',
        type: { in: [tier, 'all'] },
      },
      orderBy: { costPoints: 'asc' },
    });

    return rewards;
  } catch (error) {
    console.error('[gamification.service] getAvailableRewards error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 9. redeemReward — Redeem a reward using wallet points
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
// 10. getGamificationStats — Admin stats for gamification system
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
          User: {
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
        name: w.User?.name ?? null,
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

// ---------------------------------------------------------------------------
// 11. createReward — Admin CRUD: create a new reward
// ---------------------------------------------------------------------------
export async function createReward(data: CreateRewardInput) {
  try {
    const reward = await db.reward.create({
      data: {
        walletId: data.walletId,
        name: data.name,
        description: data.description ?? null,
        costPoints: data.costPoints,
        type: data.type,
        value: data.value ?? null,
        status: 'available',
        expiresAt: data.expiresAt ?? null,
      },
    });

    return reward;
  } catch (error) {
    console.error('[gamification.service] createReward error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 12. deleteReward — Admin CRUD: soft-delete a reward (set status to 'expired')
// ---------------------------------------------------------------------------
export async function deleteReward(id: string) {
  try {
    const reward = await db.reward.findUnique({ where: { id } });

    if (!reward) {
      throw new Error('Reward not found');
    }

    const updated = await db.reward.update({
      where: { id },
      data: {
        status: 'expired',
      },
    });

    return updated;
  } catch (error) {
    console.error('[gamification.service] deleteReward error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 13. getAllRewards — Admin: return all rewards ordered by type, then costPoints
// ---------------------------------------------------------------------------
export async function getAllRewards() {
  try {
    const rewards = await db.reward.findMany({
      orderBy: [
        { type: 'asc' },
        { costPoints: 'asc' },
      ],
    });

    return rewards;
  } catch (error) {
    console.error('[gamification.service] getAllRewards error:', error);
    throw error;
  }
}
