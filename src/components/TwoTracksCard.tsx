import type { TwoTracks } from "@/types";

export function TwoTracksCard({ tracks }: { tracks: TwoTracks }) {
  const { subconscious, action, skillNode, stage } = tracks;
  const licensed = subconscious.licensed;

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-4 py-3 sm:px-5">
        <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
          Two tracks today · skill node {skillNode} · {stage} path
        </div>
        <h2 className="mt-0.5 font-display text-lg font-bold tracking-tight">
          Rehearse who you are becoming. Then go do the thing.
        </h2>
        <p className="mt-1 text-sm text-zinc-500">{subconscious.identityLine}</p>
      </div>

      <div className="grid gap-0 sm:grid-cols-2">
        <div className="space-y-3 border-b border-zinc-100 p-4 sm:border-b-0 sm:border-r sm:p-5">
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
            Track 1 · Subconscious
          </div>
          <div>
            <div className="text-xs text-zinc-400">
              {subconscious.visualization.title} ·{" "}
              {subconscious.visualization.durationSeconds}s
            </div>
            <p className="mt-1 text-sm leading-relaxed text-zinc-700">
              {subconscious.visualization.script}
            </p>
          </div>
          <div className="rounded-xl bg-zinc-50 px-3 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                {licensed.partner}
              </span>
              <span className="text-[11px] text-zinc-400">
                {licensed.durationMinutes} min · {licensed.format} · licensed
                payload
              </span>
            </div>
            <div className="mt-1.5 text-sm font-semibold text-zinc-900">
              {licensed.title}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              {licensed.whyThisPartner}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-600">
              {licensed.whyNow}
            </p>
            <a
              href={licensed.href}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs font-medium text-zinc-900 underline underline-offset-2"
            >
              Partner shelf (licensing demo)
            </a>
          </div>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
            Track 2 · Action
          </div>
          {action.primary ? (
            <>
              <div className="text-base font-semibold">{action.primary.title}</div>
              <p className="text-sm leading-relaxed text-zinc-600">
                {action.primary.description}
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-500">One tiny method block today.</p>
          )}
          <p className="text-xs leading-relaxed text-zinc-500">{action.note}</p>
        </div>
      </div>

      <div className="border-t border-zinc-100 px-4 py-3 sm:px-5">
        <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
          Licensing map · not today
        </div>
        <ul className="mt-2 space-y-1.5">
          {subconscious.held.map((item) => (
            <li key={item.id} className="text-xs leading-relaxed text-zinc-500">
              <span className="font-semibold text-zinc-700">{item.partner}</span>
              {" · "}
              {item.title}
              {" · "}
              {item.whyThisPartner}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
