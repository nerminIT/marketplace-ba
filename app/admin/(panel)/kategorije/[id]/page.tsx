import Link from "next/link";
import { notFound } from "next/navigation";
import PageTitle from "@/components/admin/PageTitle";
import CategoryForm from "@/components/admin/CategoryForm";
import DeleteCategoryButton from "@/components/admin/DeleteCategoryButton";
import { requireUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { listCategoriesFlat } from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

type Category = {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  active: boolean;
  show_in_menu: boolean;
  show_on_home: boolean;
  seo_title: string | null;
  seo_description: string | null;
  product_count: number;
};

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const row = await queryOne<{ name: string }>(
    `SELECT name FROM categories WHERE id = $1`,
    [Number(id)],
  );
  return { title: row?.name ?? "Kategorija" };
}

export default async function EditCategoryPage({ params }: { params: Params }) {
  await requireUser("categories");

  const { id } = await params;
  const categoryId = Number(id);
  if (!Number.isInteger(categoryId)) notFound();

  const category = await queryOne<Category>(
    `SELECT c.*,
            (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id)::int
              AS product_count
       FROM categories c WHERE c.id = $1`,
    [categoryId],
  );

  if (!category) notFound();

  const flat = await listCategoriesFlat();

  // Kategorija ne smije biti nadređena sama sebi.
  const parents = flat.filter((c) => c.id !== category.id);

  return (
    <div className="p-6 lg:p-10">
      <PageTitle
        title={category.name}
        description={`/kategorija/${category.slug}`}
      >
        <Link href="/admin/kategorije" className="btn-ghost btn-sm">
          Nazad
        </Link>
        <DeleteCategoryButton
          id={category.id}
          productCount={category.product_count}
        />
      </PageTitle>

      <div className="card max-w-3xl p-6">
        <CategoryForm
          parents={parents}
          values={{
            id: category.id,
            name: category.name,
            slug: category.slug,
            parent_id: category.parent_id,
            description: category.description ?? "",
            image_url: category.image_url ?? "",
            sort_order: category.sort_order,
            active: category.active,
            show_in_menu: category.show_in_menu,
            show_on_home: category.show_on_home,
            seo_title: category.seo_title ?? "",
            seo_description: category.seo_description ?? "",
          }}
        />
      </div>
    </div>
  );
}
