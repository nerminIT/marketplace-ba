import Link from "next/link";
import { notFound } from "next/navigation";
import PageTitle from "@/components/admin/PageTitle";
import ProductForm from "@/components/admin/ProductForm";
import { requireUser } from "@/lib/auth";
import {
  getAdminProduct,
  getAdminProductImages,
  listCategoriesFlat,
} from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const product = await getAdminProduct(Number(id));
  return { title: product?.name ?? "Proizvod" };
}

export default async function EditProductPage({ params }: { params: Params }) {
  await requireUser("products");

  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) notFound();

  const product = await getAdminProduct(productId);
  if (!product) notFound();

  const [images, categories] = await Promise.all([
    getAdminProductImages(productId),
    listCategoriesFlat(),
  ]);

  return (
    <div className="p-6 lg:p-10">
      <PageTitle title={product.name} description={product.sku ?? undefined}>
        <Link href="/admin/proizvodi" className="btn-ghost btn-sm">
          Nazad
        </Link>
        {product.status === "active" ? (
          <Link
            href={`/proizvod/${product.slug}`}
            target="_blank"
            rel="noreferrer"
            className="btn-outline btn-sm"
          >
            Vidi na shopu
          </Link>
        ) : null}
      </PageTitle>

      <ProductForm
        categories={categories}
        values={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          sku: product.sku ?? "",
          ean: product.ean ?? "",
          brand: product.brand ?? "",
          short_description: product.short_description ?? "",
          description: product.description ?? "",
          category_id: product.category_id,
          cost_bam: Number(product.cost_bam),
          cost_amount: Number(product.cost_amount),
          cost_currency: product.cost_currency,
          price_bam: Number(product.price_bam),
          compare_at_bam:
            product.compare_at_bam === null ? null : Number(product.compare_at_bam),
          stock: product.stock,
          status: product.status,
          price_locked: product.price_locked,
          content_locked: product.content_locked,
          is_featured: product.is_featured,
          is_new: product.is_new,
          seo_title: product.seo_title ?? "",
          seo_description: product.seo_description ?? "",
          images: images.map((image) => image.url),
          name_source: product.name_source,
          supplier_name: product.supplier_name,
          translation_status: product.translation_status,
        }}
      />
    </div>
  );
}
