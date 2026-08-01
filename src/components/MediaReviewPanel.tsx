"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  mediaRef: string;
  mediaTitle: string;
  mediaType?: string;
  mediaUrl?: string | null;
  pathId?: string | null;
  compact?: boolean;
};

function sentimentFromRating(n: number): "liked" | "disliked" | "mixed" {
  if (n <= 2) return "disliked";
  if (n >= 4) return "liked";
  return "mixed";
}

export function MediaReviewPanel({
  mediaRef,
  mediaTitle,
  mediaType,
  mediaUrl,
  pathId,
  compact,
}: Props) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [sentiment, setSentiment] = useState<"liked" | "disliked" | "mixed">(
    "liked",
  );
  const [review, setReview] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOpen(false);
    setSaved(false);
    setError(null);
    setRating(0);
    setReview("");
    setSentiment("liked");
    (async () => {
      const res = await fetch(
        `/api/reviews?mediaRef=${encodeURIComponent(mediaRef)}`,
      );
      if (!res.ok) return;
      const json = await res.json();
      const existing = json.review;
      if (existing) {
        setRating(existing.rating);
        setSentiment(existing.sentiment);
        setReview(existing.review);
        setSaved(true);
      }
    })();
  }, [mediaRef]);

  async function submit(nextRating?: number, nextSentiment?: typeof sentiment) {
    const r = nextRating ?? rating;
    const s = nextSentiment ?? sentiment;
    if (r < 1) {
      setError("Tap a star rating first");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mediaRef,
        mediaTitle,
        mediaType,
        mediaUrl,
        pathId,
        rating: r,
        sentiment: s,
        review,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Could not save");
      return;
    }
    setRating(r);
    setSentiment(s);
    setSaved(true);
    setOpen(false);
  }

  function onStar(n: number) {
    const s = sentimentFromRating(n);
    setRating(n);
    setSentiment(s);
    setOpen(true);
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200 bg-zinc-50",
        compact ? "p-3" : "p-4",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">
            Your review
          </div>
          <p className="mt-0.5 text-sm text-zinc-600">
            {saved
              ? `${rating}/5 · ${sentiment} — feeds next identity query`
              : "Tap stars to rate — written note optional."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-zinc-500"
        >
          {open ? "Close" : saved ? "Edit rating" : "Rate"}
        </button>
      </div>

      {/* Always-visible stars for one-tap rating */}
      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={busy}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onStar(n)}
            className="p-0.5"
            aria-label={`${n} stars`}
          >
            <Star
              className={cn(
                "h-5 w-5 transition",
                (hover || rating) >= n
                  ? "fill-amber-400 text-amber-400"
                  : "text-zinc-300",
              )}
            />
          </button>
        ))}
        {rating >= 1 && !saved && (
          <button
            type="button"
            disabled={busy}
            onClick={() => submit()}
            className="ml-2 rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
          >
            {busy ? "Saving…" : "Submit"}
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-zinc-200 pt-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["liked", "Liked it"],
                ["mixed", "Mixed"],
                ["disliked", "Didn’t land"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSentiment(id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium",
                  sentiment === id
                    ? "bg-zinc-900 text-white"
                    : "bg-white text-zinc-600 ring-1 ring-zinc-200",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={2}
            placeholder="Optional: why it helped — or didn’t"
            className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-zinc-900 focus:ring-2"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            disabled={busy || rating < 1}
            onClick={() => submit()}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save rating"}
          </button>
        </div>
      )}
    </div>
  );
}
