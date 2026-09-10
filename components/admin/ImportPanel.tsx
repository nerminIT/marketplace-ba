"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  previewSupplierImport,
  runSupplierImport,
} from "@/app/actions/suppliers";
import CategoryMapper from "./CategoryMapper";
import type { PreviewResult } from "@/lib/import/engine";
import { formatKM } from "@/lib/money";
import { plural, pluralize, RED } from "@/lib/plural";

/**
 * Pregled i pokretanje uvoza.
 *
 * Pregled je namjerno obavezan korak u glavi korisnika: prije nego se
 * bilo šta upiše u bazu, vidi se kako je feed pročitan i koje cijene
 * ispadaju iz marže.
 */
export default function ImportPanel({
  supplierId,
  hasFeed,
  hasMapping,
  categories,
}: {
  supplierId: number;
  hasFeed: boolean;
  hasMapping: boolean;
  categories: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [runMsg, setRunMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const blocked = !hasFeed || !hasMapping;

  function doPreview() {
    setRunMsg(null);
    startTransition(async () => {
      const result = await previewSupplierImport(supplierId);
      setPreview(result);
    });
  }

  function doRun() {
    setConfirming(false);
    startTransition(async () => {
      const result = await runSupplierImport(supplierId);
      setRunMsg({ ok: result.ok, text: result.message });
      setPreview(null);
      router.refresh();
    });
  }

  return (
    <section className="card mb-6 p-6">
      <h2 className="text-sm font-semibold text-ink">Uvoz proizvoda</h2>
      <p className="mt-1 mb-5 text-sm text-ink-2">
        Prvo pogledajte kako je feed pročitan, pa tek onda pokrenite uvoz.
      </p>

      {blocked ? (
        <p className="border border-warn/30 bg-warn/5 px-3 py-2 text-sm text-warn">
          {!hasFeed
            ? "Upišite adresu feeda i sačuvajte, pa se vratite ovdje."
            : "Mapirajte barem ID, naziv i nabavnu cijenu, pa sačuvajte."}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={doPreview}
            disabled={busy}
            className="btn-outline"
          >
            {busy && !confirming ? "Učitavam..." : "Pogledaj prvih 15 redova"}
          </button>

          {confirming ? (
            <>
              <button
                type="button"
                onClick={doRun}
                disabled={busy}
                className="btn-primary"
              >
                Potvrdi uvoz
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="btn-ghost"
              >
                Odustani
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={busy}
              className="btn-dark"
            >
              Pokreni uvoz
            </button>
          )}
        </div>
      )}

      {confirming ? (
        <p className="mt-3 text-xs text-ink-2">
          Uvoz mijenja katalog: dodaje nove proizvode i osvježava postojeće.
          Proizvodi sa zaključanom cijenom ili tekstom se ne diraju.
        </p>
      ) : null}

      {runMsg ? (
        <p
          className={`mt-4 border px-3 py-2 text-sm ${
            runMsg.ok
              ? "border-ok/30 bg-ok/5 text-ok"
              : "border-sale/30 bg-sale/5 text-sale"
          }`}
        >
          {runMsg.text}
        </p>
      ) : null}

      {/* ---------------------------------------------------------- pregled */}
      {preview ? (
        preview.ok ? (
          <div className="mt-6">
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="text-ink">
                Feed ima <strong>{preview.totalRows}</strong> upotrebljiv
                {plural(preview.totalRows, "", "a", "ih")}{" "}
                {plural(preview.totalRows, ...RED)}
              </span>
              {preview.errors.length > 0 ? (
                <span className="text-sale">
                  {pluralize(preview.errors.length, ...RED)} se preskače
                </span>
              ) : null}
            </div>

            {preview.unmappedCategories.length > 0 ? (
              <CategoryMapper
                supplierId={supplierId}
                values={preview.unmappedCategories}
                categories={categories}
                onSaved={doPreview}
              />
            ) : null}

            <div className="overflow-x-auto border border-line">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-line bg-ground text-left text-[10px] tracking-wide text-ink-3 uppercase">
                    <th className="px-3 py-2 font-medium">Red</th>
                    <th className="px-3 py-2 font-medium">Naziv</th>
                    <th className="px-3 py-2 font-medium">Kategorija</th>
                    <th className="px-3 py-2 font-medium">Nabavno</th>
                    <th className="px-3 py-2 font-medium">Prodajno</th>
                    <th className="px-3 py-2 font-medium">Zarada</th>
                    <th className="px-3 py-2 font-medium">Zaliha</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.row} className="border-b border-line last:border-0">
                      <td className="px-3 py-2 text-ink-3">{row.row}</td>
                      <td className="max-w-xs px-3 py-2">
                        <span className="block truncate text-ink">{row.name}</span>
                        <span className="text-ink-3">{row.externalId}</span>
                      </td>
                      <td className="px-3 py-2 text-ink-2">
                        {row.resolvedCategory ?? (
                          <span className="text-warn">bez kategorije</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-ink-2">
                        {formatKM(row.costBam)}
                      </td>
                      <td className="px-3 py-2 font-medium text-ink">
                        {formatKM(row.priceBam)}
                      </td>
                      <td className="px-3 py-2 text-ok">
                        {formatKM(row.profitBam)}
                      </td>
                      <td className="px-3 py-2 text-ink-2">{row.stock}</td>
                      <td className="px-3 py-2">
                        {row.priceLocked ? (
                          <span className="chip bg-warn/10 text-warn">
                            cijena zaključana
                          </span>
                        ) : row.exists ? (
                          <span className="chip bg-brand-soft text-brand">
                            osvježava se
                          </span>
                        ) : (
                          <span className="chip bg-ok/10 text-ok">novo</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.errors.length > 0 ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-ink-2">
                  Prikaži redove koji se preskaču ({preview.errors.length})
                </summary>
                <ul className="mt-2 space-y-1 text-xs text-sale">
                  {preview.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 border border-sale/30 bg-sale/5 px-3 py-2 text-sm text-sale">
            {preview.message}
          </p>
        )
      ) : null}
    </section>
  );
}
