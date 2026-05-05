import { db } from '@/lib/db';
import { extractYouTubeId, getYouTubeThumbnail } from '@/lib/youtube';

// ---- TypeScript Types ----

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  imageUrl?: string;
  sortOrder?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  color?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateTrackInput {
  categoryId: string;
  title?: string;
  artist?: string;
  youtubeUrl: string;
  duration?: string;
  sortOrder?: number;
}

export interface UpdateTrackInput {
  categoryId?: string;
  title?: string;
  artist?: string;
  youtubeUrl?: string;
  duration?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// ---- Public Endpoints ----

export async function getCategories() {
  try {
    const categories = await db.musicCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { MusicTrack: { where: { isActive: true } } } },
      },
    });
    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon,
      color: cat.color,
      imageUrl: cat.imageUrl,
      trackCount: cat._count.MusicTrack,
    }));
  } catch (error) {
    console.error('[music.service] getCategories error:', error);
    throw error;
  }
}

export async function getTracks(categoryId?: string) {
  try {
    const where = categoryId
      ? { categoryId, isActive: true }
      : { isActive: true };

    const tracks = await db.musicTrack.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        title: true,
        artist: true,
        youtubeId: true,
        thumbnailUrl: true,
        duration: true,
        playCount: true,
        MusicCategory: { select: { name: true, slug: true } },
      },
    });
    return tracks;
  } catch (error) {
    console.error('[music.service] getTracks error:', error);
    throw error;
  }
}

export async function trackPlay(trackId: string, userAgent?: string) {
  try {
    const track = await db.musicTrack.update({
      where: { id: trackId },
      data: { playCount: { increment: 1 } },
    });
    return { trackId: track.id, playCount: track.playCount, userAgent };
  } catch (error) {
    console.error('[music.service] trackPlay error:', error);
    throw error;
  }
}

// ---- Admin CRUD: Categories ----

export async function createCategory(data: CreateCategoryInput) {
  try {
    return await db.musicCategory.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        icon: data.icon ?? '🎵',
        color: data.color ?? '#F97316',
        imageUrl: data.imageUrl ?? null,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  } catch (error) {
    console.error('[music.service] createCategory error:', error);
    throw error;
  }
}

export async function updateCategory(id: string, data: UpdateCategoryInput) {
  try {
    return await db.musicCategory.update({
      where: { id },
      data,
    });
  } catch (error) {
    console.error('[music.service] updateCategory error:', error);
    throw error;
  }
}

export async function deleteCategory(id: string) {
  try {
    return await db.musicCategory.delete({
      where: { id },
    });
  } catch (error) {
    console.error('[music.service] deleteCategory error:', error);
    throw error;
  }
}

export async function getAllCategories() {
  try {
    return await db.musicCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { MusicTrack: true } },
      },
    });
  } catch (error) {
    console.error('[music.service] getAllCategories error:', error);
    throw error;
  }
}

// ---- Admin CRUD: Tracks ----

export async function createTrack(data: CreateTrackInput) {
  try {
    const youtubeId = extractYouTubeId(data.youtubeUrl);
    if (!youtubeId) {
      throw new Error('Invalid YouTube URL: could not extract video ID');
    }

    // Check for duplicate
    const existing = await db.musicTrack.findUnique({ where: { youtubeId } });
    if (existing) {
      throw new Error('A track with this YouTube URL already exists');
    }

    // If no custom title, use YouTube ID as fallback
    const title = data.title || `YouTube ${youtubeId}`;

    return await db.musicTrack.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        categoryId: data.categoryId,
        title,
        artist: data.artist || '',
        youtubeUrl: data.youtubeUrl,
        youtubeId,
        thumbnailUrl: getYouTubeThumbnail(youtubeId, 'hqdefault'),
        duration: data.duration || null,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  } catch (error) {
    console.error('[music.service] createTrack error:', error);
    throw error;
  }
}

export async function updateTrack(id: string, data: UpdateTrackInput) {
  try {
    const updateData: Record<string, unknown> = { ...data };

    // If youtubeUrl changed, re-extract ID and thumbnail
    if (data.youtubeUrl) {
      const youtubeId = extractYouTubeId(data.youtubeUrl);
      if (!youtubeId) {
        throw new Error('Invalid YouTube URL: could not extract video ID');
      }
      updateData.youtubeId = youtubeId;
      updateData.thumbnailUrl = getYouTubeThumbnail(youtubeId, 'hqdefault');
    }

    return await db.musicTrack.update({
      where: { id },
      data: updateData,
    });
  } catch (error) {
    console.error('[music.service] updateTrack error:', error);
    throw error;
  }
}

export async function deleteTrack(id: string) {
  try {
    return await db.musicTrack.delete({
      where: { id },
    });
  } catch (error) {
    console.error('[music.service] deleteTrack error:', error);
    throw error;
  }
}

export async function getAllTracks() {
  try {
    return await db.musicTrack.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        MusicCategory: { select: { name: true, slug: true } },
      },
    });
  } catch (error) {
    console.error('[music.service] getAllTracks error:', error);
    throw error;
  }
}

// ---- Admin Stats ----

export async function getMusicStats() {
  try {
    const [
      totalCategories,
      totalTracks,
      activeTracks,
      totalPlays,
      topTracks,
      categoryBreakdown,
    ] = await Promise.all([
      db.musicCategory.count(),
      db.musicTrack.count(),
      db.musicTrack.count({ where: { isActive: true } }),
      db.musicTrack.aggregate({ _sum: { playCount: true } }),
      db.musicTrack.findMany({
        orderBy: { playCount: 'desc' },
        take: 5,
        select: { id: true, title: true, artist: true, playCount: true },
      }),
      db.musicTrack.groupBy({
        by: ['categoryId'],
        _count: { id: true },
        _sum: { playCount: true },
      }),
    ]);

    // Enrich category breakdown with names
    const enrichedBreakdown = await Promise.all(
      categoryBreakdown.map(async (entry) => {
        const cat = await db.musicCategory.findUnique({
          where: { id: entry.categoryId },
          select: { name: true, slug: true },
        });
        return {
          categoryId: entry.categoryId,
          categoryName: cat?.name ?? 'Unknown',
          trackCount: entry._count.id,
          totalPlays: entry._sum.playCount ?? 0,
        };
      })
    );

    return {
      totalCategories,
      totalTracks,
      activeTracks,
      totalPlays: totalPlays._sum.playCount ?? 0,
      topTracks,
      categoryBreakdown: enrichedBreakdown,
    };
  } catch (error) {
    console.error('[music.service] getMusicStats error:', error);
    throw error;
  }
}
