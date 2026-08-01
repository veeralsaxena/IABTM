"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  ASPIRATIONAL_ATTRIBUTES,
  CURRENT_ATTRIBUTES,
  LEARNING_STYLES,
  pickMethod,
} from "@/lib/data/catalog";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  const router = useRouter();
  const [me, setMe] = useState<string[]>(["Procrastinating"]);
  const [iam, setIam] = useState<string[]>(["Action-oriented"]);
  const [styles, setStyles] = useState<string[]>(["Visual", "Short-form"]);
  const [customMe, setCustomMe] = useState("");
  const [customIam, setCustomIam] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewMethod = useMemo(() => pickMethod(me, iam), [me, iam]);

  function toggle(
    list: string[],
    setList: (v: string[]) => void,
    value: string,
    max = 4,
  ) {
    if (list.includes(value)) {
      setList(list.filter((x) => x !== value));
      return;
    }
    if (list.length >= max) return;
    setList([...list, value]);
  }

  async function continuePath() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ me, iam, learningStyles: styles }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      router.push("/home");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="reveal mx-auto max-w-5xl">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">
          Starting your path
        </p>
        <h1 className="font-display mt-2 text-4xl font-bold text-ink md:text-5xl">
          Go from your current self to the self you imagine
        </h1>
        <p className="mt-3 max-w-2xl text-ink-soft">
          Pick characteristics of who you are now and who you&apos;re becoming.
          CURATE will choose a method and assemble media that grows with you —
          not a feed that traps you.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <AttributePanel
            title="Me"
            subtitle="This is your current self"
            accent="me"
            selected={me}
            options={[...CURRENT_ATTRIBUTES]}
            onToggle={(v) => toggle(me, setMe, v)}
            custom={customMe}
            setCustom={setCustomMe}
            onAddCustom={() => {
              if (!customMe.trim()) return;
              toggle(me, setMe, customMe.trim());
              setCustomMe("");
            }}
          />
          <AttributePanel
            title="I Am"
            subtitle="This is your imagined self"
            accent="iam"
            selected={iam}
            options={[...ASPIRATIONAL_ATTRIBUTES]}
            onToggle={(v) => toggle(iam, setIam, v)}
            custom={customIam}
            setCustom={setCustomIam}
            onAddCustom={() => {
              if (!customIam.trim()) return;
              toggle(iam, setIam, customIam.trim());
              setCustomIam("");
            }}
          />
        </div>

        <div className="mt-8 grain-panel rounded-2xl p-5">
          <div className="text-xs uppercase tracking-[0.16em] text-ink-soft">
            Learning styles
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {LEARNING_STYLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggle(styles, setStyles, s, 3)}
                className="chip rounded-full px-3 py-1.5 text-sm"
                data-active={styles.includes(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-accent/30 bg-accent-soft/50 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-accent">
              Suggested method
            </div>
            <div className="font-display mt-1 text-2xl font-semibold text-ink">
              {previewMethod.id}
            </div>
            <p className="mt-1 max-w-xl text-sm text-ink-soft">
              {previewMethod.blurb}
            </p>
          </div>
          <button
            type="button"
            disabled={loading || me.length < 1 || iam.length < 1}
            onClick={continuePath}
            className="btn-primary shrink-0 rounded-full px-6 py-3 text-sm font-semibold"
          >
            {loading ? "Curating your path…" : "Continue"}
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
      </div>
    </AppShell>
  );
}

function AttributePanel(props: {
  title: string;
  subtitle: string;
  accent: "me" | "iam";
  selected: string[];
  options: string[];
  onToggle: (v: string) => void;
  custom: string;
  setCustom: (v: string) => void;
  onAddCustom: () => void;
}) {
  return (
    <div className="grain-panel rounded-[1.5rem] p-5 md:p-6">
      <div
        className={cn(
          "mb-4 flex h-16 w-16 items-center justify-center rounded-2xl",
          props.accent === "me" ? "bg-signal-soft" : "bg-accent-soft",
        )}
      >
        <div
          className={cn(
            "h-10 w-8 rounded-t-full border-2",
            props.accent === "me" ? "border-signal" : "border-accent",
          )}
        />
      </div>
      <h2 className="font-display text-3xl font-semibold text-ink">{props.title}</h2>
      <p className="text-sm text-ink-soft">{props.subtitle}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {props.options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => props.onToggle(opt)}
            className={cn(
              "chip rounded-full px-3 py-1.5 text-sm",
              props.accent === "iam" && "chip-iam",
            )}
            data-active={props.selected.includes(opt)}
          >
            {opt}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <div className="text-[11px] uppercase tracking-[0.14em] text-ink-soft">
          Create custom attribute
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={props.custom}
            onChange={(e) => props.setCustom(e.target.value)}
            placeholder="Type anything that feels right"
            className="flex-1 rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          />
          <button
            type="button"
            onClick={props.onAddCustom}
            className="rounded-xl bg-ink px-4 py-2 text-sm text-paper-elevated"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
