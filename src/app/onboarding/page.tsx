"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ASPIRATIONAL_ATTRIBUTES,
  CURRENT_ATTRIBUTES,
  LEARNING_STYLES,
  pickMethod,
} from "@/lib/data/catalog";
import { cn } from "@/lib/utils";
import { Camera, ChevronLeft, ChevronRight } from "lucide-react";

const QUESTIONS = [
  {
    id: "vibe",
    prompt: "What's your current vibe?",
    options: ["Scattered", "Tired but willing", "Motivated", "Stuck", "Curious"],
  },
  {
    id: "motivation",
    prompt: "What media actually moves you?",
    options: ["Short videos", "Long talks", "Stories", "Frameworks", "Music", "Mentors"],
  },
  {
    id: "daily_minutes",
    prompt: "How many minutes can you give this daily?",
    options: ["5", "10", "20", "30", "45+"],
  },
] as const;

type Step = "profile" | "attributes" | "questions" | "method";

export default function OnboardingPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("profile");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [me, setMe] = useState<string[]>(["Procrastinating"]);
  const [iam, setIam] = useState<string[]>(["Action-oriented"]);
  const [styles, setStyles] = useState<string[]>(["Visual"]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [meQuery, setMeQuery] = useState("");
  const [iamQuery, setIamQuery] = useState("");
  const [customMe, setCustomMe] = useState("");
  const [customIam, setCustomIam] = useState("");
  const [showAllMe, setShowAllMe] = useState(false);
  const [showAllIam, setShowAllIam] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const method = useMemo(() => pickMethod(me, iam), [me, iam]);

  const filteredMe = CURRENT_ATTRIBUTES.filter((a) =>
    a.toLowerCase().includes(meQuery.toLowerCase()),
  );
  const filteredIam = ASPIRATIONAL_ATTRIBUTES.filter((a) =>
    a.toLowerCase().includes(iamQuery.toLowerCase()),
  );

  function toggle(list: string[], setList: (v: string[]) => void, value: string, max = 5) {
    if (list.includes(value)) setList(list.filter((x) => x !== value));
    else if (list.length < max) setList([...list, value]);
  }

  async function uploadAvatarIfNeeded(userId: string) {
    if (!avatarFile) return avatarUrl;
    const supabase = createClient();
    const ext = avatarFile.name.split(".").pop() || "jpg";
    const path = `${userId}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`;
  }

  async function finish(skipQuestions = false) {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in again");

      const uploaded = await uploadAvatarIfNeeded(user.id);
      const payloadAnswers = skipQuestions ? {} : answers;

      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          me,
          iam,
          learningStyles: styles,
          displayName: displayName || undefined,
          avatarUrl: uploaded || undefined,
          vibe: payloadAnswers.vibe,
          motivation: payloadAnswers.motivation,
          dailyMinutes: payloadAnswers.daily_minutes
            ? Number(String(payloadAnswers.daily_minutes).replace("+", ""))
            : undefined,
          answers: payloadAnswers,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create your path");
      router.push("/home");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div>
          <div className="font-display text-2xl font-bold">CURATE</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">
            Build your path
          </div>
        </div>
        <div className="text-sm text-zinc-500">
          {step === "profile" && "1 / 4"}
          {step === "attributes" && "2 / 4"}
          {step === "questions" && "3 / 4"}
          {step === "method" && "4 / 4"}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24">
        {step === "profile" && (
          <section className="mx-auto max-w-xl">
            <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
              Start with you
            </h1>
            <p className="mt-3 text-zinc-500">
              Add a name and photo so your path feels like yours. You can change
              these later.
            </p>

            <div className="mt-10 flex flex-col items-center">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative h-28 w-28 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200"
              >
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="" fill className="object-cover" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-zinc-400">
                    <Camera className="h-6 w-6" />
                    <span className="mt-1 text-[11px]">Add photo</span>
                  </div>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setAvatarFile(file);
                  setAvatarUrl(URL.createObjectURL(file));
                }}
              />
            </div>

            <label className="mt-8 block text-sm">
              <span className="mb-2 block text-zinc-500">Display name</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none ring-zinc-900 focus:ring-2"
              />
            </label>

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={() => setStep("attributes")}
                className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
              >
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {step === "attributes" && (
          <section>
            <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
              Go from your current self to the self you imagine
            </h1>
            <p className="mt-3 max-w-2xl text-zinc-500">
              Pick characteristics of who you are now and who you&apos;re becoming.
              We&apos;ll suggest a method and curate media for that gap.
            </p>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <AttributeColumn
                title="Me"
                subtitle="This is your current self"
                tone="me"
                query={meQuery}
                setQuery={setMeQuery}
                searchPlaceholder="Search me..."
                options={showAllMe ? filteredMe : filteredMe.slice(0, 16)}
                selected={me}
                onToggle={(v) => toggle(me, setMe, v)}
                showAll={showAllMe}
                remaining={Math.max(0, filteredMe.length - 16)}
                onShowAll={() => setShowAllMe(true)}
                custom={customMe}
                setCustom={setCustomMe}
                onAddCustom={() => {
                  if (!customMe.trim()) return;
                  toggle(me, setMe, customMe.trim());
                  setCustomMe("");
                }}
              />
              <AttributeColumn
                title="I Am"
                subtitle="This is your imagined self"
                tone="iam"
                query={iamQuery}
                setQuery={setIamQuery}
                searchPlaceholder="Search attributes..."
                options={showAllIam ? filteredIam : filteredIam.slice(0, 16)}
                selected={iam}
                onToggle={(v) => toggle(iam, setIam, v)}
                showAll={showAllIam}
                remaining={Math.max(0, filteredIam.length - 16)}
                onShowAll={() => setShowAllIam(true)}
                custom={customIam}
                setCustom={setCustomIam}
                onAddCustom={() => {
                  if (!customIam.trim()) return;
                  toggle(iam, setIam, customIam.trim());
                  setCustomIam("");
                }}
              />
            </div>

            <div className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
              <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">
                Learning styles
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {LEARNING_STYLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggle(styles, setStyles, s, 3)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm",
                      styles.includes(s)
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-700",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep("profile")}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-5 py-3 text-sm"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => finish(true)}
                  disabled={loading || me.length < 1 || iam.length < 1}
                  className="rounded-full border border-zinc-200 px-5 py-3 text-sm font-medium"
                >
                  Skip questions
                </button>
                <button
                  type="button"
                  onClick={() => setStep("questions")}
                  disabled={me.length < 1 || iam.length < 1}
                  className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
                >
                  Continue
                </button>
              </div>
            </div>
          </section>
        )}

        {step === "questions" && (
          <section className="mx-auto max-w-2xl">
            <h1 className="font-display text-4xl font-bold tracking-tight">
              A few calibrating questions
            </h1>
            <p className="mt-3 text-zinc-500">
              Optional, but they help the curator time media to your energy and
              format preferences. Skip anytime.
            </p>

            <div className="mt-10 space-y-8">
              {QUESTIONS.map((q) => (
                <div key={q.id}>
                  <h2 className="text-lg font-semibold">{q.prompt}</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, [q.id]: opt }))
                        }
                        className={cn(
                          "rounded-full border px-4 py-2 text-sm",
                          answers[q.id] === opt
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white",
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep("attributes")}
                className="rounded-full border border-zinc-200 px-5 py-3 text-sm"
              >
                Back
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => finish(true)}
                  disabled={loading}
                  className="rounded-full border border-zinc-200 px-5 py-3 text-sm"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => setStep("method")}
                  className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
                >
                  See your method
                </button>
              </div>
            </div>
          </section>
        )}

        {step === "method" && (
          <section className="mx-auto max-w-2xl text-center">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
              Suggested method
            </p>
            <h1 className="font-display mt-3 text-5xl font-bold tracking-tight">
              {method.id}
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-lg text-zinc-500">
              {method.blurb}
            </p>
            <p className="mt-6 text-sm text-zinc-500">
              From <span className="font-medium text-zinc-800">{me.join(", ")}</span>{" "}
              →{" "}
              <span className="font-medium text-zinc-800">{iam.join(", ")}</span>
            </p>
            <button
              type="button"
              disabled={loading}
              onClick={() => finish(false)}
              className="mt-10 rounded-full bg-zinc-900 px-8 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Building your path…" : "Enter your path"}
            </button>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setStep("questions")}
                className="text-sm text-zinc-500 underline-offset-2 hover:underline"
              >
                Back
              </button>
            </div>
          </section>
        )}

        {error && (
          <p className="mx-auto mt-6 max-w-xl rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </main>
    </div>
  );
}

