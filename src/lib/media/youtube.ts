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
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
}

export function youtubeThumb(url?: string | null): string | null {
  const id = youtubeIdFromUrl(url);
  if (!id) return null;
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export type InAppPlayback = {
  mode: "in-app";
  provider: "youtube" | "web" | "file";
  videoId: string | null;
  /** Player the app renders in its own screen. */
  embedUrl: string | null;
  /** Direct file when the team hosts a video they have rights to. */
  fileUrl: string | null;
  poster: string | null;
  href: string | null;
};

/** Playback contract for the product UI. The app owns the screen. */
export function inAppPlayback(
  url?: string | null,
  fileUrl?: string | null,
): InAppPlayback {
  if (fileUrl) {
    return {
      mode: "in-app",
      provider: "file",
      videoId: null,
      embedUrl: null,
      fileUrl,
      poster: youtubeThumb(url),
      href: fileUrl,
    };
  }
  const id = youtubeIdFromUrl(url);
  if (id) {
    return {
      mode: "in-app",
      provider: "youtube",
      videoId: id,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&iv_load_policy=3&playsinline=1`,
      fileUrl: null,
      poster: youtubeThumb(url),
      href: null,
    };
  }
  return {
    mode: "in-app",
    provider: "web",
    videoId: null,
    embedUrl: null,
    fileUrl: null,
    poster: null,
    href: url ?? null,
  };
}
