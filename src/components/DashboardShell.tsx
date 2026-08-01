"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Film,
  Home,
  LogOut,
  Settings,
  Sparkles,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/media", label: "Curated Media", icon: Film },
  { href: "/onboarding", label: "Your Path", icon: Sparkles },
  { href: "/architecture", label: "System", icon: Settings },
];

export function DashboardShell({
  children,
  name,
  avatarUrl,
  rightPanel,
}: {
  children: React.ReactNode;
  name?: string | null;
  avatarUrl?: string | null;
  rightPanel?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-zinc-900">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col border-r border-zinc-200 bg-white px-4 py-6 md:flex">
          <Link href="/home" className="mb-8 px-2">
            <div className="font-display text-2xl font-bold tracking-tight">
              CURATE
            </div>
            <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
              potential · not attention
            </div>
          </Link>

          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-zinc-50 px-3 py-3">
            <div className="relative h-11 w-11 overflow-hidden rounded-full bg-zinc-200">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="" fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-500">
                  <UserRound className="h-5 w-5" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {name || "You"}
              </div>
              <div className="truncate text-xs text-zinc-500">
                @{((name || "you") as string).toLowerCase().replace(/\s+/g, "")}
              </div>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                    active
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="leading-none">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <button
            onClick={signOut}
            className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur md:hidden">
            <div className="font-display text-lg font-bold">CURATE</div>
            <div className="flex gap-2 overflow-x-auto">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs",
                    pathname === item.href
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-600",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </header>

          <div className="flex flex-1 gap-0 lg:gap-4 lg:p-4">
            <main className="min-w-0 flex-1 px-4 py-5 lg:rounded-3xl lg:bg-white lg:px-6 lg:py-6 lg:shadow-sm">
              {children}
            </main>
            {rightPanel && (
              <aside className="hidden w-[320px] shrink-0 xl:block">
                {rightPanel}
              </aside>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
