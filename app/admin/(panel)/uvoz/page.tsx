import Link from "next/link";
import PageTitle from "@/components/admin/PageTitle";
import { requireUser } from "@/lib/auth";
import { getRecentImports } from "@/lib/admin-queries";
import { listSuppliers } from "@/lib/suppliers";
import { datumVrijeme } from "@/lib/datum";

export const dynamic = "force-dynamic";

export const metadata = { title: "Uvoz proizvoda" };

const STATUS: Record<string, { label: string; cls: string }> = {
  running: { label: "U toku", cls: "bg-brand-soft text-brand" },
  success: { label: "Uspješno", cls: "bg-ok/10 text-ok" },
  failed: { label: "Neuspješno", cls: "bg-sale/10 text-sale" },
};

function formatDateTime(value: string | null): string {
  return datumVrijeme(value);
}

function duration(start: string, end: string | null): string {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.round(ms / 60_000)} min`;
}

export default async function ImportsPage() {
  await requireUser("suppliers");

  const [runs, suppliers] = await Promise.all([
    getRecentImports(50),
    listSuppliers(),
  ]);

  const ready = suppliers.filter((s) => s.feed_url && s.active);

  return (
    <div className="p-6 lg:p-10">
      <PageTitle
        title="Uvoz proizvoda"
        description="Historija svih uvoza. Uvoz se pokreće sa stranice dobavljača."
      />

      {/* ------------------------------------------- brzi pristup dobavljačima */}
      {ready.length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {ready.map((supplier) => (
            <Link
              key={supplier.id}
              href={`/admin/dobavljaci/${supplier.id}`}
              className="btn-outline btn-sm"
            >
              Uvoz: {supplier.name}
            </Link>
          ))}
        </div>
      ) : null}

      {runs.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-20 text-center">
          <h2 className="text-base font-medium text-ink">Još nema uvoza</h2>
          <p className="mt-2 max-w-md text-sm text-ink-2">
            Kad podesite dobavljača i pokrenete prvi uvoz, ovdje će stajati
            zapis svakog pokretanja sa brojem dodanih i osvježenih proizvoda.
          </p>
          <Link href="/admin/dobavljaci" className="btn-primary mt-6">
            Otvori dobavljače
          </Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] tracking-wide text-ink-3 uppercase">
                <th className="px-5 py-3 font-medium">Dobavljač</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Redova</th>
                <th className="px-3 py-3 font-medium">Novo</th>
                <th className="px-3 py-3 font-medium">Osvježeno</th>
                <th className="px-3 py-3 font-medium">Greške</th>
                <th className="px-3 py-3 font-medium">Trajanje</th>
                <th className="px-5 py-3 font-medium">Pokrenuto</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const status = STATUS[run.status] ?? {
                  label: run.status,
                  cls: "bg-line text-ink-2",
                };

                return (
                  <tr key={run.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/uvoz/${run.id}`}
                        className="font-medium text-ink hover:text-brand"
                      >
                        {run.supplier_name || "—"}
                      </Link>
                      {run.message ? (
                        <div className="mt-0.5 text-xs text-ink-3">{run.message}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`chip ${status.cls}`}>{status.label}</span>
                    </td>
                    <td className="px-3 py-3 text-ink-2">{run.rows_total}</td>
                    <td className="px-3 py-3 text-ok">+{run.created_count}</td>
                    <td className="px-3 py-3 text-ink-2">{run.updated_count}</td>
                    <td className="px-3 py-3">
                      {run.failed_count > 0 ? (
                        <span className="text-sale">{run.failed_count}</span>
                      ) : (
                        <span className="text-ink-3">0</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-ink-3">
                      {duration(run.started_at, run.finished_at)}
                    </td>
                    <td className="px-5 py-3 text-ink-3">
                      {formatDateTime(run.started_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
