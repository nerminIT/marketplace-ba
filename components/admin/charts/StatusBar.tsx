"use client";

import { useState } from "react";
import { pluralize } from "@/lib/plural";

/**
 * Raspodjela narudzbi po statusu.
 *
 * Namjerno vodoravna slozena traka, a ne prsten: nazivi statusa su dugacki,
 * udjeli se porede duz jedne linije umjesto po uglovima, i svaki segment
 * dobija vidljivu oznaku - pa identitet nikad ne ovisi samo o boji.
 *
 * Segmente razdvaja 2px razmak u boji povrsine; obrub se ne crta jer bi
 * dodao tintu koja nije podatak.
 */

export type StatusSlice = {
  value: string;
  label: string;
  viz: number;
  count: number;
  percent: number;
};

export default function StatusBar({ data }: { data: StatusSlice[] }) {
  const [hover, setHover] = useState<string | null>(null);

  const visible = data.filter((slice) => slice.count > 0);
  const total = data.reduce((sum, slice) => sum + slice.count, 0);

  if (total === 0) {
    return (
      <p className="py-12 text-center text-sm text-ink-3">
        Još nema narudžbi u ovom periodu.
      </p>
    );
  }

  return (
    <div>
      {/* ---------------------------------------------------------- traka */}
      <div className="flex h-10 w-full gap-0.5 overflow-hidden">
        {visible.map((slice) => (
          <div
            key={slice.value}
            role="img"
            aria-label={`${slice.label}: ${slice.count} (${slice.percent}%)`}
            onMouseEnter={() => setHover(slice.value)}
            onMouseLeave={() => setHover(null)}
            className="relative flex items-center justify-center transition-opacity"
            style={{
              flexGrow: slice.count,
              flexBasis: 0,
              background: `var(--color-viz-${slice.viz})`,
              opacity: hover && hover !== slice.value ? 0.45 : 1,
            }}
          >
            {/* Postotak unutar segmenta samo ako stvarno ima mjesta -
                inace bi tekst bio odsjecen, sto je gore od nikakve oznake. */}
            {slice.percent >= 12 ? (
              <span className="text-[11px] font-medium text-white">
                {slice.percent}%
              </span>
            ) : null}
          </div>
        ))}
      </div>

      {/* -------------------------------------------------------- legenda */}
      <ul className="mt-5 space-y-2.5">
        {data.map((slice) => (
          <li
            key={slice.value}
            onMouseEnter={() => setHover(slice.value)}
            onMouseLeave={() => setHover(null)}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  background: `var(--color-viz-${slice.viz})`,
                  opacity: slice.count === 0 ? 0.3 : 1,
                }}
              />
              <span className={slice.count === 0 ? "text-ink-3" : "text-ink-2"}>
                {slice.label}
              </span>
            </span>

            <span className="flex shrink-0 items-baseline gap-2">
              <span
                className={
                  slice.count === 0 ? "text-ink-3" : "font-medium text-ink"
                }
              >
                {slice.count}
              </span>
              <span className="w-10 text-right text-xs text-ink-3">
                {slice.percent}%
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-line pt-3 text-xs text-ink-3">
        Ukupno {pluralize(total, "narudžba", "narudžbe", "narudžbi")}
      </p>
    </div>
  );
}
