"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCategory } from "@/app/actions/categories";

/**
 * Brisanje kategorije uz potvrdu u dva koraka.
 * Kategorija koja se koristi na proizvodima se uopšte ne nudi za brisanje.
 */
export default function DeleteCategoryButton({
  id,
  productCount,
}: {
  id: number;
  productCount: number;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  if (productCount > 0) {
    return (
      <span className="text-xs text-ink-3">
        Ne može se obrisati — koristi se na {productCount} proizvoda
      </span>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="btn-ghost btn-sm text-sale"
      >
        Obriši
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span className="text-xs text-ink-2">Sigurno?</span>
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteCategory(id);
            if (result?.ok) router.push("/admin/kategorije");
            else setError(result?.message ?? "Brisanje nije uspjelo.");
          })
        }
        className="btn-sm bg-sale text-white"
      >
        {busy ? "Brišem..." : "Da, obriši"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="btn-ghost btn-sm"
      >
        Ne
      </button>
      {error ? <span className="text-xs text-sale">{error}</span> : null}
    </span>
  );
}
