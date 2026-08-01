"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const links = [
  { href: "/home", label: "Today" },
  { href: "/media", label: "Media" },
  { href: "/architecture", label: "System" },
  { href: "/onboarding", label: "Path" },
];

export function AppShell({
  children,
  name,
}: {
  children: React.ReactNode;
  name?: string | null;
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
    <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-5 pb-16 pt-6 md:px-8">
      <header className="mb-10 flex items-center justify-between gap-4">
        <Link href="/home" className="group">
          <div className="font-display text-2xl font-bold tracking-tight text-ink">
            CURATE
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-ink-soft/70">
            for IABTM · potential over attention
          </div>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-line bg-paper-elevated/80 p-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm transition",
                pathname === l.href
                  ? "bg-ink text-paper-elevated"
                  : "text-ink-soft hover:text-ink",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {name && (
            <span className="hidden text-sm text-ink-soft sm:inline">{name}</span>
          )}
          <button
            onClick={signOut}
            className="rounded-full border border-line px-3 py-1.5 text-sm text-ink-soft hover:border-ink hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </header>

      <nav className="mb-6 flex gap-2 overflow-x-auto md:hidden">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm",
              pathname === l.href
                ? "bg-ink text-paper-elevated"
                : "border border-line text-ink-soft",
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <main className="flex-1">{children}</main>
    </div>
  );
}
