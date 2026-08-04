"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Photo-based POD preview (Printful pattern):
 * real blank garment photo + print-area text overlay + light 3D tilt.
 */

export type GarmentColor = "ink" | "bone" | "forest" | "white" | "navy";
export type GarmentKind = "tee" | "hoodie";

type Props = {
  kind: GarmentKind;
  color: GarmentColor;
  side: "front" | "back";
  frontLine: string;
  backLine: string;
  edition: string;
  sleeveHint?: string;
  className?: string;
};

const LIGHT: GarmentColor[] = ["bone", "white"];

function assetFor(kind: GarmentKind, color: GarmentColor, side: "front" | "back") {
  const tone = LIGHT.includes(color) ? "light" : "dark";
  // Dark hoodie back photo not generated — use light hoodie back + dark wash
  if (kind === "hoodie" && side === "back" && tone === "dark") {
    return "/shop/hoodie-back-light.png";
  }
  return `/shop/${kind}-${side}-${tone}.png`;
}

function printColors(color: GarmentColor) {
  const light = LIGHT.includes(color);
  return {
    primary: light ? "#1c1917" : "#f5f5f4",
    muted: light ? "#57534e" : "#a1a1aa",
  };
}

/** Soft color wash for forest / navy / white / dark-hoodie-back */
function washStyle(
  color: GarmentColor,
  kind: GarmentKind,
  side: "front" | "back",
): CSSProperties | undefined {
  if (kind === "hoodie" && side === "back" && !LIGHT.includes(color)) {
    if (color === "forest") {
      return { background: "rgba(20, 45, 35, 0.72)", mixBlendMode: "multiply" };
    }
    if (color === "navy") {
      return { background: "rgba(20, 30, 50, 0.75)", mixBlendMode: "multiply" };
    }
    return { background: "rgba(10, 10, 10, 0.78)", mixBlendMode: "multiply" };
  }
  if (color === "forest") {
    return { background: "rgba(30, 58, 47, 0.45)", mixBlendMode: "multiply" };
  }
  if (color === "navy") {
    return { background: "rgba(30, 41, 59, 0.5)", mixBlendMode: "multiply" };
  }
  if (color === "white") {
    return { background: "rgba(255,255,255,0.35)", mixBlendMode: "soft-light" };
  }
  return undefined;
}

export function GarmentMockup({
  kind,
  color,
  side,
  frontLine,
  backLine,
  edition,
  sleeveHint,
  className,
}: Props) {
  const src = assetFor(kind, color, side);
  const ink = printColors(color);
  const wash = washStyle(color, kind, side);
  const isHoodie = kind === "hoodie";

  return (
    <div
      className={cn("relative mx-auto w-full max-w-[420px]", className)}
      style={{ perspective: "900px" }}
    >
      <div
        className="relative aspect-square overflow-hidden rounded-2xl bg-[#ece8e2] shadow-[0_24px_48px_-20px_rgba(0,0,0,0.35)] transition-transform duration-500"
        style={{
          transform:
            side === "front"
              ? "rotateY(-8deg) rotateX(4deg)"
              : "rotateY(8deg) rotateX(4deg)",
          transformStyle: "preserve-3d",
        }}
      >
        <Image
          src={src}
          alt={`${kind} ${side} ${color} mockup`}
          fill
          className="object-contain p-2"
          sizes="420px"
          priority
        />

        {wash && (
          <div className="pointer-events-none absolute inset-0" style={wash} />
        )}

        {/* Print zone — chest / upper back */}
        <div
          className="pointer-events-none absolute left-1/2 z-10 w-[52%] -translate-x-1/2 text-center"
          style={{
            top: isHoodie ? (side === "front" ? "38%" : "36%") : side === "front" ? "36%" : "34%",
          }}
        >
          {side === "front" ? (
            <>
              <div
                className="font-display text-[clamp(0.95rem,3.6vw,1.55rem)] font-bold leading-tight tracking-tight"
                style={{
                  color: ink.primary,
                  textShadow: LIGHT.includes(color)
                    ? "0 1px 0 rgba(255,255,255,0.35)"
                    : "0 1px 2px rgba(0,0,0,0.45)",
                }}
              >
                {truncate(frontLine, 22)}
              </div>
              <div
                className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: ink.muted }}
              >
                {edition}
              </div>
            </>
          ) : (
            <>
              <div
                className="font-display text-[clamp(0.7rem,2.4vw,1rem)] font-semibold leading-snug"
                style={{
                  color: ink.primary,
                  textShadow: LIGHT.includes(color)
                    ? "0 1px 0 rgba(255,255,255,0.35)"
                    : "0 1px 2px rgba(0,0,0,0.45)",
                }}
              >
                {truncate(backLine, 36)}
              </div>
              {sleeveHint ? (
                <div
                  className="mt-2 text-[10px] tracking-wide"
                  style={{ color: ink.muted }}
                >
                  {truncate(sleeveHint, 28)}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <p className="mt-3 text-center text-[11px] text-zinc-500">
        Photo mockup · {kind} · {color} · {side}
      </p>
    </div>
  );
}

function truncate(s: string, n: number) {
  const t = s.trim();
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

export const GARMENT_COLOR_OPTIONS: Array<{
  id: GarmentColor;
  label: string;
  swatch: string;
}> = [
  { id: "ink", label: "Ink", swatch: "#1a1a1a" },
  { id: "bone", label: "Bone", swatch: "#e8dfd0" },
  { id: "forest", label: "Forest", swatch: "#1e3a2f" },
  { id: "white", label: "White", swatch: "#f8f7f4" },
  { id: "navy", label: "Navy", swatch: "#1e293b" },
];
