import type { Metadata } from "next";
import { Suspense } from "react";
import PageHeader from "@/components/PageHeader";
import ProductBrowser from "@/components/ProductBrowser";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop",
  description: "Kompletna ponuda proizvoda sa dostavom na kućnu adresu.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value || undefined;
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const q = one(params.q);
  const sort = one(params.sort);
  const onSale = one(params.akcija) === "1";
  const page = Number(one(params.page) || 1) || 1;

  const title = onSale ? "Artikli na akciji" : q ? "Rezultati pretrage" : "Shop";

  const subtitle = q
    ? `Prikazujemo rezultate za: ${q}`
    : onSale
      ? "Sniženi artikli iz cijele ponude, dok traju zalihe."
      : "Sve što nudimo, na jednom mjestu.";

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        crumbs={[{ label: "Početna", href: "/" }, { label: "Shop" }]}
      />

      {/* ShopToolbar koristi useSearchParams, pa mu treba Suspense granica. */}
      <Suspense fallback={<div className="py-24" />}>
        <ProductBrowser
          filters={{ q, sort, onSale, page }}
          basePath="/shop"
          baseParams={{
            q,
            sort,
            akcija: onSale ? "1" : undefined,
          }}
          emptyTitle={
            q ? `Nema rezultata za "${q}"` : "Nema proizvoda za ovaj izbor"
          }
        />
      </Suspense>
    </>
  );
}
