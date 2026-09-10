import Container from "./Container";
import ShopSidebar from "./ShopSidebar";
import ShopToolbar from "./ShopToolbar";
import ProductGrid from "./ProductGrid";
import Pagination from "./Pagination";
import EmptyState from "./EmptyState";
import { getMenuCategories, listProducts, type ProductFilters } from "@/lib/queries";
import { DEFAULT_SORT } from "@/lib/sort-options";
import { getSettings } from "@/lib/settings";

/**
 * Zajednički prikaz liste proizvoda - koriste ga i /shop i /kategorija/[slug].
 * Sav filter je u URL-u, pa je stranica dijeljiva i indeksabilna.
 */
export default async function ProductBrowser({
  filters,
  basePath,
  baseParams,
  activeCategorySlug,
  emptyTitle = "Nema proizvoda za ovaj izbor",
  emptyDescription = "Pokušajte sa drugom kategorijom ili obrišite pretragu.",
}: {
  filters: ProductFilters;
  basePath: string;
  baseParams: Record<string, string | undefined>;
  activeCategorySlug?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const settings = await getSettings();

  // Toolbar sam dodaje `sort`, pa mu se ostali filteri predaju bez njega.
  const sortlessParams = Object.fromEntries(
    Object.entries(baseParams).filter(([key]) => key !== "sort"),
  );

  const [categories, result] = await Promise.all([
    getMenuCategories(),
    listProducts({
      ...filters,
      hideOutOfStock: !settings.shop.showOutOfStock,
    }),
  ]);

  return (
    <Container>
      <div className="grid gap-10 py-12 lg:grid-cols-[220px_1fr] lg:gap-12 lg:py-16">
        <ShopSidebar
          categories={categories}
          activeSlug={activeCategorySlug}
          onSale={filters.onSale}
        />

        <div>
          <ShopToolbar
            total={result.total}
            sort={filters.sort ?? DEFAULT_SORT}
            basePath={basePath}
            params={sortlessParams}
          />

          {result.items.length === 0 ? (
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
              actionHref="/shop"
              actionLabel="Pogledaj sve proizvode"
            />
          ) : (
            <>
              <ProductGrid products={result.items} columns={3} />
              <Pagination
                page={result.page}
                pages={result.pages}
                basePath={basePath}
                baseParams={baseParams}
              />
            </>
          )}
        </div>
      </div>
    </Container>
  );
}