function AttributeColumn(props: {
  title: string;
  subtitle: string;
  tone: "me" | "iam";
  query: string;
  setQuery: (v: string) => void;
  searchPlaceholder: string;
  options: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
  showAll: boolean;
  remaining: number;
  onShowAll: () => void;
  custom: string;
  setCustom: (v: string) => void;
  onAddCustom: () => void;
}) {
  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white p-5 md:p-6">
      <div
        className={cn(
          "mb-4 flex h-20 w-16 items-end justify-center rounded-2xl",
          props.tone === "me" ? "bg-[#f8e8f4]" : "bg-[#e5f3ff]",
        )}
      >
        <div className="mb-2 h-12 w-10 rounded-t-full bg-white/90 shadow-sm" />
      </div>
      <h2 className="font-display text-3xl font-bold">{props.title}</h2>
      <p className="text-sm text-zinc-500">{props.subtitle}</p>

      <input
        value={props.query}
        onChange={(e) => props.setQuery(e.target.value)}
        placeholder={props.searchPlaceholder}
        className="mt-4 w-full rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none ring-zinc-900 focus:ring-2"
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {props.options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => props.onToggle(opt)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm leading-none",
              props.selected.includes(opt)
                ? props.tone === "iam"
                  ? "border-emerald-800 bg-emerald-800 text-white"
                  : "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white text-zinc-800",
            )}
          >
            {opt}
          </button>
        ))}
      </div>

      {!props.showAll && props.remaining > 0 && (
        <button
          type="button"
          onClick={props.onShowAll}
          className="mt-4 text-sm text-zinc-500 underline-offset-2 hover:underline"
        >
          Show all attributes ({props.remaining} more)
        </button>
      )}

      <div className="mt-6">
        <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
          Create custom attribute
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={props.custom}
            onChange={(e) => props.setCustom(e.target.value)}
            placeholder="Type anything that feels right"
            className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none"
          />
          <button
            type="button"
            onClick={props.onAddCustom}
            className="rounded-xl bg-zinc-800 px-4 py-2 text-sm text-white"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
