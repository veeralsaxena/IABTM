"use client";

import { youtubeEmbedUrl } from "@/lib/media/youtube";
import { soundcloudEmbedUrl, spotifyEmbedUrl } from "@/lib/media/audio";

export function MediaPlayer({
  url,
  title,
  className = "",
  compact = false,
}: {
  url?: string | null;
  title: string;
  className?: string;
  /** Shorter player for music embeds in dense lists */
  compact?: boolean;
}) {
  const spotify = spotifyEmbedUrl(url);
  const soundcloud = soundcloudEmbedUrl(url);
  const youtube = youtubeEmbedUrl(url);

  if (spotify) {
    return (
      <div className={`overflow-hidden rounded-2xl bg-zinc-100 ${className}`}>
        <iframe
          src={spotify}
          title={title}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="w-full border-0"
          style={{ height: compact ? 152 : 352 }}
        />
      </div>
    );
  }

  if (soundcloud) {
    return (
      <div className={`overflow-hidden rounded-2xl bg-zinc-100 ${className}`}>
        <iframe
          src={soundcloud}
          title={title}
          allow="autoplay"
          loading="lazy"
          className="w-full border-0"
          style={{ height: compact ? 120 : 166 }}
        />
      </div>
    );
  }

  if (youtube) {
    return (
      <div className={`overflow-hidden rounded-2xl bg-black ${className}`}>
        <div className="relative aspect-video w-full">
          <iframe
            src={youtube}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      </div>
    );
  }

  if (url) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl bg-zinc-900 px-6 py-10 text-center text-white ${className}`}
      >
        <div className="text-xs uppercase tracking-[0.16em] text-zinc-400">
          Open on the web
        </div>
        <div className="max-w-md text-lg font-semibold leading-snug">{title}</div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-900"
        >
          Open source
        </a>
      </div>
    );
  }

  return (
    <div
      className={`flex aspect-video items-center justify-center rounded-2xl bg-zinc-100 text-sm text-zinc-500 ${className}`}
    >
      No playable media for this item
    </div>
  );
}
