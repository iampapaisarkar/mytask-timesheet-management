export type TimelineTaskType = "working" | "break" | "travel";

export type TimelineTask = {
  key: string;
  type: TimelineTaskType;
  label: string;
  start_time: string;
  end_time: string;
};

const TYPE_COLORS: Record<TimelineTaskType, string> = {
  working: "#04B6B1",
  break: "#F59E0B",
  travel: "#5B8DEF",
};

const PX_PER_MIN = 1.1;

function parseMinutes(value: string): number | null {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
}

function formatDuration(start: string, end: string): string {
  const a = parseMinutes(start);
  const b = parseMinutes(end);
  if (a == null || b == null || b <= a) return "—";
  const mins = b - a;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function sumDurationsByType(tasks: TimelineTask[]) {
  const totals = { working: 0, break: 0, travel: 0 };
  for (const t of tasks) {
    const a = parseMinutes(t.start_time);
    const b = parseMinutes(t.end_time);
    if (a == null || b == null || b <= a) continue;
    totals[t.type] += b - a;
  }
  return totals;
}

export function formatMinutesAsHm(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function TypeIcon({ type }: { type: TimelineTaskType }) {
  if (type === "break") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M2 21h18v-2H2v2zm6-4h5a6 6 0 0 0 6-6V3H4v8a6 6 0 0 0 4 5.65V17zm-2-6V5h10v6a4 4 0 0 1-4 4H8a4 4 0 0 1-2-3.46V11zM20 3h2v6a4 4 0 0 1-4 4h-1v-2h1a2 2 0 0 0 2-2V3z" />
      </svg>
    );
  }
  if (type === "travel") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13.78 15.3 19.79 3.29 7.74 9.25l4.47 1.59 1.57 4.46zm-4.6 1.67-1.92-1.91-4.08.9a.5.5 0 0 0-.2.85l2.57 2.57a.5.5 0 0 0 .85-.2l.78-3.21zM21.7 2.29a1 1 0 0 0-1.13-.22l-15.5 7.04a1 1 0 0 0-.14 1.74l5.26 3.16 3.16 5.26a1 1 0 0 0 1.74-.14l7.04-15.5a1 1 0 0 0-.23-1.14z" />
    </svg>
  );
}

export function TrackedTimeline({
  tasks,
  selectedKey,
  onSelect,
}: {
  tasks: TimelineTask[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const starts = tasks
    .map((t) => parseMinutes(t.start_time))
    .filter((n): n is number => n != null);
  const ends = tasks
    .map((t) => parseMinutes(t.end_time))
    .filter((n): n is number => n != null);

  let rangeStart = starts.length ? Math.min(...starts) : 8 * 60;
  let rangeEnd = ends.length ? Math.max(...ends) : 18 * 60;
  rangeStart = Math.floor(rangeStart / 30) * 30 - 30;
  rangeEnd = Math.ceil(rangeEnd / 30) * 30 + 30;
  if (rangeEnd <= rangeStart) rangeEnd = rangeStart + 8 * 60;

  const totalMins = rangeEnd - rangeStart;
  const height = Math.max(320, totalMins * PX_PER_MIN);

  const ticks: number[] = [];
  for (let t = rangeStart; t <= rangeEnd; t += 30) ticks.push(t);

  function labelFor(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  return (
    <div className="flex h-full min-h-[320px] flex-col">
      <h3 className="mb-3 text-base font-semibold text-[var(--mt-text)]">
        Tracked Timeline
      </h3>
      <div className="relative min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-[var(--mt-bg)]/40">
        <div className="relative" style={{ height, minWidth: 280 }}>
          {ticks.map((t) => {
            const top = (t - rangeStart) * PX_PER_MIN;
            const isHour = t % 60 === 0;
            return (
              <div
                key={t}
                className="absolute right-0 left-0 flex items-start"
                style={{ top }}
              >
                <span
                  className={`w-14 shrink-0 pr-2 text-right text-[11px] ${
                    isHour ? "font-medium text-[var(--mt-text)]" : "text-muted"
                  }`}
                >
                  {labelFor(t)}
                </span>
                <div
                  className={`flex-1 border-t ${
                    isHour ? "border-border" : "border-border/50"
                  }`}
                />
              </div>
            );
          })}

          {tasks.map((task) => {
            const a = parseMinutes(task.start_time);
            const b = parseMinutes(task.end_time);
            if (a == null || b == null || b <= a) return null;
            const top = (a - rangeStart) * PX_PER_MIN;
            const barH = Math.max(22, (b - a) * PX_PER_MIN);
            const selected = selectedKey === task.key;
            const color = TYPE_COLORS[task.type];
            return (
              <button
                key={task.key}
                type="button"
                onClick={() => onSelect(task.key)}
                className={`absolute right-3 left-16 overflow-hidden rounded-lg text-left transition ${
                  selected ? "ring-2 ring-primary ring-offset-2" : ""
                }`}
                style={{
                  top,
                  height: barH,
                  background: color,
                  boxShadow: selected
                    ? "0 0 0 3px rgba(4,182,177,0.35)"
                    : undefined,
                }}
                aria-pressed={selected}
              >
                <div className="flex h-full items-center justify-between gap-2 px-3 py-1">
                  <span className="truncate text-xs font-semibold text-white">
                    {task.label}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-white/90">
                    <TypeIcon type={task.type} />
                    <span className="text-[10px] font-medium">
                      {formatDuration(task.start_time, task.end_time)}
                    </span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
