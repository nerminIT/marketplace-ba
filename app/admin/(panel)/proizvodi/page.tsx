import Image from "next/image";
import Link from "next/link";
import PageTitle from "@/components/admin/PageTitle";
import Pagination from "@/components/Pagination";
import ProductStatusButton from "@/components/admin/ProductStatusButton";
import { requireUser } from "@/lib/auth";
import { listAdminProducts, type ProductQuery } from "@/lib/admin-queries";
import { formatKM } from "@/lib/money";
import { PROIZVOD, pluralize } from "@/lib/plural";

export const dynamic = "force-dynamic";

export const metadata = { title: "Proizvodi" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value || undefined;
}

const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  active: { label: "Aktivan", cls: "bg-ok/10 text-ok" },
  draft: { label: "Skica", cls: "bg-warn/10 text-warn" },
  archived: { label: "Arhiviran", cls: "bg-line text-ink-3" },
};

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Svi" },
  { value: "bez-kategorije", label: "Bez kategorije" },
  { value: "bez-slike", label: "Bez slike" },
  { value: "neprevedeno", label: "Čeka prevod" },
  { value: "nema-zalihe", label: "Nema na stanju" },
];

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireUser("products");

  const sp = await searchParams;
  const q = one(sp.q);
  const status = one(sp.status);
  const filter = one(sp.filter) as ProductQuery["filter"];
  const page = Number(one(sp.page) || 1) || 1;

  const { items, total, pages, page: current } = await listAdminProducts({
    q,
    status,
    filter,
    page,
  });

  const baseParams = { q, status, filter };

  return (
    <div className="p-6 lg:p-10">
      <PageTitle
        title="Proizvodi"
        description={`${pluralize(total, ...PROIZVOD)} u katalogu.`}
      />

      {/* --------------------------------------------------------- filteri */}
      <form className="mb-6 flex flex-wrap items-end gap-3" action="/admin/proizvodi">
        <div>
          <label htmlFor="q" className="label">
            Pretraga
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ""}
            placeholder="naziv, SKU, EAN..."
            className="field w-56"
          />
        </div>

        <div>
          <label htmlFor="status" className="label">
            Status
          </label>
          <select id="status" name="status" defaultValue={status ?? ""} className="field w-40">
            <option value="">Svi statusi</option>
            <option value="active">Aktivan</option>
            <option value="draft">Skica</option>
            <option value="archived">Arhiviran</option>
          </select>
        </div>

        <div>
          <label htmlFor="filter" className="label">
            Traži pažnju
          </label>
          <select id="filter" name="filter" defaultValue={filter ?? ""} className="field w-48">
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn-outline">
          Primijeni
        </button>

        {q || status || filter ? (
          <Link href="/admin/proizvodi" className="btn-ghost">
            Očisti
          </Link>
        ) : null}
      </form>

      {items.length === 0 ? (
        <div className="card px-6 py-20 text-center">
          <p className="text-sm text-ink-2">
            Nema proizvoda za ovaj izbor. Uvezite ih od dobavljača ili očistite
            filtere.
          </p>
          <Link href="/admin/dobavljaci" className="btn-outline mt-5">
            Otvori dobavljače
          </Link>
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] tracking-wide text-ink-3 uppercase">
                  <th className="px-5 py-3 font-medium">Proizvod</th>
                  <th className="px-3 py-3 font-medium">Kategorija</th>
                  <th className="px-3 py-3 font-medium">Nabavno</th>
                  <th className="px-3 py-3 font-medium">Prodajno</th>
                  <th className="px-3 py-3 font-medium">Marža</th>
                  <th className="px-3 py-3 font-medium">Zaliha</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((product) => {
                  const cost = Number(product.cost_bam);
                  const price = Number(product.price_bam);
                  const marginPct =
                    price > 0 ? Math.round(((price - cost) / price) * 100) : 0;
                  const chip = STATUS_CHIP[product.status] ?? {
                    label: product.status,
                    cls: "bg-line text-ink-2",
                  };

                  return (
                    <tr key={product.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden border border-line bg-ground">
                            {product.image_url ? (
                              <Image
                                src={product.image_url}
                                alt=""
                                fill
                                sizes="40px"
                                className="object-contain p-1"
                              />
                            ) : null}
                          </div>

                          <div className="min-w-0">
                            <Link
                              href={`/admin/proizvodi/${product.id}`}
                              className="block truncate font-medium text-ink hover:text-brand"
                            >
                              {product.name}
                            </Link>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
                              {product.supplier_name ? (
                                <span>{product.supplier_name}</span>
                              ) : (
                                <span>ručni unos</span>
                              )}
                              {product.price_locked ? (
                                <span className="chip bg-warn/10 text-warn">
                                  cijena
                                </span>
                              ) : null}
                              {product.content_locked ? (
                                <span className="chip bg-warn/10 text-warn">
                                  tekst
                                </span>
                              ) : null}
                              {product.translation_status === "pending" ? (
                                <span className="chip bg-brand-soft text-brand">
                                  neprevedeno
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-ink-2">
                        {product.category_name ?? (
                          <span className="text-warn">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-ink-3">{formatKM(cost)}</td>
                      <td className="px-3 py-3 font-medium text-ink">
                        {formatKM(price)}
                      </td>
                      <td
                        className={`px-3 py-3 ${marginPct < 10 ? "text-sale" : "text-ok"}`}
                      >
                        {marginPct}%
                      </td>
                      <td className="px-3 py-3 text-ink-2">{product.stock}</td>
                      <td className="px-3 py-3">
                        <span className={`chip ${chip.cls}`}>{chip.label}</span>
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-3">
                          <ProductStatusButton
                            id={product.id}
                            status={product.status}
                          />
                          <Link
                            href={`/admin/proizvodi/${product.id}`}
                            className="text-xs text-brand hover:underline"
                          >
                            Uredi
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={current}
            pages={pages}
            basePath="/admin/proizvodi"
            baseParams={baseParams}
          />
        </>
      )}
    </div>
  );
}
