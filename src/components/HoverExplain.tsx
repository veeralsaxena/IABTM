"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Hover / focus explanation chip — for judge demos without leaving the page.
 */
export function HoverExplain({
  label,
  explain,
  children,
  className,
  side = "top",
}: {
  label?: string;
  explain: string;
  children: ReactNode;
  className?: string;
  side?: "top" | "bottom";
}) {
  return (
    <span className={cn("group relative inline-flex max-w-full", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 w-64 max-w-[min(16rem,70vw)] rounded-xl bg-zinc-900 px-3 py-2.5 text-left text-[11px] leading-relaxed font-normal normal-case tracking-normal text-zinc-100 opacity-0 shadow-xl transition duration-150 group-hover:opacity-100 group-focus-within:opacity-100",
          side === "top"
            ? "bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2"
            : "top-[calc(100%+8px)] left-1/2 -translate-x-1/2",
        )}
      >
        {label ? (
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
            {label}
          </span>
        ) : null}
        {explain}
      </span>
    </span>
  );
}
