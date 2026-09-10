import Link from "next/link";
import type { CategoryNode } from "@/lib/queries";

/**
 * Bočna lista kategorija. Sve su obični linkovi - filter živi u URL-u,
 * pa se stranica može podijeliti, označiti i indeksirati.
 */
export default function ShopSidebar({
  categories,
  activeSlug,
  onSale,
}: {
  categories: CategoryNode[];
  activeSlug?: string;
  onSale?: boolean;
}) {
  const linkClass = (active: boolean) =>
    `block py-1.5 text-sm transition-colors ${
      active ? "font-medium text-brand" : "text-ink-2 hover:text-brand"
    }`;

  return (
    <aside className="lg:sticky lg:top-28">
      <h2 className="mb-4 text-[11px] font-semibold tracking-[0.16em] text-ink uppercase">
        Kategorije
      </h2>

      <nav className="border-t border-line pt-3">
        <Link href="/shop" className={linkClass(!activeSlug && !onSale)}>
          Svi proizvodi
        </Link>

        {categories.map((cat) => (
          <div key={cat.id}>
            <Link
              href={`/kategorija/${cat.slug}`}
              className={linkClass(activeSlug === cat.slug)}
            >
              {cat.name}
              <span className="ml-1.5 text-xs text-ink-3">
                ({cat.product_count})
              </span>
            </Link>

            {cat.children.length > 0 ? (
              <div className="mb-1 ml-3 border-l border-line pl-3">
                {cat.children.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/kategorija/${sub.slug}`}
                    className={linkClass(activeSlug === sub.slug)}
                  >
                    {sub.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </nav>

      <h2 className="mt-8 mb-4 text-[11px] font-semibold tracking-[0.16em] text-ink uppercase">
        Izdvojeno
      </h2>
      <nav className="border-t border-line pt-3">
        <Link href="/shop?akcija=1" className={linkClass(Boolean(onSale))}>
          Na akciji
        </Link>
        <Link href="/shop?sort=novo" className={linkClass(false)}>
          Novo u ponudi
        </Link>
      </nav>
    </aside>
  );
}
