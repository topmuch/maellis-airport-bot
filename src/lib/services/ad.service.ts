import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Validation Helpers
// ---------------------------------------------------------------------------

/** Validate a non-negative finite number (must be >= 0) */
function validateNonNegative(value: unknown, fieldName: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }
  return n;
}

/** Wrap error to prevent internal details from leaking */
function safeError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ad.service] ${context}:`, message);
  if (error instanceof Error) {
    return new Error(error.message.includes('Prisma') ? 'Database error' : error.message);
  }
  return new Error('An unexpected error occurred');
}

/** Validate a date string produces a valid Date */
function validateDate(value: unknown, fieldName: string): Date {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid ${fieldName}: not a valid date`);
  }
  return d;
}

/** Validate that a value is in an allowed set */
function validateEnum<T extends string>(value: unknown, fieldName: string, allowed: T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new Error(`Invalid ${fieldName}. Must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
}

/** Validate that a URL does not start with javascript: */
function validateSafeUrl(url: unknown, fieldName: string): string | null {
  if (url === undefined || url === null) return null;
  if (typeof url !== 'string') {
    throw new Error(`${fieldName} must be a string or null`);
  }
  const trimmed = url.trim();
  if (trimmed.length === 0) return null;
  if (/^\s*javascript:/i.test(trimmed)) {
    throw new Error(`${fieldName} must not start with javascript:`);
  }
  return trimmed;
}

// ---------------------------------------------------------------------------
// TypeScript types
// ---------------------------------------------------------------------------

export interface CreateCampaignInput {
  airportCode: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  totalBudget?: number;
  status?: string;
}

export interface CreateAdInput {
  airportCode: string;
  campaignId?: string;
  merchantId?: string;
  title: string;
  description?: string;
  type: string;
  placement: string;
  imageUrl: string;
  videoUrl?: string;
  targetUrl?: string;
  ctaText?: string;
  targetAudience?: string;
  startDate: string;
  endDate: string;
  budget: number;
  budgetType?: string;
  cpmRate?: number;
  cpcRate?: number;
}

export interface UpdateAdInput {
  title?: string;
  description?: string;
  type?: string;
  placement?: string;
  imageUrl?: string;
  videoUrl?: string;
  targetUrl?: string;
  ctaText?: string;
  targetAudience?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  budgetType?: string;
  cpmRate?: number;
  cpcRate?: number;
  merchantId?: string | null;
  campaignId?: string | null;
}

export interface TrackImpressionInput {
  advertisementId: string;
  sessionId?: string;
  placement: string;
  deviceInfo?: string;
  location?: string;
}

export interface TrackClickInput {
  conversionValue?: number;
}

export interface TrackConversionInput {
  impressionId: string;
  conversionValue: number;
}

export interface AdContext {
  destination?: string;
  flightClass?: string;
  frequency?: string;
  terminal?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_AD_TYPES = ['banner', 'sponsored_message', 'push_notification', 'native', 'video'];
const VALID_PLACEMENTS = ['home', 'between_messages', 'bottom_banner', 'search_results', 'flight_status'];
const VALID_AD_STATUSES = ['draft', 'pending', 'active', 'paused', 'completed', 'rejected'];
const VALID_CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'completed'];
const VALID_BUDGET_TYPES = ['total', 'daily', 'cpm', 'cpc'];

// ─── Zod Validation Schemas ──────────────────────────────────────────────

const campaignStatusZodEnum = z.enum(VALID_CAMPAIGN_STATUSES);
const adTypeZodEnum = z.enum(VALID_AD_TYPES);
const placementZodEnum = z.enum(VALID_PLACEMENTS);
const adStatusZodEnum = z.enum(VALID_AD_STATUSES);
const budgetTypeZodEnum = z.enum(VALID_BUDGET_TYPES);
const yyyyMmddRegex = /^\d{4}-\d{2}-\d{2}$/;
const dateSchema = z.string().regex(yyyyMmddRegex, 'Must be a valid date in YYYY-MM-DD format');

const getCampaignsSchema = z.object({
  airportCode: z.string().optional(),
  status: campaignStatusZodEnum.optional(),
});

const getAdsSchema = z.object({
  airportCode: z.string().optional(),
  placement: placementZodEnum.optional(),
  type: adTypeZodEnum.optional(),
  status: adStatusZodEnum.optional(),
  merchantId: z.string().optional(),
});

const getAdRevenueSchema = z.object({
  airportCode: z.string().optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
});

const trackImpressionSchema = z.object({
  advertisementId: z.string().min(1, 'advertisementId is required'),
  sessionId: z.string().max(100).optional(),
  placement: placementZodEnum,
  deviceInfo: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
});

const rejectAdSchema = z.object({
  reason: z.string().max(500, 'Rejection reason must be at most 500 characters'),
});

// ---------------------------------------------------------------------------
// 1. getCampaigns — List campaigns with filters, include ad count
// ---------------------------------------------------------------------------
export async function getCampaigns(airportCode?: string, status?: string) {
  try {
    // Zod validation
    const parsed = getCampaignsSchema.safeParse({ airportCode, status });
    if (!parsed.success) {
      throw new Error(`Validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`);
    }
    const { airportCode: validatedAirportCode, status: validatedStatus } = parsed.data;

    const where: Prisma.AdCampaignWhereInput = {};

    if (validatedAirportCode) {
      where.airportCode = validatedAirportCode.toUpperCase();
    }

    if (validatedStatus) {
      where.status = validatedStatus;
    }

    const campaigns = await db.adCampaign.findMany({
      where,
      include: {
        _count: {
          select: { Advertisement: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return campaigns;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Validation failed')) {
      throw error;
    }
    throw safeError(error, 'getCampaigns');
  }
}

// ---------------------------------------------------------------------------
// 2. getCampaignById — Get campaign with advertisements
// ---------------------------------------------------------------------------
export async function getCampaignById(id: string) {
  try {
    const campaign = await db.adCampaign.findUnique({
      where: { id },
      include: {
        Advertisement: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!campaign) {
      console.error(`[ad.service] Campaign not found: ${id}`);
      return null;
    }

    return campaign;
  } catch (error) {
    throw safeError(error, 'getCampaignById');
  }
}

// ---------------------------------------------------------------------------
// 3. createCampaign — Create campaign
// ---------------------------------------------------------------------------
export async function createCampaign(data: CreateCampaignInput) {
  try {
    // Validate inputs
    const safeBudget = validateNonNegative(data.totalBudget, 'totalBudget');
    const startDate = validateDate(data.startDate, 'startDate');
    const endDate = validateDate(data.endDate, 'endDate');

    if (endDate <= startDate) {
      throw new Error('endDate must be after startDate');
    }

    const campaign = await db.adCampaign.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        airportCode: data.airportCode.toUpperCase(),
        name: data.name,
        description: data.description ?? null,
        startDate,
        endDate,
        totalBudget: safeBudget,
        status: 'draft',
      },
    });

    return campaign;
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Invalid') || error.message.startsWith('endDate') || error.message.includes('must be'))) {
      throw error;
    }
    throw safeError(error, 'createCampaign');
  }
}

// ---------------------------------------------------------------------------
// 4. updateCampaign — Partial update
// ---------------------------------------------------------------------------
export async function updateCampaign(id: string, data: UpdateCampaignInput) {
  try {
    const existing = await db.adCampaign.findUnique({ where: { id } });
    if (!existing) {
      console.error(`[ad.service] updateCampaign: campaign not found: ${id}`);
      return null;
    }

    const updateData: Prisma.AdCampaignUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startDate !== undefined) updateData.startDate = validateDate(data.startDate, 'startDate');
    if (data.endDate !== undefined) updateData.endDate = validateDate(data.endDate, 'endDate');
    if (data.totalBudget !== undefined) updateData.totalBudget = validateNonNegative(data.totalBudget, 'totalBudget');
    if (data.status !== undefined) updateData.status = validateEnum(data.status, 'campaign status', VALID_CAMPAIGN_STATUSES);

    const campaign = await db.adCampaign.update({
      where: { id },
      data: updateData,
    });

    return campaign;
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Invalid') || error.message.includes('must be'))) {
      throw error;
    }
    throw safeError(error, 'updateCampaign');
  }
}

// ---------------------------------------------------------------------------
// 5. deleteCampaign — Hard delete (cascade will delete ads)
// ---------------------------------------------------------------------------
export async function deleteCampaign(id: string) {
  try {
    const existing = await db.adCampaign.findUnique({ where: { id } });
    if (!existing) {
      console.error(`[ad.service] deleteCampaign: campaign not found: ${id}`);
      return null;
    }

    await db.adCampaign.delete({
      where: { id },
    });

    return { success: true, deletedId: id };
  } catch (error) {
    throw safeError(error, 'deleteCampaign');
  }
}

// ---------------------------------------------------------------------------
// 6. getCampaignStats — Aggregated stats for a campaign
// ---------------------------------------------------------------------------
export async function getCampaignStats(id: string) {
  try {
    const campaign = await db.adCampaign.findUnique({
      where: { id },
      include: {
        Advertisement: {
          select: {
            status: true,
            impressions: true,
            clicks: true,
            conversions: true,
            revenue: true,
          },
        },
      },
    });

    if (!campaign) {
      console.error(`[ad.service] getCampaignStats: campaign not found: ${id}`);
      return null;
    }

    const ads = campaign.Advertisement;
    const totalAds = ads.length;
    const activeAds = ads.filter((ad) => ad.status === 'active').length;
    const totalImpressions = ads.reduce((sum, ad) => sum + ad.impressions, 0);
    const totalClicks = ads.reduce((sum, ad) => sum + ad.clicks, 0);
    const totalConversions = ads.reduce((sum, ad) => sum + ad.conversions, 0);
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    const remainingBudget = campaign.totalBudget - campaign.spentBudget;

    return {
      campaignId: id,
      campaignName: campaign.name,
      status: campaign.status,
      totalBudget: campaign.totalBudget,
      spentBudget: campaign.spentBudget,
      remainingBudget,
      totalAds,
      activeAds,
      totalImpressions,
      totalClicks,
      totalConversions,
      ctr: Math.round(ctr * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  } catch (error) {
    throw safeError(error, 'getCampaignStats');
  }
}

// ---------------------------------------------------------------------------
// 7. activateCampaign — Set status=active, also activate all draft ads
// ---------------------------------------------------------------------------
export async function activateCampaign(id: string) {
  try {
    const existing = await db.adCampaign.findUnique({ where: { id } });
    if (!existing) {
      console.error(`[ad.service] activateCampaign: campaign not found: ${id}`);
      return null;
    }

    if (!['draft', 'paused'].includes(existing.status)) {
      throw new Error(`Cannot activate campaign in status: ${existing.status}`);
    }

    const campaign = await db.$transaction(async (tx) => {
      const updated = await tx.adCampaign.update({
        where: { id },
        data: { status: 'active' },
      });

      // Activate all draft ads in this campaign
      await tx.advertisement.updateMany({
        where: {
          campaignId: id,
          status: 'draft',
        },
        data: { status: 'pending' },
      });

      return updated;
    });

    return campaign;
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Cannot') || error.message.startsWith('Campaign'))) {
      throw error;
    }
    throw safeError(error, 'activateCampaign');
  }
}

// ---------------------------------------------------------------------------
// 8. getAds — List ads with filters
// ---------------------------------------------------------------------------
export async function getAds(
  airportCode?: string,
  placement?: string,
  type?: string,
  status?: string,
  merchantId?: string,
) {
  try {
    // Zod validation
    const parsed = getAdsSchema.safeParse({ airportCode, placement, type, status, merchantId });
    if (!parsed.success) {
      throw new Error(`Validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`);
    }
    const {
      airportCode: ac,
      placement: pl,
      type: tp,
      status: st,
      merchantId: mi,
    } = parsed.data;

    const where: Prisma.AdvertisementWhereInput = {};

    if (ac) {
      where.airportCode = ac.toUpperCase();
    }
    if (pl) {
      where.placement = pl;
    }
    if (tp) {
      where.type = tp;
    }
    if (st) {
      where.status = st;
    }
    if (mi) {
      where.merchantId = mi;
    }

    const ads = await db.advertisement.findMany({
      where,
      include: {
        AdCampaign: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        merchant: {
          select: {
            id: true,
            name: true,
            category: true,
            logo: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ads;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Validation failed')) {
      throw error;
    }
    throw safeError(error, 'getAds');
  }
}

// ---------------------------------------------------------------------------
// 9. getAdById — With campaign and merchant info
// ---------------------------------------------------------------------------
export async function getAdById(id: string) {
  try {
    const ad = await db.advertisement.findUnique({
      where: { id },
      include: {
        AdCampaign: {
          select: {
            id: true,
            name: true,
            status: true,
            totalBudget: true,
            spentBudget: true,
          },
        },
        merchant: {
          select: {
            id: true,
            name: true,
            category: true,
            logo: true,
            isActive: true,
          },
        },
      },
    });

    if (!ad) {
      console.error(`[ad.service] Ad not found: ${id}`);
      return null;
    }

    return ad;
  } catch (error) {
    throw safeError(error, 'getAdById');
  }
}

// ---------------------------------------------------------------------------
// 10. createAd — Create advertisement (status=draft)
// ---------------------------------------------------------------------------
export async function createAd(data: CreateAdInput) {
  try {
    // Validate inputs
    const safeBudget = validateNonNegative(data.budget, 'budget');
    const safeCpmRate = data.cpmRate !== undefined && data.cpmRate !== null
      ? validateNonNegative(data.cpmRate, 'cpmRate') : null;
    const safeCpcRate = data.cpcRate !== undefined && data.cpcRate !== null
      ? validateNonNegative(data.cpcRate, 'cpcRate') : null;
    const safeType = validateEnum(data.type, 'ad type', VALID_AD_TYPES);
    const safePlacement = validateEnum(data.placement, 'placement', VALID_PLACEMENTS);
    const safeTargetUrl = validateSafeUrl(data.targetUrl, 'targetUrl');
    const safeVideoUrl = validateSafeUrl(data.videoUrl, 'videoUrl');
    const safeStartDate = validateDate(data.startDate, 'startDate');
    const safeEndDate = validateDate(data.endDate, 'endDate');
    const safeBudgetType = data.budgetType
      ? validateEnum(data.budgetType, 'budgetType', VALID_BUDGET_TYPES) : 'total';

    const ad = await db.advertisement.create({
      data: {
        id: crypto.randomUUID(),
        airportCode: data.airportCode.toUpperCase(),
        campaignId: data.campaignId ?? null,
        merchantId: data.merchantId ?? null,
        title: data.title,
        description: data.description ?? null,
        type: safeType,
        placement: safePlacement,
        imageUrl: data.imageUrl,
        videoUrl: safeVideoUrl,
        targetUrl: safeTargetUrl,
        ctaText: data.ctaText ?? 'En savoir plus',
        targetAudience: data.targetAudience ?? null,
        startDate: safeStartDate,
        endDate: safeEndDate,
        budget: safeBudget,
        budgetType: safeBudgetType,
        cpmRate: safeCpmRate,
        cpcRate: safeCpcRate,
        status: 'draft',
        updatedAt: new Date(),
      },
    });

    return ad;
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Invalid') || error.message.startsWith('must not') || error.message.includes('must be'))) {
      throw error;
    }
    throw safeError(error, 'createAd');
  }
}

// ---------------------------------------------------------------------------
// 11. updateAd — Partial update
// ---------------------------------------------------------------------------
export async function updateAd(id: string, data: UpdateAdInput) {
  try {
    const existing = await db.advertisement.findUnique({ where: { id } });
    if (!existing) {
      console.error(`[ad.service] updateAd: ad not found: ${id}`);
      return null;
    }

    const updateData: Prisma.AdvertisementUpdateInput = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = validateEnum(data.type, 'ad type', VALID_AD_TYPES);
    if (data.placement !== undefined) updateData.placement = validateEnum(data.placement, 'placement', VALID_PLACEMENTS);
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.videoUrl !== undefined) updateData.videoUrl = validateSafeUrl(data.videoUrl, 'videoUrl');
    if (data.targetUrl !== undefined) updateData.targetUrl = validateSafeUrl(data.targetUrl, 'targetUrl');
    if (data.ctaText !== undefined) updateData.ctaText = data.ctaText;
    if (data.targetAudience !== undefined) updateData.targetAudience = data.targetAudience;
    if (data.startDate !== undefined) updateData.startDate = validateDate(data.startDate, 'startDate');
    if (data.endDate !== undefined) updateData.endDate = validateDate(data.endDate, 'endDate');
    if (data.budget !== undefined) updateData.budget = validateNonNegative(data.budget, 'budget');
    if (data.budgetType !== undefined) updateData.budgetType = validateEnum(data.budgetType, 'budgetType', VALID_BUDGET_TYPES);
    if (data.cpmRate !== undefined) updateData.cpmRate = data.cpmRate !== null ? validateNonNegative(data.cpmRate, 'cpmRate') : null;
    if (data.cpcRate !== undefined) updateData.cpcRate = data.cpcRate !== null ? validateNonNegative(data.cpcRate, 'cpcRate') : null;
    if (data.merchantId !== undefined) updateData.Merchant = data.merchantId ? { connect: { id: data.merchantId } } : { disconnect: true };
    if (data.campaignId !== undefined) updateData.AdCampaign = data.campaignId ? { connect: { id: data.campaignId } } : { disconnect: true };

    const ad = await db.advertisement.update({
      where: { id },
      data: updateData,
    });

    return ad;
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Invalid') || error.message.startsWith('must not') || error.message.includes('must be'))) {
      throw error;
    }
    throw safeError(error, 'updateAd');
  }
}

// ---------------------------------------------------------------------------
// 12. deleteAd — Hard delete
// ---------------------------------------------------------------------------
export async function deleteAd(id: string) {
  try {
    const existing = await db.advertisement.findUnique({ where: { id } });
    if (!existing) {
      console.error(`[ad.service] deleteAd: ad not found: ${id}`);
      return null;
    }

    await db.advertisement.delete({
      where: { id },
    });

    return { success: true, deletedId: id };
  } catch (error) {
    throw safeError(error, 'deleteAd');
  }
}

// ---------------------------------------------------------------------------
// 13. submitForReview — Change status from draft → pending
// ---------------------------------------------------------------------------
export async function submitForReview(id: string) {
  try {
    const ad = await db.advertisement.findUnique({ where: { id } });
    if (!ad) {
      console.error(`[ad.service] submitForReview: ad not found: ${id}`);
      return null;
    }

    if (ad.status !== 'draft') {
      throw new Error(`Cannot submit ad for review in status: ${ad.status}. Only draft ads can be submitted.`);
    }

    const updated = await db.advertisement.update({
      where: { id },
      data: { status: 'pending' },
    });

    return updated;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Cannot')) {
      throw error;
    }
    throw safeError(error, 'submitForReview');
  }
}

// ---------------------------------------------------------------------------
// 14. pauseAd — Change status from active → paused
// ---------------------------------------------------------------------------
export async function pauseAd(id: string) {
  try {
    const ad = await db.advertisement.findUnique({ where: { id } });
    if (!ad) {
      console.error(`[ad.service] pauseAd: ad not found: ${id}`);
      return null;
    }

    if (ad.status !== 'active') {
      throw new Error(`Cannot pause ad in status: ${ad.status}. Only active ads can be paused.`);
    }

    const updated = await db.advertisement.update({
      where: { id },
      data: { status: 'paused' },
    });

    return updated;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Cannot')) {
      throw error;
    }
    throw safeError(error, 'pauseAd');
  }
}

// ---------------------------------------------------------------------------
// 15. resumeAd — Change status from paused → active
// ---------------------------------------------------------------------------
export async function resumeAd(id: string) {
  try {
    const ad = await db.advertisement.findUnique({ where: { id } });
    if (!ad) {
      console.error(`[ad.service] resumeAd: ad not found: ${id}`);
      return null;
    }

    if (ad.status !== 'paused') {
      throw new Error(`Cannot resume ad in status: ${ad.status}. Only paused ads can be resumed.`);
    }

    const updated = await db.advertisement.update({
      where: { id },
      data: { status: 'active' },
    });

    return updated;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Cannot')) {
      throw error;
    }
    throw safeError(error, 'resumeAd');
  }
}

// ---------------------------------------------------------------------------
// 16. approveAd — Admin approves: status → active, check startDate/endDate
// ---------------------------------------------------------------------------
export async function approveAd(id: string) {
  try {
    const ad = await db.advertisement.findUnique({ where: { id } });
    if (!ad) {
      console.error(`[ad.service] approveAd: ad not found: ${id}`);
      return null;
    }

    if (ad.status !== 'pending') {
      throw new Error(`Cannot approve ad in status: ${ad.status}. Only pending ads can be approved.`);
    }

    const now = new Date();
    let newStatus: string;

    if (now < ad.startDate) {
      // Not yet started — keep pending but mark approved
      newStatus = 'pending';
    } else if (now > ad.endDate) {
      // Already ended
      newStatus = 'completed';
    } else {
      // Within date range — activate
      newStatus = 'active';
    }

    const updated = await db.advertisement.update({
      where: { id },
      data: {
        status: newStatus,
        rejectionReason: null,
      },
    });

    return updated;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Cannot')) {
      throw error;
    }
    throw safeError(error, 'approveAd');
  }
}

// ---------------------------------------------------------------------------
// 17. rejectAd — Admin rejects: status → rejected, save reason
// ---------------------------------------------------------------------------
export async function rejectAd(id: string, reason: string) {
  try {
    // Zod validation
    const parsed = rejectAdSchema.safeParse({ reason });
    if (!parsed.success) {
      throw new Error(`Validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`);
    }

    const ad = await db.advertisement.findUnique({ where: { id } });
    if (!ad) {
      console.error(`[ad.service] rejectAd: ad not found: ${id}`);
      return null;
    }

    if (ad.status !== 'pending') {
      throw new Error(`Cannot reject ad in status: ${ad.status}. Only pending ads can be rejected.`);
    }

    const updated = await db.advertisement.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: reason,
      },
    });

    return updated;
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Validation failed') || error.message.startsWith('Cannot'))) {
      throw error;
    }
    throw safeError(error, 'rejectAd');
  }
}

// ---------------------------------------------------------------------------
// 18. trackImpression — Create AdImpression + increment ad.impressions
// ---------------------------------------------------------------------------
export async function trackImpression(data: TrackImpressionInput) {
  try {
    // Zod validation
    const parsed = trackImpressionSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`Validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`);
    }
    const validatedData = parsed.data;

    const result = await db.$transaction(async (tx) => {
      // Verify ad exists and is active
      const ad = await tx.advertisement.findUnique({
        where: { id: validatedData.advertisementId },
      });

      if (!ad) {
        throw new Error('Advertisement not found');
      }

      // Create impression record
      const impression = await tx.adImpression.create({
        data: {
          id: crypto.randomUUID(),
          advertisementId: validatedData.advertisementId,
          sessionId: validatedData.sessionId ?? null,
          placement: validatedData.placement,
          deviceInfo: validatedData.deviceInfo ?? null,
          location: validatedData.location ?? null,
          timestamp: new Date(),
        },
      });

      // Increment ad impressions counter
      await tx.advertisement.update({
        where: { id: validatedData.advertisementId },
        data: {
          impressions: { increment: 1 },
        },
      });

      // Calculate revenue based on budget type
      let revenueIncrement = 0;
      if (ad.budgetType === 'cpm' && ad.cpmRate) {
        revenueIncrement = ad.cpmRate / 1000;
      }

      if (revenueIncrement > 0) {
        await tx.advertisement.update({
          where: { id: validatedData.advertisementId },
          data: {
            revenue: { increment: revenueIncrement },
          },
        });

        // Update campaign spent budget if ad has a campaign
        if (ad.campaignId) {
          await tx.adCampaign.update({
            where: { id: ad.campaignId },
            data: {
              spentBudget: { increment: revenueIncrement },
            },
          });
        }
      }

      return impression;
    });

    return result;
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Validation failed') || error.message.startsWith('Advertisement'))) {
      throw error;
    }
    throw safeError(error, 'trackImpression');
  }
}

// ---------------------------------------------------------------------------
// 19. trackClick — Create AdClick + increment ad.clicks
// ---------------------------------------------------------------------------
export async function trackClick(impressionId: string, data?: TrackClickInput) {
  try {
    const result = await db.$transaction(async (tx) => {
      // Verify impression exists
      const impression = await tx.adImpression.findUnique({
        where: { id: impressionId },
        include: { Advertisement: true },
      });

      if (!impression) {
        throw new Error('Impression not found');
      }

      // Create click record
      const click = await tx.adClick.create({
        data: {
          id: crypto.randomUUID(),
          impressionId,
          conversionValue: data?.conversionValue ?? 0,
          timestamp: new Date(),
        },
      });

      // Increment ad clicks counter
      await tx.advertisement.update({
        where: { id: impression.advertisementId },
        data: {
          clicks: { increment: 1 },
        },
      });

      // Calculate revenue based on budget type
      let revenueIncrement = 0;
      const ad = impression.Advertisement;
      if (ad.budgetType === 'cpc' && ad.cpcRate) {
        revenueIncrement = ad.cpcRate;
      }

      if (revenueIncrement > 0) {
        await tx.advertisement.update({
          where: { id: impression.advertisementId },
          data: {
            revenue: { increment: revenueIncrement },
          },
        });

        // Update campaign spent budget if ad has a campaign
        if (ad.campaignId) {
          await tx.adCampaign.update({
            where: { id: ad.campaignId },
            data: {
              spentBudget: { increment: revenueIncrement },
            },
          });
        }
      }

      return click;
    });

    return result;
  } catch (error) {
    throw safeError(error, 'trackClick');
  }
}

// ---------------------------------------------------------------------------
// 20. trackConversion — Update AdClick + increment ad.conversions + ad.revenue
// ---------------------------------------------------------------------------
export async function trackConversion(impressionId: string, conversionValue: number) {
  try {
    // Validate conversion value
    const safeConversionValue = validateNonNegative(conversionValue, 'conversionValue');

    const result = await db.$transaction(async (tx) => {
      // Verify impression exists
      const impression = await tx.adImpression.findUnique({
        where: { id: impressionId },
        include: { Advertisement: true },
      });

      if (!impression) {
        throw new Error('Impression not found');
      }

      // Find the latest click for this impression that hasn't been converted
      const click = await tx.adClick.findFirst({
        where: {
          impressionId,
          converted: false,
        },
        orderBy: { timestamp: 'desc' },
      });

      if (!click) {
        throw new Error('No unconverted click found for this impression');
      }

      // Mark click as converted
      await tx.adClick.update({
        where: { id: click.id },
        data: {
          converted: true,
          conversionValue: safeConversionValue,
        },
      });

      // Increment ad conversions and revenue
      await tx.advertisement.update({
        where: { id: impression.advertisementId },
        data: {
          conversions: { increment: 1 },
          revenue: { increment: safeConversionValue },
        },
      });

      // Update campaign spent budget if ad has a campaign
      const ad = impression.Advertisement;
      if (ad.campaignId) {
        await tx.adCampaign.update({
          where: { id: ad.campaignId },
          data: {
            spentBudget: { increment: safeConversionValue },
          },
        });
      }

      return { clickId: click.id, conversionValue: safeConversionValue };
    });

    return result;
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Invalid') || error.message.startsWith('Impression') || error.message.startsWith('No unconverted'))) {
      throw error;
    }
    throw safeError(error, 'trackConversion');
  }
}

// ---------------------------------------------------------------------------
// 21. getActiveAds — Get currently active ads (for end-user display)
// ---------------------------------------------------------------------------
export async function getActiveAds(
  airportCode: string,
  placement?: string,
  context?: AdContext,
) {
  try {
    const now = new Date();

    const where: Prisma.AdvertisementWhereInput = {
      airportCode: airportCode.toUpperCase(),
      status: 'active',
      startDate: { lte: now },
      endDate: { gte: now },
    };

    if (placement) {
      where.placement = placement;
    }

    const ads = await db.advertisement.findMany({
      where,
      orderBy: { budget: 'desc' },
    });

    // Filter by target audience if context is provided
    if (context) {
      const filteredAds = ads.filter((ad) => {
        if (!ad.targetAudience) return true; // No targeting = show to everyone

        try {
          const targeting = JSON.parse(ad.targetAudience);

          // Check destination match
          if (targeting.destinations && targeting.destinations.length > 0 && context.destination) {
            if (!targeting.destinations.some((d: string) =>
              d.toLowerCase() === context.destination?.toLowerCase()
            )) {
              return false;
            }
          }

          // Check flight class match
          if (targeting.class && targeting.class.length > 0 && context.flightClass) {
            if (!targeting.class.some((c: string) =>
              c.toLowerCase() === context.flightClass?.toLowerCase()
            )) {
              return false;
            }
          }

          // Check frequency match
          if (targeting.frequency && context.frequency) {
            if (targeting.frequency.toLowerCase() !== context.frequency.toLowerCase()) {
              return false;
            }
          }

          return true;
        } catch {
          // Invalid JSON in targetAudience — show ad by default
          return true;
        }
      });

      return filteredAds;
    }

    return ads;
  } catch (error) {
    throw safeError(error, 'getActiveAds');
  }
}

// ---------------------------------------------------------------------------
// 22. getAdRevenue — Sum of revenue across ads for period
// ---------------------------------------------------------------------------
export async function getAdRevenue(
  airportCode?: string,
  startDate?: string,
  endDate?: string,
) {
  try {
    // Zod validation
    const parsed = getAdRevenueSchema.safeParse({ airportCode, startDate, endDate });
    if (!parsed.success) {
      throw new Error(`Validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`);
    }
    const { airportCode: ac, startDate: sd, endDate: ed } = parsed.data;

    const where: Prisma.AdvertisementWhereInput = {};

    if (ac) {
      where.airportCode = ac.toUpperCase();
    }

    if (sd || ed) {
      where.createdAt = {};
      if (sd) {
        where.createdAt.gte = new Date(sd);
      }
      if (ed) {
        const end = new Date(ed);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const revenueData = await db.advertisement.aggregate({
      where,
      _sum: {
        revenue: true,
      },
      _count: {
        id: true,
      },
    });

    // Get breakdown by ad type
    const byType = await db.advertisement.groupBy({
      by: ['type'],
      where,
      _sum: {
        revenue: true,
        impressions: true,
        clicks: true,
      },
    });

    // Get breakdown by placement
    const byPlacement = await db.advertisement.groupBy({
      by: ['placement'],
      where,
      _sum: {
        revenue: true,
        impressions: true,
        clicks: true,
      },
    });

    return {
      totalRevenue: revenueData._sum.revenue ?? 0,
      totalAds: revenueData._count.id,
      byType,
      byPlacement,
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Validation failed')) {
      throw error;
    }
    throw safeError(error, 'getAdRevenue');
  }
}

// ---------------------------------------------------------------------------
// 23. getAdInventory — Available placements and their current utilization
// ---------------------------------------------------------------------------
export async function getAdInventory(airportCode?: string) {
  try {
    const where: Prisma.AdvertisementWhereInput = {};

    if (airportCode) {
      where.airportCode = airportCode.toUpperCase();
    }

    // Get active ads grouped by placement
    const activeAdsByPlacement = await db.advertisement.groupBy({
      by: ['placement'],
      where: {
        ...where,
        status: 'active',
      },
      _count: {
        id: true,
      },
    });

    // Get total ads grouped by placement
    const totalAdsByPlacement = await db.advertisement.groupBy({
      by: ['placement'],
      where,
      _count: {
        id: true,
      },
    });

    // Build inventory report for each placement
    const placements = VALID_PLACEMENTS.map((placement) => {
      const activeCount = activeAdsByPlacement.find((g) => g.placement === placement)?._count.id ?? 0;
      const totalCount = totalAdsByPlacement.find((g) => g.placement === placement)?._count.id ?? 0;

      return {
        placement,
        activeAds: activeCount,
        totalAds: totalCount,
        available: true, // All placements are available (no capacity limit)
      };
    });

    // Get campaign summary
    const campaignsSummary = await db.adCampaign.groupBy({
      by: ['status'],
      where: airportCode ? { airportCode: airportCode.toUpperCase() } : undefined,
      _count: {
        id: true,
      },
      _sum: {
        totalBudget: true,
        spentBudget: true,
      },
    });

    return {
      placements,
      campaigns: campaignsSummary.map((c) => ({
        status: c.status,
        count: c._count.id,
        totalBudget: c._sum.totalBudget ?? 0,
        spentBudget: c._sum.spentBudget ?? 0,
      })),
    };
  } catch (error) {
    throw safeError(error, 'getAdInventory');
  }
}

// ---------------------------------------------------------------------------
// 24. getAdDashboardStats — Overview stats for admin dashboard
// ---------------------------------------------------------------------------
export async function getAdDashboardStats(airportCode?: string) {
  try {
    const campaignWhere: Prisma.AdCampaignWhereInput = {};
    const adWhere: Prisma.AdvertisementWhereInput = {};

    if (airportCode) {
      campaignWhere.airportCode = airportCode.toUpperCase();
      adWhere.airportCode = airportCode.toUpperCase();
    }

    // Campaign stats
    const totalCampaigns = await db.adCampaign.count({ where: campaignWhere });
    const activeCampaigns = await db.adCampaign.count({
      where: { ...campaignWhere, status: 'active' },
    });

    // Ad stats
    const totalAds = await db.advertisement.count({ where: adWhere });
    const activeAds = await db.advertisement.count({
      where: { ...adWhere, status: 'active' },
    });

    // Aggregate stats
    const adStats = await db.advertisement.aggregate({
      where: adWhere,
      _sum: {
        impressions: true,
        clicks: true,
        conversions: true,
        revenue: true,
      },
    });

    const totalImpressions = adStats._sum.impressions ?? 0;
    const totalClicks = adStats._sum.clicks ?? 0;
    const totalRevenue = adStats._sum.revenue ?? 0;
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    // Top advertisers (merchants with most active ads)
    const topAdvertisers = await db.advertisement.groupBy({
      by: ['merchantId'],
      where: {
        ...adWhere,
        status: 'active',
        merchantId: { not: null },
      },
      _count: {
        id: true,
      },
      _sum: {
        impressions: true,
        clicks: true,
        revenue: true,
      },
      orderBy: {
        _sum: { revenue: 'desc' },
      },
      take: 10,
    });

    // Enrich top advertisers with merchant names
    const enrichedAdvertisers = await Promise.all(
      topAdvertisers.map(async (item) => {
        if (!item.merchantId) return null;
        const merchant = await db.merchant.findUnique({
          where: { id: item.merchantId },
          select: { name: true, category: true, logo: true },
        });
        return {
          merchantId: item.merchantId,
          merchantName: merchant?.name ?? 'Unknown',
          category: merchant?.category ?? null,
          logo: merchant?.logo ?? null,
          activeAds: item._count.id,
          impressions: item._sum.impressions ?? 0,
          clicks: item._sum.clicks ?? 0,
          revenue: item._sum.revenue ?? 0,
        };
      }),
    );

    // Pending ads count
    const pendingAds = await db.advertisement.count({
      where: { ...adWhere, status: 'pending' },
    });

    return {
      totalCampaigns,
      activeCampaigns,
      totalAds,
      activeAds,
      pendingAds,
      totalImpressions,
      totalClicks,
      totalRevenue,
      avgCtr: Math.round(avgCtr * 100) / 100,
      topAdvertisers: enrichedAdvertisers.filter(Boolean),
    };
  } catch (error) {
    throw safeError(error, 'getAdDashboardStats');
  }
}

// ---------------------------------------------------------------------------
// Exports for validation
// ---------------------------------------------------------------------------
export {
  VALID_AD_TYPES,
  VALID_PLACEMENTS,
  VALID_AD_STATUSES,
  VALID_CAMPAIGN_STATUSES,
  VALID_BUDGET_TYPES,
};
