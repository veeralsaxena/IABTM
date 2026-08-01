"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name || email.split("@")[0] },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }
      setMessage(
        "Account created. If email confirmation is on, check your inbox — otherwise sign in now.",
      );
      setMode("signin");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl md:grid-cols-2">
      <div className="relative hidden min-h-screen md:block">
        <Image
          src="https://images.unsplash.com/photo-1499728603263-13726abce5fd?w=1400&q=80"
          alt="Quiet path through trees"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-paper-elevated">
          <p className="font-display text-3xl font-semibold leading-tight">
            Become the self you imagine.
          </p>
          <p className="mt-3 max-w-sm text-sm text-paper-elevated/80">
            Sign in to get a path and a daily briefing curated for growth — not
            for your attention span.
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-center px-5 py-12 md:px-12">
        <Link href="/" className="mb-10">
          <div className="font-display text-2xl font-bold text-ink">CURATE</div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-ink-soft/70">
            Sign in to continue becoming
          </div>
        </Link>

        <div className="grain-panel rounded-[1.5rem] p-6 md:p-8">
          <div className="mb-6 flex rounded-full border border-line p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-full py-2 text-sm ${
                  mode === m ? "bg-ink text-paper-elevated" : "text-ink-soft"
                }`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <label className="block text-sm">
                <span className="mb-1.5 block text-ink-soft">Display name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none ring-accent focus:ring-2"
                  placeholder="Veeral"
                />
              </label>
            )}
            <label className="block text-sm">
              <span className="mb-1.5 block text-ink-soft">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none ring-accent focus:ring-2"
                placeholder="you@email.com"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-ink-soft">Password</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none ring-accent focus:ring-2"
                placeholder="••••••••"
              />
            </label>

            {message && (
              <p className="rounded-xl bg-signal-soft px-3 py-2 text-sm text-ink">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full rounded-full py-3 text-sm font-semibold"
            >
              {loading
                ? "Working…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
