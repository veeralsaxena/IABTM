"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Prompt = { dayLabel: string; prompt: string };

type Props = {
  coverName: string;
  coverArc: string;
  dayMarker: string;
  method: string;
  prompts: Prompt[];
};

/**
 * CSS 3D book preview — production pattern used by journal POD UIs
 * (Lulu / Bookwright / FNP-style personalization previews).
 * Shows cover + interior prompt pages with the user's real data.
 */
export function DiaryPreview({
  coverName,
  coverArc,
  dayMarker,
  method,
  prompts,
}: Props) {
  // 0 = closed cover, 1..n = open to prompt page
  const [page, setPage] = useState(0);
  const total = 1 + prompts.length; // cover + prompts
  const open = page > 0;
  const prompt = prompts[page - 1];

  return (
    <div className="space-y-4">
      <div
        className="relative mx-auto flex h-[380px] w-full max-w-[440px] items-center justify-center"
        style={{ perspective: "1200px" }}
      >
        {/* shadow under book */}
        <div className="absolute bottom-6 h-4 w-[70%] rounded-full bg-black/20 blur-xl" />

        <div
          className="relative h-[320px] w-[240px] transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: open
              ? "rotateY(-18deg) rotateX(4deg)"
              : "rotateY(-12deg) rotateX(6deg)",
          }}
        >
          {/* back cover */}
          <div
            className="absolute inset-0 rounded-r-md rounded-l-sm"
            style={{
              background: "linear-gradient(135deg, #2a241c 0%, #17140f 100%)",
              transform: "translateZ(-8px)",
              boxShadow: "4px 8px 24px rgba(0,0,0,0.35)",
            }}
          />

          {/* page stack edge */}
          <div
            className="absolute top-2 bottom-2 right-0 w-2"
            style={{
              background:
                "repeating-linear-gradient(180deg, #f5f0e6 0px, #f5f0e6 2px, #e8e0d0 2px, #e8e0d0 3px)",
              transform: "translateX(4px)",
            }}
          />

          {/* interior (visible when open) */}
          {open && prompt && (
            <div
              className="absolute inset-0 overflow-hidden rounded-r-md bg-[#f7f1e6] p-5"
              style={{ transform: "translateZ(1px)" }}
            >
              <div className="border-b border-[#d4c4a8] pb-2 text-[10px] uppercase tracking-[0.16em] text-[#8a7a5c]">
                {prompt.dayLabel} · {method}
              </div>
              <p className="mt-6 font-display text-lg leading-snug text-[#2a241c]">
                {prompt.prompt}
              </p>
              {/* ruled lines */}
              <div className="mt-8 space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-px bg-[#d4c4a8]/80" />
                ))}
              </div>
              <div className="absolute bottom-4 right-5 text-[10px] text-[#8a7a5c]">
                Path Diary · write here
              </div>
            </div>
          )}

          {/* front cover (flips when open) */}
          <div
            className={cn(
              "absolute inset-0 origin-left rounded-r-md transition-transform duration-700",
              open && "pointer-events-none",
            )}
            style={{
              transformStyle: "preserve-3d",
              transform: open ? "rotateY(-155deg)" : "rotateY(0deg)",
              background: "linear-gradient(145deg, #1f1a14 0%, #0f0d0a 55%, #2c2418 100%)",
              boxShadow: open
                ? "-8px 4px 20px rgba(0,0,0,0.4)"
                : "2px 6px 20px rgba(0,0,0,0.35)",
            }}
          >
            {/* gold foil frame */}
            <div className="absolute inset-3 rounded border border-[#c2a66a]/40" />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
              <div className="text-[9px] uppercase tracking-[0.22em] text-[#c2a66a]/80">
                Path Diary
              </div>
              <div className="mt-5 font-display text-2xl font-bold leading-tight text-[#f4efe6]">
                {coverName}
              </div>
              <div className="mt-3 text-sm text-[#c2a66a]">{coverArc}</div>
              <div className="mt-6 h-px w-16 bg-[#c2a66a]/50" />
              <div className="mt-4 text-[10px] uppercase tracking-[0.14em] text-[#cfc6b6]/80">
                {dayMarker}
              </div>
              <div className="mt-1 text-[10px] text-[#cfc6b6]/60">{method}</div>
            </div>
            {/* spine hint */}
            <div
              className="absolute inset-y-0 left-0 w-2"
              style={{
                background:
                  "linear-gradient(90deg, rgba(0,0,0,0.45), rgba(194,166,106,0.15))",
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          disabled={page <= 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white disabled:opacity-30"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="min-w-[140px] text-center text-xs text-zinc-500">
          {page === 0
            ? "Cover · closed"
            : `Inside · page ${page} of ${prompts.length}`}
        </div>
        <button
          type="button"
          disabled={page >= total - 1}
          onClick={() => setPage((p) => Math.min(total - 1, p + 1))}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white disabled:opacity-30"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <p className="text-center text-[11px] text-zinc-400">
        Flip through — this is the physical hardcover that ships to your door.
      </p>
    </div>
  );
}
