export function youtubeIdFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.replace("/", "") || null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/");
      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];
      const shortsIdx = parts.indexOf("shorts");
      if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1];
    }
  } catch {
    return null;
  }
  return null;
}

export function youtubeEmbedUrl(url?: string | null): string | null {
  const id = youtubeIdFromUrl(url);
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
}

export function youtubeThumb(url?: string | null): string | null {
  const id = youtubeIdFromUrl(url);
  if (!id) return null;
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
