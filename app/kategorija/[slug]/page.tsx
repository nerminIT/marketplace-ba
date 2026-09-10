import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ProductBrowser from "@/components/ProductBrowser";
import {
  getCategoryBySlug,
  getCategoryWithDescendants,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value || undefined;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) return { title: "Kategorija nije pronađena" };

  return {
    title: category.seo_title || category.name,
    description:
      category.seo_description ||
      category.description ||
      `Ponuda iz kategorije ${category.name}.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) notFound();

  const sp = await searchParams;
  const sort = one(sp.sort);
  const page = Number(one(sp.page) || 1) || 1;

  // Kategorija prikazuje i proizvode svojih podkategorija.
  const categoryIds = await getCategoryWithDescendants(category.id);

  const crumbs = [
    { label: "Početna", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: category.name },
  ];

  return (
    <>
      <PageHeader
        title={category.name}
        subtitle={category.description}
        crumbs={crumbs}
      />

      <ProductBrowser
        filters={{ categoryIds, sort, page }}
        basePath={`/kategorija/${category.slug}`}
        baseParams={{ sort }}
        activeCategorySlug={category.slug}
        emptyTitle="U ovoj kategoriji još nema proizvoda"
        emptyDescription="Uskoro dodajemo nove artikle. Pogledajte ostatak ponude."
      />
    </>
  );
}
