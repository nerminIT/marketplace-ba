"use client";

import { useState, useTransition } from "react";
import { mapSupplierCategory } from "@/app/actions/suppliers";
import { KATEGORIJA, pluralize } from "@/lib/plural";

/**
 * Povezivanje kategorija iz feeda sa našim kategorijama.
 *
 * Pojavljuje se u pregledu uvoza, jer se tek tamo vidi koje vrijednosti
 * dobavljač zaista šalje. Sve što se ne mapira ide u zadanu kategoriju
 * dobavljača.
 */
export default function CategoryMapper({
  supplierId,
  values,
  categories,
  onSaved,
}: {
  supplierId: number;
  values: string[];
  categories: { id: number; name: string }[];
  onSaved?: () => void;
}) {
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [busy, startTransition] = useTransition();

  function assign(sourceValue: string, categoryId: string) {
    if (!categoryId) return;

    startTransition(async () => {
      const result = await mapSupplierCategory(
        supplierId,
        sourceValue,
        Number(categoryId),
      );
      if (result?.ok) {
        const name =
          categories.find((c) => String(c.id) === categoryId)?.name ?? "";
        setSaved((prev) => ({ ...prev, [sourceValue]: name }));
      }
    });
  }

  const remaining = values.filter((v) => !saved[v]);

  return (
    <div className="mb-4 border border-warn/30 bg-warn/5 p-4">
      <h3 className="text-sm font-medium text-ink">
        Kategorije iz feeda još nisu povezane
      </h3>
      <p className="mt-1 mb-3 text-xs text-ink-2">
        {remaining.length > 0
          ? `${pluralize(remaining.length, ...KATEGORIJA)} bez veze sa našom kategorijom. Nepovezane idu u zadanu kategoriju dobavljača.`
          : "Sve kategorije iz ovog pregleda su povezane."}
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {values.map((value) => (
          <div
            key={value}
            className="flex items-center gap-2 border border-line bg-surface px-3 py-2"
          >
            <span className="min-w-0 flex-1 truncate text-xs text-ink">
              {value}
            </span>
            <span aria-hidden className="text-ink-3">
              →
            </span>

            {saved[value] ? (
              <span className="chip bg-ok/10 text-ok">{saved[value]}</span>
            ) : (
              <select
                defaultValue=""
                disabled={busy}
                onChange={(e) => assign(value, e.target.value)}
                className="field w-40 py-1 text-xs"
                aria-label={`Kategorija za ${value}`}
              >
                <option value="">— odaberi —</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      {Object.keys(saved).length > 0 && onSaved ? (
        <button
          type="button"
          onClick={onSaved}
          className="btn-outline btn-sm mt-3"
        >
          Osvježi pregled
        </button>
      ) : null}
    </div>
  );
}
