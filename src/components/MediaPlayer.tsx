"use client";

import { youtubeEmbedUrl } from "@/lib/media/youtube";

export function MediaPlayer({
  url,
  title,
  className = "",
}: {
  url?: string | null;
  title: string;
  className?: string;
}) {
  const embed = youtubeEmbedUrl(url);

  if (!embed) {
    return (
      <div
        className={`flex aspect-video items-center justify-center rounded-2xl bg-zinc-100 text-sm text-zinc-500 ${className}`}
      >
        No playable video for this item
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl bg-black ${className}`}>
      <div className="relative aspect-video w-full">
        <iframe
          src={embed}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    </div>
  );
}
