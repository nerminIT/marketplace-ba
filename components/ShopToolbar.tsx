"use client";

import { useRouter } from "next/navigation";
import { DEFAULT_SORT, SORT_OPTIONS } from "@/lib/sort-options";

/**
 * Traka iznad mreže proizvoda: koliko ih ima i po čemu se sortira.
 *
 * Namjerno NE koristi `useSearchParams`. Taj hook de-optimizuje Suspense
 * granicu u kojoj se nalazi na renderovanje isključivo na klijentu — u praksi
 * je lista proizvoda ostajala zaglavljena u fallbacku, a stvarni sadržaj u
 * skrivenom `<div hidden>`. Server ionako već zna sve filtere, pa ih šalje
 * kao props, a ovdje ostaje samo `useRouter` za navigaciju.
 */
export default function ShopToolbar({
  total,
  sort,
  basePath,
  params = {},
}: {
  total: number;
  sort: string;
  basePath: string;
  /** Ostali aktivni filteri, bez `sort` i `page`. */
  params?: Record<string, string | undefined>;
}) {
  const router = useRouter();

  const current = SORT_OPTIONS.some((o) => o.value === sort)
    ? sort
    : DEFAULT_SORT;

  function change(value: string) {
    const search = new URLSearchParams();

    for (const [key, val] of Object.entries(params)) {
      if (val) search.set(key, val);
    }
    if (value !== DEFAULT_SORT) search.set("sort", value);

    const qs = search.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
      <span className="text-sm text-ink-2">
        {total === 0
          ? "Nema proizvoda"
          : `${total} ${total === 1 ? "proizvod" : "proizvoda"}`}
      </span>

      <label className="flex items-center gap-2 text-sm text-ink-2">
        <span className="hidden sm:inline">Sortiraj:</span>
        <select
          value={current}
          onChange={(e) => change(e.target.value)}
          className="field w-auto py-1.5 text-sm"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
