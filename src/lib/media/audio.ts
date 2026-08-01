/** Free in-app music via official embeds — does not change ranking vectors. */

export function spotifyEmbedUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!u.hostname.includes("spotify.com")) return null;
    // https://open.spotify.com/track/ID or /playlist/ID or /album/ID or /episode/ID
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const type = parts[0];
    const id = parts[1]?.split("?")[0];
    if (!id) return null;
    if (!["track", "playlist", "album", "episode", "show", "artist"].includes(type)) {
      return null;
    }
    return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
  } catch {
    return null;
  }
}

export function soundcloudEmbedUrl(url?: string | null): string | null {
  if (!url || !url.includes("soundcloud.com")) return null;
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%2318181b&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`;
}

export function isAudioUrl(url?: string | null): boolean {
  return Boolean(spotifyEmbedUrl(url) || soundcloudEmbedUrl(url));
}
