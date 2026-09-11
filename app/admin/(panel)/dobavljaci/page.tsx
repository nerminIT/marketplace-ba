import Link from "next/link";
import PageTitle from "@/components/admin/PageTitle";
import { requireUser } from "@/lib/auth";
import { listSuppliers } from "@/lib/suppliers";
import { formatKM } from "@/lib/money";
import { datumVrijeme } from "@/lib/datum";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dobavljači" };

function formatDateTime(value: string | null): string {
  return value ? datumVrijeme(value) : "nikad";
}

export default async function SuppliersPage() {
  await requireUser("suppliers");
  const suppliers = await listSuppliers();

  return (
    <div className="p-6 lg:p-10">
      <PageTitle
        title="Dobavljači"
        description="Vanjski izvori proizvoda. Za svakog se posebno određuje marža i način zaokruživanja cijene."
        actionHref="/admin/dobavljaci/novi"
        actionLabel="Novi dobavljač"
      />

      {suppliers.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-20 text-center">
          <h2 className="text-base font-medium text-ink">
            Još nema nijednog dobavljača
          </h2>
          <p className="mt-2 max-w-md text-sm text-ink-2">
            Dodajte dobavljača, upišite adresu njegovog CSV feeda i povežite
            kolone sa našim poljima. Cijene se zatim same preračunavaju u KM po
            marži koju odredite.
          </p>
          <Link href="/admin/dobavljaci/novi" className="btn-primary mt-6">
            Dodaj prvog dobavljača
          </Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] tracking-wide text-ink-3 uppercase">
                <th className="px-5 py-3 font-medium">Dobavljač</th>
                <th className="px-3 py-3 font-medium">Valuta</th>
                <th className="px-3 py-3 font-medium">Marža</th>
                <th className="px-3 py-3 font-medium">Proizvoda</th>
                <th className="px-3 py-3 font-medium">Zadnji uvoz</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/dobavljaci/${supplier.id}`}
                      className="font-medium text-ink hover:text-brand"
                    >
                      {supplier.name}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span
                        className={`chip ${
                          supplier.active
                            ? "bg-ok/10 text-ok"
                            : "bg-line text-ink-3"
                        }`}
                      >
                        {supplier.active ? "Aktivan" : "Pauziran"}
                      </span>
                      {supplier.default_category_name ? (
                        <span className="text-xs text-ink-3">
                          → {supplier.default_category_name}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  <td className="px-3 py-4 text-ink-2">{supplier.currency}</td>

                  <td className="px-3 py-4 text-ink-2">
                    {Number(supplier.margin_percent)}%
                    {Number(supplier.margin_fixed_bam) > 0 ? (
                      <span className="text-ink-3">
                        {" "}
                        + {formatKM(supplier.margin_fixed_bam)}
                      </span>
                    ) : null}
                  </td>

                  <td className="px-3 py-4 text-ink-2">{supplier.product_count}</td>

                  <td className="px-3 py-4">
                    <div className="text-ink-2">
                      {formatDateTime(supplier.last_sync_at)}
                    </div>
                    {supplier.last_sync_message ? (
                      <div
                        className={`mt-0.5 text-xs ${
                          supplier.last_sync_status === "failed"
                            ? "text-sale"
                            : "text-ink-3"
                        }`}
                      >
                        {supplier.last_sync_message}
                      </div>
                    ) : null}
                  </td>

                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/dobavljaci/${supplier.id}`}
                      className="text-xs text-brand hover:underline"
                    >
                      Uredi
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
