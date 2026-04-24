import { db } from '@/lib/db';

// ---------------------------------------------------------------------------
// TypeScript types
// ---------------------------------------------------------------------------

export interface FamilyModeData {
  childCount?: number;
  childAges?: number[];
  infantCount?: number;
}

export interface FamilyPreferences {
  travel_mode: 'family';
  childCount: number;
  childAges: number[];
  infantCount: number;
  enabledAt: string;
}

export interface FamilySuggestion {
  type: 'lounge' | 'merchant';
  id: string;
  name: string;
  description?: string;
  terminal?: string;
  category?: string;
  price?: number;
  currency?: string;
  familyFriendly: boolean;
  kidsMenu?: boolean;
  amenities?: string[];
}

export interface FamilyStats {
  totalActive: number;
  totalUsers: number;
  byAirport: { airportCode: string; count: number }[];
  trendLast30Days: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parsePreferences(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) ?? {};
  } catch {
    return {};
  }
}

function stringifyPreferences(obj: Record<string, unknown>): string {
  return JSON.stringify(obj);
}

// ---------------------------------------------------------------------------
// 1. enableFamilyMode — Set user preference to family mode
// ---------------------------------------------------------------------------
export async function enableFamilyMode(
  phone: string,
  data: FamilyModeData,
): Promise<{ success: boolean; user?: Record<string, unknown>; error?: string }> {
  try {
    // Find user by phone
    const user = await db.user.findUnique({ where: { phone } });
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Merge existing preferences with family mode settings
    const existingPrefs = parsePreferences(user.preferences);
    const familyPrefs: FamilyPreferences = {
      travel_mode: 'family',
      childCount: data.childCount ?? 0,
      childAges: data.childAges ?? [],
      infantCount: data.infantCount ?? 0,
      enabledAt: new Date().toISOString(),
    };

    const updatedPrefs = { ...existingPrefs, family: familyPrefs };

    const updatedUser = await db.user.update({
      where: { phone },
      data: { preferences: stringifyPreferences(updatedPrefs) },
    });

    return {
      success: true,
      user: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        name: updatedUser.name,
        preferences: parsePreferences(updatedUser.preferences),
      },
    };
  } catch (error) {
    console.error('[family-mode.service] enableFamilyMode error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// ---------------------------------------------------------------------------
// 2. disableFamilyMode — Remove family mode from preferences
// ---------------------------------------------------------------------------
export async function disableFamilyMode(
  phone: string,
): Promise<{ success: boolean; user?: Record<string, unknown>; error?: string }> {
  try {
    const user = await db.user.findUnique({ where: { phone } });
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const existingPrefs = parsePreferences(user.preferences);
    const { family, ...restPrefs } = existingPrefs;

    const updatedUser = await db.user.update({
      where: { phone },
      data: { preferences: stringifyPreferences(restPrefs) },
    });

    return {
      success: true,
      user: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        name: updatedUser.name,
        preferences: parsePreferences(updatedUser.preferences),
      },
    };
  } catch (error) {
    console.error('[family-mode.service] disableFamilyMode error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// ---------------------------------------------------------------------------
// 3. getFamilyProfile — Get user family preferences
// ---------------------------------------------------------------------------
export async function getFamilyProfile(
  phone: string,
): Promise<{ success: boolean; profile?: FamilyPreferences | null; error?: string }> {
  try {
    const user = await db.user.findUnique({ where: { phone } });
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const prefs = parsePreferences(user.preferences);
    const familyProfile = (prefs.family as FamilyPreferences) ?? null;

    return { success: true, profile: familyProfile };
  } catch (error) {
    console.error('[family-mode.service] getFamilyProfile error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// ---------------------------------------------------------------------------
// 4. getFamilySuggestions — Get family-appropriate services at an airport
// ---------------------------------------------------------------------------
export async function getFamilySuggestions(
  airportCode: string,
  terminal?: string,
): Promise<{ success: boolean; suggestions?: FamilySuggestion[]; error?: string }> {
  try {
    const suggestions: FamilySuggestion[] = [];
    const code = airportCode.toUpperCase();

    // --- Family-friendly lounges ---
    const loungeWhere: Record<string, unknown> = {
      airportCode: code,
      isOpen: true,
    };
    if (terminal) {
      loungeWhere.terminal = terminal;
    }

    const lounges = await db.lounge.findMany({
      where: loungeWhere,
    });

    for (const lounge of lounges) {
      // A lounge is family-friendly if it has child pricing (priceChild > 0)
      const isFamilyFriendly = lounge.priceChild > 0;
      if (isFamilyFriendly) {
        const amenities: string[] = [];
        try {
          const parsed = JSON.parse(lounge.amenities);
          if (Array.isArray(parsed)) amenities.push(...parsed);
        } catch { /* empty amenities */ }

        suggestions.push({
          type: 'lounge',
          id: lounge.id,
          name: lounge.name,
          description: lounge.description ?? undefined,
          terminal: lounge.terminal || undefined,
          category: 'lounge',
          price: lounge.priceChild || lounge.priceStandard,
          currency: lounge.currency,
          familyFriendly: true,
          kidsMenu: false,
          amenities,
        });
      }
    }

    // --- Family-friendly merchants (restaurants with kids potential, etc.) ---
    const merchantWhere: Record<string, unknown> = {
      airportCode: code,
      isActive: true,
      category: { in: ['restaurant', 'cafe', 'souvenir', 'pharmacy'] },
    };
    if (terminal) {
      merchantWhere.terminal = terminal;
    }

    const merchants = await db.merchant.findMany({
      where: merchantWhere,
    });

    for (const merchant of merchants) {
      // Restaurants and cafes are considered family-friendly by default
      const isFamilyFriendly = ['restaurant', 'cafe'].includes(merchant.category);
      const hasKidsMenu = merchant.category === 'restaurant';

      if (isFamilyFriendly) {
        suggestions.push({
          type: 'merchant',
          id: merchant.id,
          name: merchant.name,
          description: merchant.description ?? undefined,
          terminal: merchant.terminal || undefined,
          category: merchant.category,
          familyFriendly: true,
          kidsMenu: hasKidsMenu,
        });
      }
    }

    return { success: true, suggestions };
  } catch (error) {
    console.error('[family-mode.service] getFamilySuggestions error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// ---------------------------------------------------------------------------
// 5. getFamilyStats — Get family mode activation statistics
// ---------------------------------------------------------------------------
export async function getFamilyStats(): Promise<{
  success: boolean;
  stats?: FamilyStats;
  error?: string;
}> {
  try {
    // Count total users
    const totalUsers = await db.user.count({ where: { isActive: true } });

    // Find all users with family mode enabled (search in JSON preferences string)
    const allUsers = await db.user.findMany({
      where: { isActive: true },
      select: { preferences: true },
    });

    const familyUsers = allUsers.filter((u) => {
      const prefs = parsePreferences(u.preferences);
      return prefs.family && (prefs.family as FamilyPreferences).travel_mode === 'family';
    });

    const totalActive = familyUsers.length;

    // Count by airport — derive from the user's recent conversations
    // Since User doesn't have an airportCode directly, we count family users overall
    // We'll use conversation data to determine which airport each user interacts with
    const familyPhones = familyUsers.map((_, i) => {
      // We need phone numbers, so let's re-fetch
      return null; // placeholder, we'll do a proper query below
    });

    // Proper approach: get family users with phone, then join with conversations
    const familyPhonesList = await db.user.findMany({
      where: { isActive: true },
      select: { phone: true, preferences: true },
    }).then(users => {
      return users.filter(u => {
        const prefs = parsePreferences(u.preferences);
        return prefs.family && (prefs.family as FamilyPreferences).travel_mode === 'family';
      }).map(u => u.phone);
    });

    // For "by airport", we look at flight searches from family users
    const flightSearches = await db.flightSearch.findMany({
      where: { userId: { in: (await db.user.findMany({
        where: { phone: { in: familyPhonesList } },
        select: { id: true },
      })).map(u => u.id) } },
      select: { departureCode: true },
    });

    const airportCounts: Record<string, number> = {};
    for (const search of flightSearches) {
      const code = search.departureCode;
      airportCounts[code] = (airportCounts[code] ?? 0) + 1;
    }

    const byAirport = Object.entries(airportCounts)
      .map(([airportCode, count]) => ({ airportCode, count }))
      .sort((a, b) => b.count - a.count);

    // Trend: how many enabled family mode in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trendLast30Days = familyUsers.filter((u) => {
      const prefs = parsePreferences(u.preferences);
      const family = prefs.family as FamilyPreferences | undefined;
      if (!family?.enabledAt) return false;
      return new Date(family.enabledAt) >= thirtyDaysAgo;
    }).length;

    const stats: FamilyStats = {
      totalActive,
      totalUsers,
      byAirport,
      trendLast30Days,
    };

    return { success: true, stats };
  } catch (error) {
    console.error('[family-mode.service] getFamilyStats error:', error);
    return { success: false, error: 'Internal server error' };
  }
}
