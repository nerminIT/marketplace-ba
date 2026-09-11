import type { ReactNode } from "react";

/**
 * Pojedinacna brojka sa promjenom u odnosu na prethodni period.
 *
 * Jedna vrijednost sa trendom je posao za plocicu, ne za grafikon sa jednom
 * trakom. Sparkline je samo kontekst oblika - bez osi i bez oznaka, jer
 * vrijednost koja se cita stoji iznad njega.
 */

export type StatCardProps = {
  label: string;
  value: string;
  /** Promjena u procentima; null kad prethodni period nema podataka. */
  change?: number | null;
  hint?: string;
  icon?: ReactNode;
  /** Vrijednosti za sparkline, redom po vremenu. */
  spark?: number[];
  /** Za brojke gdje je rast losa vijest (npr. otkazane narudzbe). */
  invert?: boolean;
  accent?: 1 | 2 | 3 | 4 | 5;
};

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;

  const W = 120;
  const H = 32;
  const max = Math.max(...values, 1);

  const points = values.map((value, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - (Math.max(value, 0) / max) * (H - 4) - 2;
    return `${x},${y}`;
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-8 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function StatCard({
  label,
  value,
  change,
  hint,
  icon,
  spark,
  invert = false,
  accent = 1,
}: StatCardProps) {
  const color = `var(--color-viz-${accent})`;

  // Rast je dobra vijest osim kad je `invert` - tada je obrnuto.
  const positive = change !== null && change !== undefined && change > 0;
  const good = invert ? !positive : positive;
  const neutral = change === null || change === undefined || change === 0;

  return (
    <div className="card flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-medium tracking-[0.14em] text-ink-3 uppercase">
          {label}
        </span>

        {icon ? (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ background: `color-mix(in oklab, ${color} 12%, white)`, color }}
          >
            {icon}
          </span>
        ) : null}
      </div>

      <span className="mt-3 block text-2xl font-semibold tracking-tight text-ink">
        {value}
      </span>

      <div className="mt-1.5 flex items-center gap-2 text-xs">
        {!neutral ? (
          <span
            className={`flex items-center gap-1 font-medium ${
              good ? "text-ok" : "text-sale"
            }`}
          >
            <span aria-hidden>{positive ? "↑" : "↓"}</span>
            {Math.abs(change as number)}%
          </span>
        ) : null}

        {hint ? <span className="text-ink-3">{hint}</span> : null}
      </div>

      {spark && spark.length > 1 ? (
        <div className="mt-4">
          <Sparkline values={spark} color={color} />
        </div>
      ) : null}
    </div>
  );
}
