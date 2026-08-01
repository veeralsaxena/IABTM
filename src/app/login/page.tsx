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
      const { data, error } = await supabase.auth.signUp({
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
      if (data.session) {
        router.push("/onboarding");
        router.refresh();
        return;
      }
      setMessage(
        "Account created. If email confirmation is enabled, check your inbox — then sign in.",
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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", user.id)
        .maybeSingle();
      router.push(profile?.onboarding_complete ? "/home" : "/onboarding");
    } else {
      router.push("/home");
    }
    router.refresh();
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden md:block">
        <Image
          src="https://images.unsplash.com/photo-1499728603263-13726abce5fd?w=1400&q=80"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <p className="font-display text-3xl font-semibold leading-tight">
            Become the self you imagine.
          </p>
          <p className="mt-3 max-w-sm text-sm text-white/75">
            Sign in to build your path and get a daily briefing curated for
            growth.
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-center px-5 py-12 md:px-12">
        <Link href="/" className="mb-10">
          <div className="font-display text-2xl font-bold">CURATE</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">
            Sign in to continue
          </div>
        </Link>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6 flex rounded-full border border-zinc-200 p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-full py-2 text-sm ${
                  mode === m ? "bg-zinc-900 text-white" : "text-zinc-500"
                }`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <label className="block text-sm">
                <span className="mb-1.5 block text-zinc-500">Display name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 outline-none ring-zinc-900 focus:ring-2"
                  placeholder="Your name"
                />
              </label>
            )}
            <label className="block text-sm">
              <span className="mb-1.5 block text-zinc-500">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 outline-none ring-zinc-900 focus:ring-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-zinc-500">Password</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 outline-none ring-zinc-900 focus:ring-2"
              />
            </label>

            {message && (
              <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm text-zinc-700">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-zinc-900 py-3 text-sm font-semibold text-white disabled:opacity-50"
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
