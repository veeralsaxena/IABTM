"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  href?: string;
  time: string;
};

const DEFAULTS: AppNotification[] = [
  {
    id: "n1",
    title: "Today’s briefing is ready",
    body: "Your primary pick was ranked for potential on your active path.",
    href: "/home",
    time: "Just now",
  },
  {
    id: "n2",
    title: "Practice shapes tomorrow",
    body: "Mark an activity done — the curator adapts the next search queries.",
    href: "/home",
    time: "Today",
  },
  {
    id: "n3",
    title: "Discover stays cached",
    body: "Tab results are session-cached so switching types stays instant.",
    href: "/media",
    time: "Tip",
  },
];

export function NotificationBell({
  items = DEFAULTS,
}: {
  items?: AppNotification[];
}) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => {
          setOpen((v) => !v);
          setUnread(false);
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
      >
        <Bell className="h-4 w-4" />
        {unread && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[320px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg">
          <div className="border-b border-zinc-100 px-4 py-3">
            <div className="text-sm font-semibold">Notifications</div>
            <div className="text-xs text-zinc-500">
              Path signals · not engagement spam
            </div>
          </div>
          <ul className="max-h-[360px] overflow-y-auto">
            {items.map((n) => (
              <li key={n.id} className="border-b border-zinc-50 last:border-0">
                <a
                  href={n.href || "#"}
                  className="block px-4 py-3 hover:bg-zinc-50"
                  onClick={() => setOpen(false)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium leading-snug">
                      {n.title}
                    </div>
                    <div className="shrink-0 text-[10px] uppercase tracking-wide text-zinc-400">
                      {n.time}
                    </div>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    {n.body}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function useShellCollapse(key: string, initial = false) {
  const [collapsed, setCollapsed] = useState(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) setCollapsed(raw === "1");
    } catch {
      // ignore
    }
  }, [key]);

  function toggle() {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  return { collapsed, toggle, setCollapsed };
}
