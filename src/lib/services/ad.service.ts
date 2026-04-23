import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

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
  impressionId: string;
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

// ---------------------------------------------------------------------------
// 1. getCampaigns — List campaigns with filters, include ad count
// ---------------------------------------------------------------------------
export async function getCampaigns(airportCode?: string, status?: string) {
  try {
    const where: Prisma.AdCampaignWhereInput = {};

    if (airportCode) {
      where.airportCode = airportCode.toUpperCase();
    }

    if (status) {
      where.status = status;
    }

    const campaigns = await db.adCampaign.findMany({
      where,
      include: {
        _count: {
          select: { advertisements: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return campaigns;
  } catch (error) {
    console.error('[ad.service] getCampaigns error:', error);
    throw error;
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
        advertisements: {
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
    console.error('[ad.service] getCampaignById error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 3. createCampaign — Create campaign
// ---------------------------------------------------------------------------
export async function createCampaign(data: CreateCampaignInput) {
  try {
    const campaign = await db.adCampaign.create({
      data: {
        airportCode: data.airportCode.toUpperCase(),
        name: data.name,
        description: data.description ?? null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        totalBudget: data.totalBudget,
        status: 'draft',
      },
    });

    return campaign;
  } catch (error) {
    console.error('[ad.service] createCampaign error:', error);
    throw error;
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
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
    if (data.totalBudget !== undefined) updateData.totalBudget = data.totalBudget;
    if (data.status !== undefined) updateData.status = data.status;

    const campaign = await db.adCampaign.update({
      where: { id },
      data: updateData,
    });

    return campaign;
  } catch (error) {
    console.error('[ad.service] updateCampaign error:', error);
    throw error;
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
    console.error('[ad.service] deleteCampaign error:', error);
    throw error;
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
        advertisements: {
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

    const ads = campaign.advertisements;
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
    console.error('[ad.service] getCampaignStats error:', error);
    throw error;
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
    console.error('[ad.service] activateCampaign error:', error);
    throw error;
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
    const where: Prisma.AdvertisementWhereInput = {};

    if (airportCode) {
      where.airportCode = airportCode.toUpperCase();
    }
    if (placement) {
      where.placement = placement;
    }
    if (type) {
      where.type = type;
    }
    if (status) {
      where.status = status;
    }
    if (merchantId) {
      where.merchantId = merchantId;
    }

    const ads = await db.advertisement.findMany({
      where,
      include: {
        campaign: {
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
    console.error('[ad.service] getAds error:', error);
    throw error;
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
        campaign: {
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
    console.error('[ad.service] getAdById error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 10. createAd — Create advertisement (status=draft)
// ---------------------------------------------------------------------------
export async function createAd(data: CreateAdInput) {
  try {
    const ad = await db.advertisement.create({
      data: {
        airportCode: data.airportCode.toUpperCase(),
        campaignId: data.campaignId ?? null,
        merchantId: data.merchantId ?? null,
        title: data.title,
        description: data.description ?? null,
        type: data.type,
        placement: data.placement,
        imageUrl: data.imageUrl,
        videoUrl: data.videoUrl ?? null,
        targetUrl: data.targetUrl ?? null,
        ctaText: data.ctaText ?? 'En savoir plus',
        targetAudience: data.targetAudience ?? null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        budget: data.budget,
        budgetType: data.budgetType ?? 'total',
        cpmRate: data.cpmRate ?? null,
        cpcRate: data.cpcRate ?? null,
        status: 'draft',
      },
    });

    return ad;
  } catch (error) {
    console.error('[ad.service] createAd error:', error);
    throw error;
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
    if (data.type !== undefined) updateData.type = data.type;
    if (data.placement !== undefined) updateData.placement = data.placement;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.videoUrl !== undefined) updateData.videoUrl = data.videoUrl;
    if (data.targetUrl !== undefined) updateData.targetUrl = data.targetUrl;
    if (data.ctaText !== undefined) updateData.ctaText = data.ctaText;
    if (data.targetAudience !== undefined) updateData.targetAudience = data.targetAudience;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.budgetType !== undefined) updateData.budgetType = data.budgetType;
    if (data.cpmRate !== undefined) updateData.cpmRate = data.cpmRate;
    if (data.cpcRate !== undefined) updateData.cpcRate = data.cpcRate;
    if (data.merchantId !== undefined) updateData.merchant = data.merchantId ? { connect: { id: data.merchantId } } : { disconnect: true };
    if (data.campaignId !== undefined) updateData.campaign = data.campaignId ? { connect: { id: data.campaignId } } : { disconnect: true };

    const ad = await db.advertisement.update({
      where: { id },
      data: updateData,
    });

    return ad;
  } catch (error) {
    console.error('[ad.service] updateAd error:', error);
    throw error;
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
    console.error('[ad.service] deleteAd error:', error);
    throw error;
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
    console.error('[ad.service] submitForReview error:', error);
    throw error;
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
    console.error('[ad.service] pauseAd error:', error);
    throw error;
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
    console.error('[ad.service] resumeAd error:', error);
    throw error;
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
    console.error('[ad.service] approveAd error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 17. rejectAd — Admin rejects: status → rejected, save reason
// ---------------------------------------------------------------------------
export async function rejectAd(id: string, reason: string) {
  try {
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
    console.error('[ad.service] rejectAd error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 18. trackImpression — Create AdImpression + increment ad.impressions
// ---------------------------------------------------------------------------
export async function trackImpression(data: TrackImpressionInput) {
  try {
    const result = await db.$transaction(async (tx) => {
      // Verify ad exists and is active
      const ad = await tx.advertisement.findUnique({
        where: { id: data.advertisementId },
      });

      if (!ad) {
        throw new Error('Advertisement not found');
      }

      // Create impression record
      const impression = await tx.adImpression.create({
        data: {
          advertisementId: data.advertisementId,
          sessionId: data.sessionId ?? null,
          placement: data.placement,
          deviceInfo: data.deviceInfo ?? null,
          location: data.location ?? null,
        },
      });

      // Increment ad impressions counter
      await tx.advertisement.update({
        where: { id: data.advertisementId },
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
          where: { id: data.advertisementId },
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
    console.error('[ad.service] trackImpression error:', error);
    throw error;
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
        include: { advertisement: true },
      });

      if (!impression) {
        throw new Error('Impression not found');
      }

      // Create click record
      const click = await tx.adClick.create({
        data: {
          impressionId,
          conversionValue: data?.conversionValue ?? 0,
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
      const ad = impression.advertisement;
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
    console.error('[ad.service] trackClick error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 20. trackConversion — Update AdClick + increment ad.conversions + ad.revenue
// ---------------------------------------------------------------------------
export async function trackConversion(impressionId: string, conversionValue: number) {
  try {
    const result = await db.$transaction(async (tx) => {
      // Verify impression exists
      const impression = await tx.adImpression.findUnique({
        where: { id: impressionId },
        include: { advertisement: true },
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
          conversionValue,
        },
      });

      // Increment ad conversions and revenue
      await tx.advertisement.update({
        where: { id: impression.advertisementId },
        data: {
          conversions: { increment: 1 },
          revenue: { increment: conversionValue },
        },
      });

      // Update campaign spent budget if ad has a campaign
      const ad = impression.advertisement;
      if (ad.campaignId) {
        await tx.adCampaign.update({
          where: { id: ad.campaignId },
          data: {
            spentBudget: { increment: conversionValue },
          },
        });
      }

      return { clickId: click.id, conversionValue };
    });

    return result;
  } catch (error) {
    console.error('[ad.service] trackConversion error:', error);
    throw error;
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
    console.error('[ad.service] getActiveAds error:', error);
    throw error;
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
    const where: Prisma.AdvertisementWhereInput = {};

    if (airportCode) {
      where.airportCode = airportCode.toUpperCase();
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
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
    console.error('[ad.service] getAdRevenue error:', error);
    throw error;
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
    console.error('[ad.service] getAdInventory error:', error);
    throw error;
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
    console.error('[ad.service] getAdDashboardStats error:', error);
    throw error;
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
