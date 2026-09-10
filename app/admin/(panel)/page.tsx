import Link from "next/link";
import PageTitle from "@/components/admin/PageTitle";
import { getDashboardStats, getRecentImports } from "@/lib/admin-queries";
import { formatKM } from "@/lib/money";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function Stat({
  label,
  value,
  hint,
  tone = "normal",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "normal" | "warn";
}) {
  return (
    <div className="card p-5">
      <span className="block text-[11px] font-medium tracking-[0.14em] text-ink-3 uppercase">
        {label}
      </span>
      <span
        className={`mt-2 block text-2xl font-semibold ${
          tone === "warn" && value !== "0" ? "text-warn" : "text-ink"
        }`}
      >
        {value}
      </span>
      {hint ? <span className="mt-1 block text-xs text-ink-3">{hint}</span> : null}
    </div>
  );
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_LABEL: Record<string, string> = {
  running: "U toku",
  success: "Uspješno",
  failed: "Neuspješno",
};

export default async function DashboardPage() {
  const [user, stats, imports] = await Promise.all([
    getSession(),
    getDashboardStats(),
    getRecentImports(5),
  ]);

  const margin =
    stats.stockValueBam > 0
      ? Math.round(
          ((stats.stockValueBam - stats.stockCostBam) / stats.stockValueBam) *
            100,
        )
      : 0;

  const todo = [
    stats.productsNoCategory > 0
      ? {
          label: `${stats.productsNoCategory} proizvoda bez kategorije`,
          href: "/admin/proizvodi?filter=bez-kategorije",
        }
      : null,
    stats.productsNoImage > 0
      ? {
          label: `${stats.productsNoImage} proizvoda bez slike`,
          href: "/admin/proizvodi?filter=bez-slike",
        }
      : null,
    stats.productsUntranslated > 0
      ? {
          label: `${stats.productsUntranslated} proizvoda čeka prevod`,
          href: "/admin/proizvodi?filter=neprevedeno",
        }
      : null,
    stats.productsDraft > 0
      ? {
          label: `${stats.productsDraft} proizvoda u statusu skice`,
          href: "/admin/proizvodi?status=draft",
        }
      : null,
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <div className="p-6 lg:p-10">
      <PageTitle
        title={`Dobrodošli, ${user?.name || user?.email || ""}`}
        description="Kratak pregled kataloga i posljednjih uvoza."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Proizvodi"
          value={String(stats.productsTotal)}
          hint={`${stats.productsActive} aktivnih · ${stats.productsDraft} skica`}
        />
        <Stat
          label="Dobavljači"
          value={String(stats.suppliersActive)}
          hint={`od ukupno ${stats.suppliersTotal}`}
        />
        <Stat
          label="Vrijednost zaliha"
          value={formatKM(stats.stockValueBam)}
          hint={`nabavno ${formatKM(stats.stockCostBam)} · marža ${margin}%`}
        />
        <Stat
          label="Nema na stanju"
          value={String(stats.productsOutOfStock)}
          hint={`${stats.stockUnits} komada ukupno`}
          tone="warn"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ------------------------------------------------ posljednji uvozi */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Posljednji uvozi</h2>
            <Link
              href="/admin/uvoz"
              className="text-xs text-brand hover:underline"
            >
              Svi uvozi
            </Link>
          </div>

          {imports.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-ink-2">Još nije pokrenut nijedan uvoz.</p>
              <Link href="/admin/dobavljaci/novi" className="btn-outline btn-sm mt-4">
                Dodaj prvog dobavljača
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] tracking-wide text-ink-3 uppercase">
                    <th className="px-5 py-2.5 font-medium">Dobavljač</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Rezultat</th>
                    <th className="px-5 py-2.5 font-medium">Pokrenuto</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.map((run) => (
                    <tr key={run.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-3 text-ink">
                        {run.supplier_name || "—"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`chip ${
                            run.status === "success"
                              ? "bg-ok/10 text-ok"
                              : run.status === "failed"
                                ? "bg-sale/10 text-sale"
                                : "bg-brand-soft text-brand"
                          }`}
                        >
                          {STATUS_LABEL[run.status] ?? run.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-ink-2">
                        +{run.created_count} novih · {run.updated_count} izmjena
                        {run.failed_count > 0 ? (
                          <span className="text-sale">
                            {" "}
                            · {run.failed_count} greška
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 text-ink-3">
                        {formatDateTime(run.started_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------- sta uraditi */}
        <div className="card">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Traži pažnju</h2>
          </div>

          {todo.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-2">
              Sve je uredno.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {todo.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block px-5 py-3 text-sm text-ink-2 transition-colors hover:bg-brand-soft hover:text-brand"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
