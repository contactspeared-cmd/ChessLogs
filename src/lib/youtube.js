/**
 * Extract a YouTube video ID from common URL formats.
 * Supports watch, youtu.be, embed, shorts, and mobile URLs.
 */
export function getYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;

  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id || null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v');
      }

      const embedMatch = parsed.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
      if (embedMatch) return embedMatch[1];
    }
  } catch {
    return null;
  }

  return null;
}

export function isYouTubeUrl(url) {
  return Boolean(getYouTubeVideoId(url));
}

/** Convert a YouTube watch/share URL into an embeddable iframe src. */
export function getYouTubeEmbedUrl(url) {
  const id = getYouTubeVideoId(url);
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}`;
}
