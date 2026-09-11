"use client";

import { useMemo, useRef, useState } from "react";
import { formatKM } from "@/lib/money";
import { danMjesec, datumBezGodine } from "@/lib/datum";
import { pluralize } from "@/lib/plural";

/**
 * Prihod i profit kroz vrijeme.
 *
 * Specifikacije mrlja su fiksne kroz sve grafikone:
 *   linija 2px sa zaobljenim spojevima, ispuna iste boje na 10% prozirnosti,
 *   mreza hairline 1px puna linija u recesivnoj sivoj, krajnja tacka r>=4 sa
 *   2px prstenom u boji povrsine da ostane citljiva preko linije.
 *
 * Jedna os, nikad dvije - prihod i profit su iste jedinice (KM), pa dijele
 * skalu i odnos izmedju njih se cita direktno iz razmaka linija.
 */

export type TrendPoint = {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
};

const W = 800;
const H = 280;
const PAD = { top: 16, right: 16, bottom: 28, left: 56 };

const SERIES = [
  { key: "revenue" as const, label: "Prihod", color: "var(--color-viz-1)" },
  { key: "profit" as const, label: "Profit", color: "var(--color-viz-2)" },
];

/** Zaokruzi gornju granicu na citljiv broj (1.000 / 2.500 / 10.000...). */
function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function formatShort(value: number): string {
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`;
  return String(Math.round(value));
}

export default function TrendChart({ data }: { data: TrendPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const geometry = useMemo(() => {
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;

    const peak = Math.max(
      ...data.map((d) => Math.max(Number(d.revenue), Number(d.profit))),
      0,
    );
    const max = niceMax(peak);

    const x = (i: number) =>
      data.length <= 1
        ? PAD.left + innerW / 2
        : PAD.left + (i / (data.length - 1)) * innerW;

    const y = (value: number) =>
      PAD.top + innerH - (Math.max(value, 0) / max) * innerH;

    const path = (key: "revenue" | "profit") =>
      data
        .map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(Number(d[key]))}`)
        .join(" ");

    const areaPath = (key: "revenue" | "profit") =>
      data.length === 0
        ? ""
        : `${path(key)} L${x(data.length - 1)},${PAD.top + innerH} L${x(0)},${
            PAD.top + innerH
          } Z`;

    // Cetiri linije mreze plus nula - dovoljno za orijentaciju, premalo da smeta.
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
      value: max * t,
      y: PAD.top + innerH - t * innerH,
    }));

    return { x, y, path, areaPath, ticks, max, innerH, innerW };
  }, [data]);

  if (data.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-ink-3">
        Nema podataka za prikaz.
      </p>
    );
  }

  const point = active !== null ? data[active] : null;
  const tooltipLeft =
    active !== null ? (geometry.x(active) / W) * 100 : 0;

  function handleMove(event: React.MouseEvent<SVGRectElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const index = Math.round(ratio * (data.length - 1));
    setActive(Math.min(Math.max(index, 0), data.length - 1));
  }

  return (
    <div ref={wrapRef} className="relative">
      {/* --------------------------------------------------------- legenda */}
      <div className="mb-3 flex flex-wrap items-center gap-4">
        {SERIES.map((series) => (
          <span key={series.key} className="flex items-center gap-2 text-xs text-ink-2">
            <span
              aria-hidden
              className="h-0.5 w-4 rounded-full"
              style={{ background: series.color }}
            />
            {series.label}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Kretanje prihoda i profita po danima"
      >
        {/* -------------------------------------------------------- mreza */}
        {geometry.ticks.map((tick) => (
          <g key={tick.y}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={tick.y}
              y2={tick.y}
              stroke="var(--color-viz-grid)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 10}
              y={tick.y + 4}
              textAnchor="end"
              fontSize={11}
              fill="var(--color-ink-3)"
            >
              {formatShort(tick.value)}
            </text>
          </g>
        ))}

        {/* ------------------------------------------------------- ispune */}
        {SERIES.map((series) => (
          <path
            key={`area-${series.key}`}
            d={geometry.areaPath(series.key)}
            fill={series.color}
            fillOpacity={0.1}
          />
        ))}

        {/* ------------------------------------------------------- linije */}
        {SERIES.map((series) => (
          <path
            key={`line-${series.key}`}
            d={geometry.path(series.key)}
            fill="none"
            stroke={series.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* --------------------------------------------- krajnje tacke */}
        {SERIES.map((series) => {
          const last = data.length - 1;
          return (
            <circle
              key={`end-${series.key}`}
              cx={geometry.x(last)}
              cy={geometry.y(Number(data[last][series.key]))}
              r={4}
              fill={series.color}
              stroke="var(--color-surface)"
              strokeWidth={2}
            />
          );
        })}

        {/* ------------------------------------------------------ crosshair */}
        {active !== null ? (
          <g>
            <line
              x1={geometry.x(active)}
              x2={geometry.x(active)}
              y1={PAD.top}
              y2={PAD.top + geometry.innerH}
              stroke="var(--color-line-strong)"
              strokeWidth={1}
            />
            {SERIES.map((series) => (
              <circle
                key={`hover-${series.key}`}
                cx={geometry.x(active)}
                cy={geometry.y(Number(data[active][series.key]))}
                r={4.5}
                fill={series.color}
                stroke="var(--color-surface)"
                strokeWidth={2}
              />
            ))}
          </g>
        ) : null}

        {/* ------------------------------------------------- oznake datuma */}
        {data.map((d, i) => {
          const every = Math.ceil(data.length / 8);
          if (i % every !== 0 && i !== data.length - 1) return null;
          return (
            <text
              key={d.date}
              x={geometry.x(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize={11}
              fill="var(--color-ink-3)"
            >
              {danMjesec(d.date)}
            </text>
          );
        })}

        {/* Providna zona za hover - veca od same mrlje, po cijeloj visini. */}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={geometry.innerW}
          height={geometry.innerH}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={() => setActive(null)}
        />
      </svg>

      {/* -------------------------------------------------------- tooltip */}
      {point ? (
        <div
          className="pointer-events-none absolute top-8 z-10 min-w-40 -translate-x-1/2 border border-line bg-surface px-3 py-2 shadow-[0_8px_24px_-12px_rgba(16,19,26,0.3)]"
          style={{
            left: `${Math.min(Math.max(tooltipLeft, 12), 88)}%`,
          }}
        >
          <span className="block text-[11px] text-ink-3">
            {datumBezGodine(point.date)}
          </span>

          {SERIES.map((series) => (
            <span
              key={series.key}
              className="mt-1 flex items-center justify-between gap-4 text-xs"
            >
              <span className="flex items-center gap-1.5 text-ink-2">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ background: series.color }}
                />
                {series.label}
              </span>
              <span className="font-medium text-ink">
                {formatKM(Number(point[series.key]))}
              </span>
            </span>
          ))}

          <span className="mt-1 block border-t border-line pt-1 text-[11px] text-ink-3">
            {pluralize(point.orders, "narudžba", "narudžbe", "narudžbi")}
          </span>
        </div>
      ) : null}
    </div>
  );
}
