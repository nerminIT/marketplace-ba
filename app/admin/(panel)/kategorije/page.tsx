import Link from "next/link";
import PageTitle from "@/components/admin/PageTitle";
import CategoryForm from "@/components/admin/CategoryForm";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { listCategoriesFlat } from "@/lib/admin-queries";
import { PROIZVOD, pluralize } from "@/lib/plural";

export const dynamic = "force-dynamic";

export const metadata = { title: "Kategorije" };

type Row = {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  sort_order: number;
  active: boolean;
  show_in_menu: boolean;
  show_on_home: boolean;
  product_count: number;
};

export default async function CategoriesPage() {
  await requireUser("categories");

  const [rows, flat] = await Promise.all([
    query<Row>(
      `SELECT c.id, c.name, c.slug, c.parent_id, c.sort_order, c.active,
              c.show_in_menu, c.show_on_home,
              (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id)::int
                AS product_count
         FROM categories c
        ORDER BY c.sort_order, c.name`,
    ),
    listCategoriesFlat(),
  ]);

  // Poredaj u stablo: glavna kategorija pa njene podkategorije odmah ispod.
  const byParent = new Map<number | null, Row[]>();
  for (const row of rows) {
    const key = row.parent_id;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(row);
  }

  const ordered: { row: Row; depth: number }[] = [];
  const walk = (parent: number | null, depth: number) => {
    for (const row of byParent.get(parent) ?? []) {
      ordered.push({ row, depth });
      if (depth < 3) walk(row.id, depth + 1);
    }
  };
  walk(null, 0);

  return (
    <div className="p-6 lg:p-10">
      <PageTitle
        title="Kategorije"
        description="Struktura shopa. Kategorija prikazuje i proizvode svojih podkategorija."
      />

      <div className="card mb-6 p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">Nova kategorija</h2>
        <CategoryForm
          compact
          parents={flat}
          values={{
            name: "",
            slug: "",
            parent_id: null,
            description: "",
            image_url: "",
            sort_order: 0,
            active: true,
            show_in_menu: true,
            show_on_home: false,
            seo_title: "",
            seo_description: "",
          }}
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] tracking-wide text-ink-3 uppercase">
              <th className="px-5 py-3 font-medium">Naziv</th>
              <th className="px-3 py-3 font-medium">Adresa</th>
              <th className="px-3 py-3 font-medium">Proizvoda</th>
              <th className="px-3 py-3 font-medium">Prikaz</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {ordered.map(({ row, depth }) => (
              <tr key={row.id} className="border-b border-line last:border-0">
                <td className="px-5 py-3">
                  <span style={{ paddingLeft: depth * 18 }} className="inline-block">
                    <Link
                      href={`/admin/kategorije/${row.id}`}
                      className={`hover:text-brand ${
                        depth === 0 ? "font-medium text-ink" : "text-ink-2"
                      }`}
                    >
                      {row.name}
                    </Link>
                    {!row.active ? (
                      <span className="chip ml-2 bg-line text-ink-3">skrivena</span>
                    ) : null}
                  </span>
                </td>

                <td className="px-3 py-3 font-mono text-xs text-ink-3">
                  /{row.slug}
                </td>

                <td className="px-3 py-3 text-ink-2">
                  {row.product_count > 0
                    ? pluralize(row.product_count, ...PROIZVOD)
                    : "—"}
                </td>

                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {row.show_in_menu ? (
                      <span className="chip bg-brand-soft text-brand">meni</span>
                    ) : null}
                    {row.show_on_home ? (
                      <span className="chip bg-ok/10 text-ok">početna</span>
                    ) : null}
                  </div>
                </td>

                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/admin/kategorije/${row.id}`}
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
    </div>
  );
}
