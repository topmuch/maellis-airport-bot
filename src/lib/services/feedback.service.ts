import { db } from '@/lib/db';
import { subDays, startOfWeek, subWeeks, format, parseISO } from 'date-fns';

// ---------------------------------------------------------------------------
// TypeScript types
// ---------------------------------------------------------------------------

export interface SubmitFeedbackInput {
  phone: string;
  userName?: string;
  flightNumber?: string;
  airportCode?: string;
  rating: number;
  category?: string;
  comment?: string;
}

export interface FeedbackFilters {
  airportCode?: string;
  rating?: number;
  category?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface FeedbackListResult {
  feedbacks: Array<{
    id: string;
    phone: string;
    userName: string | null;
    flightNumber: string | null;
    airportCode: string;
    rating: number;
    category: string;
    comment: string | null;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NPSResult {
  score: number;
  totalResponses: number;
  promoters: number;
  passives: number;
  detractors: number;
  promoterPercentage: number;
  passivePercentage: number;
  detractorPercentage: number;
  ratingDistribution: Record<number, number>;
}

export interface FeedbackAnalytics {
  averageRating: number;
  totalFeedbacks: number;
  ratingDistribution: Record<number, number>;
  categoryBreakdown: Array<{ category: string; count: number; avgRating: number }>;
  trend: {
    thisWeek: { count: number; avgRating: number };
    lastWeek: { count: number; avgRating: number };
    changePercent: number;
  };
  lowScoreAlerts: Array<{
    id: string;
    phone: string;
    userName: string | null;
    rating: number;
    category: string;
    comment: string | null;
    createdAt: Date;
  }>;
}

// ---------------------------------------------------------------------------
// Valid categories
// ---------------------------------------------------------------------------

const VALID_CATEGORIES = [
  'overall',
  'lounge',
  'transport',
  'restaurant',
  'wifi',
  'signage',
  'security',
  'general',
];

// ---------------------------------------------------------------------------
// 1. submitFeedback — Create feedback with validation
// ---------------------------------------------------------------------------

export async function submitFeedback(data: SubmitFeedbackInput) {
  try {
    // Validate rating (1-5)
    if (
      typeof data.rating !== 'number' ||
      !Number.isInteger(data.rating) ||
      data.rating < 1 ||
      data.rating > 5
    ) {
      throw new Error('Rating must be an integer between 1 and 5');
    }

    // Validate phone
    if (!data.phone || typeof data.phone !== 'string') {
      throw new Error('Phone number is required');
    }

    // Validate category if provided
    const category = data.category || 'general';
    if (!VALID_CATEGORIES.includes(category)) {
      throw new Error(
        `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
      );
    }

    const feedback = await db.feedback.create({
      data: {
        phone: data.phone,
        userName: data.userName || null,
        flightNumber: data.flightNumber || null,
        airportCode: data.airportCode || 'DSS',
        rating: data.rating,
        category,
        comment: data.comment || null,
      },
    });

    return feedback;
  } catch (error) {
    console.error('[feedback.service] submitFeedback error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 2. getFeedbacks — List with pagination and filters
// ---------------------------------------------------------------------------

export async function getFeedbacks(filters: FeedbackFilters = {}): Promise<FeedbackListResult> {
  try {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (filters.airportCode) {
      where.airportCode = filters.airportCode;
    }

    if (filters.rating !== undefined) {
      where.rating = filters.rating;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        // Include the entire end day
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        (where.createdAt as Record<string, unknown>).lte = endDate;
      }
    }

    const [feedbacks, total] = await Promise.all([
      db.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.feedback.count({ where }),
    ]);

    return {
      feedbacks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error('[feedback.service] getFeedbacks error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 3. getNPSScore — Calculate Net Promoter Score
// Promoters (4-5) - Detractors (1-2) / Total * 100
// ---------------------------------------------------------------------------

export async function getNPSScore(
  airportCode?: string,
  startDate?: string,
  endDate?: string,
): Promise<NPSResult> {
  try {
    const where: Record<string, unknown> = {};

    if (airportCode) {
      where.airportCode = airportCode;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        (where.createdAt as Record<string, unknown>).lte = endDateObj;
      }
    }

    const feedbacks = await db.feedback.findMany({
      where,
      select: { rating: true },
    });

    const totalResponses = feedbacks.length;

    if (totalResponses === 0) {
      return {
        score: 0,
        totalResponses: 0,
        promoters: 0,
        passives: 0,
        detractors: 0,
        promoterPercentage: 0,
        passivePercentage: 0,
        detractorPercentage: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    let promoters = 0;
    let passives = 0;
    let detractors = 0;
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const fb of feedbacks) {
      ratingDistribution[fb.rating] = (ratingDistribution[fb.rating] || 0) + 1;

      if (fb.rating >= 4) {
        promoters++;
      } else if (fb.rating === 3) {
        passives++;
      } else {
        detractors++;
      }
    }

    const promoterPercentage = Math.round((promoters / totalResponses) * 100);
    const passivePercentage = Math.round((passives / totalResponses) * 100);
    const detractorPercentage = Math.round((detractors / totalResponses) * 100);

    // NPS = (Promoters% - Detractors%) → range -100 to +100
    const score = promoterPercentage - detractorPercentage;

    return {
      score,
      totalResponses,
      promoters,
      passives,
      detractors,
      promoterPercentage,
      passivePercentage,
      detractorPercentage,
      ratingDistribution,
    };
  } catch (error) {
    console.error('[feedback.service] getNPSScore error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 4. getFeedbackAnalytics — Full analytics with aggregations
// ---------------------------------------------------------------------------

export async function getFeedbackAnalytics(
  airportCode?: string,
): Promise<FeedbackAnalytics> {
  try {
    const now = new Date();

    // ── Base where for airport ──
    const baseWhere: Record<string, unknown> = {};
    if (airportCode) {
      baseWhere.airportCode = airportCode;
    }

    // ── This week (ISO week starts Monday) ──
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = thisWeekStart;

    // ── Fetch all feedbacks needed for analytics (in 2 weeks window) ──
    const recentFeedbacks = await db.feedback.findMany({
      where: {
        ...baseWhere,
        createdAt: { gte: lastWeekStart },
      },
      select: {
        rating: true,
        category: true,
        createdAt: true,
        id: true,
        phone: true,
        userName: true,
        comment: true,
      },
    });

    // ── Overall stats ──
    const allFeedbacks = await db.feedback.findMany({
      where: baseWhere,
      select: { rating: true, category: true },
    });

    const totalFeedbacks = allFeedbacks.length;

    // Average rating
    let averageRating = 0;
    if (totalFeedbacks > 0) {
      const ratingSum = allFeedbacks.reduce((sum, fb) => sum + fb.rating, 0);
      averageRating = Math.round((ratingSum / totalFeedbacks) * 100) / 100;
    }

    // Rating distribution
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const fb of allFeedbacks) {
      ratingDistribution[fb.rating] = (ratingDistribution[fb.rating] || 0) + 1;
    }

    // Category breakdown with avg rating per category
    const categoryMap = new Map<
      string,
      { count: number; ratingSum: number }
    >();

    for (const fb of allFeedbacks) {
      const existing = categoryMap.get(fb.category) || { count: 0, ratingSum: 0 };
      existing.count++;
      existing.ratingSum += fb.rating;
      categoryMap.set(fb.category, existing);
    }

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        avgRating: Math.round((data.ratingSum / data.count) * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count);

    // ── Trend: this week vs last week ──
    const thisWeekFeedbacks = recentFeedbacks.filter(
      (fb) => fb.createdAt >= thisWeekStart,
    );
    const lastWeekFeedbacks = recentFeedbacks.filter(
      (fb) => fb.createdAt >= lastWeekStart && fb.createdAt < lastWeekEnd,
    );

    const thisWeekAvg =
      thisWeekFeedbacks.length > 0
        ? thisWeekFeedbacks.reduce((s, fb) => s + fb.rating, 0) /
          thisWeekFeedbacks.length
        : 0;
    const lastWeekAvg =
      lastWeekFeedbacks.length > 0
        ? lastWeekFeedbacks.reduce((s, fb) => s + fb.rating, 0) /
          lastWeekFeedbacks.length
        : 0;

    // Change in feedback volume (count-based)
    let changePercent = 0;
    if (lastWeekFeedbacks.length > 0) {
      changePercent =
        Math.round(
          ((thisWeekFeedbacks.length - lastWeekFeedbacks.length) /
            lastWeekFeedbacks.length) *
            10000,
        ) / 100;
    } else if (thisWeekFeedbacks.length > 0) {
      changePercent = 100; // 100% increase when going from 0
    }

    // ── Low-score alerts (rating <= 2) from last 24h ──
    const twentyFourHoursAgo = subDays(now, 1);
    const lowScoreAlerts = await db.feedback.findMany({
      where: {
        ...baseWhere,
        rating: { lte: 2 },
        createdAt: { gte: twentyFourHoursAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      averageRating,
      totalFeedbacks,
      ratingDistribution,
      categoryBreakdown,
      trend: {
        thisWeek: {
          count: thisWeekFeedbacks.length,
          avgRating: Math.round(thisWeekAvg * 100) / 100,
        },
        lastWeek: {
          count: lastWeekFeedbacks.length,
          avgRating: Math.round(lastWeekAvg * 100) / 100,
        },
        changePercent,
      },
      lowScoreAlerts,
    };
  } catch (error) {
    console.error('[feedback.service] getFeedbackAnalytics error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 5. getRecentAlerts — Low-score feedback in last 24 hours
// ---------------------------------------------------------------------------

export async function getRecentAlerts(
  airportCode?: string,
) {
  try {
    const twentyFourHoursAgo = subDays(new Date(), 1);

    const where: Record<string, unknown> = {
      rating: { lte: 2 },
      createdAt: { gte: twentyFourHoursAgo },
    };

    if (airportCode) {
      where.airportCode = airportCode;
    }

    const alerts = await db.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return {
      alerts,
      total: alerts.length,
      timeWindow: '24h',
    };
  } catch (error) {
    console.error('[feedback.service] getRecentAlerts error:', error);
    throw error;
  }
}
