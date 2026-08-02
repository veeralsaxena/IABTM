"use client";

/**
 * Production-feasible POD preview (Printful / Gelato pattern):
 * blank garment silhouette + print-area text overlay.
 * Real factories take the same brief: color + front/back print strings.
 * Full WebGL tees are optional later — this is what ships in merch checkouts.
 */

export type GarmentColor = "ink" | "bone" | "forest" | "white" | "navy";
export type GarmentKind = "tee" | "hoodie";

const COLORS: Record<
  GarmentColor,
  { fabric: string; shadow: string; stitch: string; print: string; muted: string }
> = {
  ink: {
    fabric: "#1a1a1a",
    shadow: "#0d0d0d",
    stitch: "#2a2a2a",
    print: "#f5f5f4",
    muted: "#a1a1aa",
  },
  bone: {
    fabric: "#e8dfd0",
    shadow: "#d4c8b4",
    stitch: "#cfc3ad",
    print: "#1c1917",
    muted: "#78716c",
  },
  forest: {
    fabric: "#1e3a2f",
    shadow: "#13261f",
    stitch: "#2a4a3c",
    print: "#ecfdf5",
    muted: "#6ee7b7",
  },
  white: {
    fabric: "#f8f7f4",
    shadow: "#e5e2db",
    stitch: "#ddd9d0",
    print: "#18181b",
    muted: "#71717a",
  },
  navy: {
    fabric: "#1e293b",
    shadow: "#0f172a",
    stitch: "#334155",
    print: "#f8fafc",
    muted: "#94a3b8",
  },
};

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
  const c = COLORS[color];
  const isHoodie = kind === "hoodie";

  return (
    <div className={className}>
      <svg
        viewBox="0 0 320 400"
        className="h-auto w-full"
        role="img"
        aria-label={`${kind} ${side} mockup`}
      >
        <defs>
          <linearGradient id={`g-${color}-${side}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c.fabric} />
            <stop offset="55%" stopColor={c.fabric} />
            <stop offset="100%" stopColor={c.shadow} />
          </linearGradient>
          <filter id="soft" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="8" stdDeviation="10" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* body */}
        <g filter="url(#soft)">
          {/* left sleeve */}
          <path
            d={
              isHoodie
                ? "M78 118 C40 140 18 190 28 250 L72 262 C78 220 88 180 98 150 Z"
                : "M82 112 C48 128 28 170 36 220 L74 230 C80 190 88 155 98 138 Z"
            }
            fill={`url(#g-${color}-${side})`}
          />
          {/* right sleeve */}
          <path
            d={
              isHoodie
                ? "M242 118 C280 140 302 190 292 250 L248 262 C242 220 232 180 222 150 Z"
                : "M238 112 C272 128 292 170 284 220 L246 230 C240 190 232 155 222 138 Z"
            }
            fill={`url(#g-${color}-${side})`}
          />
          {/* torso */}
          <path
            d={
              isHoodie
                ? "M98 108 C110 88 130 72 160 70 C190 72 210 88 222 108 L236 150 C242 200 246 280 248 350 L72 350 C74 280 78 200 84 150 Z"
                : "M98 118 C112 92 132 78 160 76 C188 78 208 92 222 118 L234 148 C240 200 244 270 246 350 L74 350 C76 270 80 200 86 148 Z"
            }
            fill={`url(#g-${color}-${side})`}
          />
          {/* collar / hood */}
          {isHoodie ? (
            <>
              <path
                d="M118 78 C130 58 148 48 160 48 C172 48 190 58 202 78 C188 70 172 66 160 66 C148 66 132 70 118 78 Z"
                fill={c.shadow}
              />
              <path
                d="M124 95 C136 82 148 76 160 76 C172 76 184 82 196 95 L188 118 C178 108 168 104 160 104 C152 104 142 108 132 118 Z"
                fill={c.fabric}
                stroke={c.stitch}
                strokeWidth="1"
              />
              {/* pocket */}
              <path
                d="M118 250 L202 250 L196 300 L124 300 Z"
                fill="none"
                stroke={c.stitch}
                strokeWidth="1.5"
                opacity="0.7"
              />
            </>
          ) : (
            <path
              d="M128 92 C140 78 150 72 160 72 C170 72 180 78 192 92 L184 118 C176 108 168 104 160 104 C152 104 144 108 136 118 Z"
              fill={c.shadow}
            />
          )}
        </g>

        {/* print area */}
        {side === "front" ? (
          <g>
            <text
              x="160"
              y={isHoodie ? 175 : 185}
              textAnchor="middle"
              fill={c.print}
              style={{
                fontFamily: "var(--font-display), Georgia, serif",
                fontWeight: 700,
                fontSize: frontLine.length > 14 ? 18 : 22,
                letterSpacing: "-0.02em",
              }}
            >
              {truncate(frontLine, 22)}
            </text>
            <text
              x="160"
              y={isHoodie ? 198 : 208}
              textAnchor="middle"
              fill={c.muted}
              style={{
                fontFamily: "ui-sans-serif, system-ui",
                fontSize: 9,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              {edition}
            </text>
          </g>
        ) : (
          <g>
            <text
              x="160"
              y={isHoodie ? 190 : 200}
              textAnchor="middle"
              fill={c.print}
              style={{
                fontFamily: "var(--font-display), Georgia, serif",
                fontWeight: 600,
                fontSize: backLine.length > 28 ? 11 : 13,
              }}
            >
              {truncate(backLine, 34)}
            </text>
            {sleeveHint ? (
              <text
                x="160"
                y={isHoodie ? 214 : 224}
                textAnchor="middle"
                fill={c.muted}
                style={{
                  fontFamily: "ui-sans-serif, system-ui",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                }}
              >
                {truncate(sleeveHint, 28)}
              </text>
            ) : null}
          </g>
        )}

        {/* hem line */}
        <path
          d="M74 348 Q160 358 246 348"
          fill="none"
          stroke={c.stitch}
          strokeWidth="1"
          opacity="0.5"
        />
      </svg>
    </div>
  );
}

function truncate(s: string, n: number) {
  const t = s.trim();
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

export const GARMENT_COLOR_OPTIONS: Array<{ id: GarmentColor; label: string; swatch: string }> = [
  { id: "ink", label: "Ink", swatch: "#1a1a1a" },
  { id: "bone", label: "Bone", swatch: "#e8dfd0" },
  { id: "forest", label: "Forest", swatch: "#1e3a2f" },
  { id: "white", label: "White", swatch: "#f8f7f4" },
  { id: "navy", label: "Navy", swatch: "#1e293b" },
];
