"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { PERIODS, type Period } from "@/lib/period";
import { RefreshIcon } from "./AdminIcons";

/**
 * Izbor perioda za nadzornu plocu.
 *
 * Filteri stoje u jednom redu iznad grafikona i mijenjaju URL, pa se
 * odabrani period moze podijeliti i osvjeziti bez gubitka izbora.
 */
export default function PeriodFilter({ active }: { active: Period }) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center border border-line bg-surface p-0.5">
        {PERIODS.map((period) => (
          <Link
            key={period.value}
            href={`/admin?period=${period.value}`}
            scroll={false}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              period.value === active
                ? "bg-ink text-white"
                : "text-ink-2 hover:text-ink"
            }`}
          >
            {period.label}
          </Link>
        ))}
      </div>

      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={refreshing}
        aria-label="Osvježi podatke"
        title="Osvježi podatke"
        className="btn-outline btn-sm"
      >
        <RefreshIcon
          className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
        />
        {refreshing ? "Osvježavam" : "Osvježi"}
      </button>
    </div>
  );
}
