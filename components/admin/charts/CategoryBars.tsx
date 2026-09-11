"use client";

import { useState } from "react";
import { formatKM } from "@/lib/money";
import { KOMAD, pluralize } from "@/lib/plural";

/**
 * Prihod po kategorijama.
 *
 * Posao podatka je poredjenje veliCine, pa ide jedna boja - kategorije se
 * porede po duzini trake, ne po identitetu boje. Vrijednost stoji na vrhu
 * trake, izvan nje, da se nikad ne odsijece na kratkim trakama.
 *
 * Vodoravno zato sto su nazivi kategorija duge rijeci; uspravne kolone bi
 * ih natjerale da se kose ili lome.
 */

export type CategoryRow = { name: string; revenue: number; units: number };

export default function CategoryBars({ data }: { data: CategoryRow[] }) {
  const [hover, setHover] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-ink-3">
        Nema prodaje po kategorijama.
      </p>
    );
  }

  const max = Math.max(...data.map((row) => Number(row.revenue)), 1);

  return (
    <ul className="space-y-3.5">
      {data.map((row) => {
        const revenue = Number(row.revenue);
        const width = Math.max((revenue / max) * 100, 1.5);
        const dimmed = hover !== null && hover !== row.name;

        return (
          <li
            key={row.name}
            onMouseEnter={() => setHover(row.name)}
            onMouseLeave={() => setHover(null)}
            className="transition-opacity"
            style={{ opacity: dimmed ? 0.5 : 1 }}
          >
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-ink">{row.name}</span>
              <span className="shrink-0 text-sm font-medium text-ink">
                {formatKM(revenue)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Traka: max 10px debljine, zaobljen kraj podatka, ravna u nuli. */}
              <div className="h-2.5 flex-1 bg-ground">
                <div
                  className="h-full rounded-r-[4px]"
                  style={{
                    width: `${width}%`,
                    background: "var(--color-viz-1)",
                  }}
                />
              </div>

              <span className="w-20 shrink-0 text-right text-xs text-ink-3">
                {pluralize(row.units, ...KOMAD)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
