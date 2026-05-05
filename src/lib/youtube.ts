/**
 * YouTube URL utilities — NO YouTube Data API V3 calls (quota-free).
 * Extracts video IDs and generates thumbnail URLs from standard YouTube URLs.
 */

/**
 * Extract YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 * - https://music.youtube.com/watch?v=VIDEO_ID
 * - Just the video ID itself
 */
export function extractYouTubeId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();

  // Direct video ID (11 chars, alphanumeric + dash + underscore)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);

    // youtube.com/watch?v=VIDEO_ID
    if (parsed.hostname.includes('youtube.com') && parsed.searchParams.has('v')) {
      return parsed.searchParams.get('v');
    }

    // youtu.be/VIDEO_ID
    if (parsed.hostname === 'youtu.be' || parsed.hostname === 'www.youtu.be') {
      return parsed.pathname.slice(1).split('/')[0] || null;
    }

    // youtube.com/embed/VIDEO_ID
    if (parsed.pathname.startsWith('/embed/')) {
      return parsed.pathname.split('/')[2] || null;
    }

    // youtube.com/shorts/VIDEO_ID
    if (parsed.pathname.startsWith('/shorts/')) {
      return parsed.pathname.split('/')[2] || null;
    }

    // youtube.com/v/VIDEO_ID
    if (parsed.pathname.startsWith('/v/')) {
      return parsed.pathname.split('/')[2] || null;
    }
  } catch {
    // Try regex fallback for malformed URLs
    const match = trimmed.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return match?.[1] || null;
  }

  return null;
}

/**
 * Generate YouTube thumbnail URL for a video ID.
 * Quality fallback: maxresdefault -> hqdefault -> mqdefault -> default
 */
export function getYouTubeThumbnail(
  videoId: string,
  quality: 'maxresdefault' | 'hqdefault' | 'mqdefault' | 'default' = 'hqdefault'
): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Generate YouTube embed URL (for iframe src).
 */
export function getYouTubeEmbedUrl(videoId: string, autoplay: boolean = false): string {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    autoplay: autoplay ? '1' : '0',
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Generate a direct YouTube watch URL.
 */
export function getYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
