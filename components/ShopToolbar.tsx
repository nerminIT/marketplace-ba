"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_SORT, SORT_OPTIONS } from "@/lib/sort-options";

/**
 * Traka iznad mreže proizvoda: koliko ih ima i po čemu se sortira.
 * Promjena sortiranja mijenja query parametar i vraća na prvu stranicu.
 */
export default function ShopToolbar({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = searchParams.get("sort") ?? DEFAULT_SORT;

  function change(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
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
