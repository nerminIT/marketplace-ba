import "server-only";
import { query, queryOne } from "./db";

/** Upiti koje koristi samo CMS. Nikad se ne uvoze iz javnog dijela sajta. */

export type DashboardStats = {
  productsTotal: number;
  productsActive: number;
  productsDraft: number;
  productsNoCategory: number;
  productsNoImage: number;
  productsOutOfStock: number;
  productsUntranslated: number;
  suppliersTotal: number;
  suppliersActive: number;
  categoriesTotal: number;
  /** Prodajna vrijednost zaliha. */
  stockValueBam: number;
  /** Nabavna vrijednost zaliha. */
  stockCostBam: number;
  stockUnits: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const row = await queryOne<DashboardStats>(
    `SELECT
       (SELECT COUNT(*) FROM products)::int                                        AS "productsTotal",
       (SELECT COUNT(*) FROM products WHERE status = 'active')::int                AS "productsActive",
       (SELECT COUNT(*) FROM products WHERE status = 'draft')::int                 AS "productsDraft",
       (SELECT COUNT(*) FROM products WHERE category_id IS NULL)::int              AS "productsNoCategory",
       (SELECT COUNT(*) FROM products p
         WHERE NOT EXISTS (SELECT 1 FROM product_images i
                            WHERE i.product_id = p.id))::int                       AS "productsNoImage",
       (SELECT COUNT(*) FROM products WHERE stock <= 0)::int                       AS "productsOutOfStock",
       (SELECT COUNT(*) FROM products WHERE translation_status = 'pending')::int   AS "productsUntranslated",
       (SELECT COUNT(*) FROM suppliers)::int                                       AS "suppliersTotal",
       (SELECT COUNT(*) FROM suppliers WHERE active)::int                          AS "suppliersActive",
       (SELECT COUNT(*) FROM categories)::int                                      AS "categoriesTotal",
       COALESCE((SELECT SUM(price_bam * GREATEST(stock, 0)) FROM products), 0)     AS "stockValueBam",
       COALESCE((SELECT SUM(cost_bam  * GREATEST(stock, 0)) FROM products), 0)     AS "stockCostBam",
       COALESCE((SELECT SUM(GREATEST(stock, 0)) FROM products), 0)::int            AS "stockUnits"`,
  );

  return (
    row ?? {
      productsTotal: 0,
      productsActive: 0,
      productsDraft: 0,
      productsNoCategory: 0,
      productsNoImage: 0,
      productsOutOfStock: 0,
      productsUntranslated: 0,
      suppliersTotal: 0,
      suppliersActive: 0,
      categoriesTotal: 0,
      stockValueBam: 0,
      stockCostBam: 0,
      stockUnits: 0,
    }
  );
}

export type FlatCategory = { id: number; name: string; depth: number };

/**
 * Sve kategorije kao ravna lista, sa uvlakom koja pokazuje nivo -
 * za <select> polja gdje stablo nema smisla.
 */
export async function listCategoriesFlat(): Promise<FlatCategory[]> {
  const rows = await query<{
    id: number;
    name: string;
    parent_id: number | null;
    sort_order: number;
  }>(`SELECT id, name, parent_id, sort_order FROM categories ORDER BY sort_order, name`);

  const byParent = new Map<number | null, typeof rows>();
  for (const row of rows) {
    const key = row.parent_id;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(row);
  }

  const out: FlatCategory[] = [];

  const walk = (parent: number | null, depth: number) => {
    for (const row of byParent.get(parent) ?? []) {
      out.push({
        id: row.id,
        name: `${"— ".repeat(depth)}${row.name}`,
        depth,
      });
      if (depth < 4) walk(row.id, depth + 1);
    }
  };

  walk(null, 0);
  return out;
}

/* ==========================================================================
   Proizvodi u CMS-u
   ========================================================================== */

export type AdminProductRow = {
  id: number;
  slug: string;
  name: string;
  sku: string | null;
  status: string;
  stock: number;
  cost_bam: number;
  price_bam: number;
  compare_at_bam: number | null;
  price_locked: boolean;
  content_locked: boolean;
  translation_status: string;
  is_featured: boolean;
  category_name: string | null;
  supplier_name: string | null;
  image_url: string | null;
};

export type ProductQuery = {
  q?: string;
  status?: string;
  categoryId?: number;
  supplierId?: number;
  /** Gotovi filteri sa nadzorne ploče. */
  filter?: "bez-kategorije" | "bez-slike" | "neprevedeno" | "nema-zalihe";
  page?: number;
  perPage?: number;
};

export async function listAdminProducts(params: ProductQuery = {}): Promise<{
  items: AdminProductRow[];
  total: number;
  page: number;
  pages: number;
}> {
  const perPage = Math.min(Math.max(params.perPage ?? 30, 1), 100);
  const where: string[] = ["TRUE"];
  const values: unknown[] = [];

  if (params.q) {
    values.push(`%${params.q}%`);
    const i = values.length;
    where.push(
      `(p.name ILIKE $${i} OR p.sku ILIKE $${i} OR p.external_id ILIKE $${i} OR p.ean ILIKE $${i})`,
    );
  }

  if (params.status) {
    values.push(params.status);
    where.push(`p.status = $${values.length}`);
  }

  if (params.categoryId) {
    values.push(params.categoryId);
    where.push(`p.category_id = $${values.length}`);
  }

  if (params.supplierId) {
    values.push(params.supplierId);
    where.push(`p.supplier_id = $${values.length}`);
  }

  switch (params.filter) {
    case "bez-kategorije":
      where.push("p.category_id IS NULL");
      break;
    case "bez-slike":
      where.push(
        "NOT EXISTS (SELECT 1 FROM product_images i WHERE i.product_id = p.id)",
      );
      break;
    case "neprevedeno":
      where.push("p.translation_status = 'pending'");
      break;
    case "nema-zalihe":
      where.push("p.stock <= 0");
      break;
  }

  const whereSql = where.join(" AND ");

  const countRow = await queryOne<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM products p WHERE ${whereSql}`,
    values,
  );
  const total = countRow?.total ?? 0;
  const pages = Math.max(Math.ceil(total / perPage), 1);
  const page = Math.min(Math.max(params.page ?? 1, 1), pages);

  const items = await query<AdminProductRow>(
    `SELECT p.id, p.slug, p.name, p.sku, p.status, p.stock,
            p.cost_bam, p.price_bam, p.compare_at_bam,
            p.price_locked, p.content_locked, p.translation_status, p.is_featured,
            c.name AS category_name,
            s.name AS supplier_name,
            (SELECT i.url FROM product_images i
              WHERE i.product_id = p.id ORDER BY i.sort_order, i.id LIMIT 1)
              AS image_url
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN suppliers  s ON s.id = p.supplier_id
      WHERE ${whereSql}
      ORDER BY p.updated_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, perPage, (page - 1) * perPage],
  );

  return { items, total, page, pages };
}

export type AdminProduct = {
  id: number;
  supplier_id: number | null;
  supplier_name: string | null;
  external_id: string | null;
  sku: string | null;
  ean: string | null;
  brand: string | null;
  slug: string;
  name: string;
  name_source: string | null;
  short_description: string | null;
  description: string | null;
  description_source: string | null;
  category_id: number | null;
  cost_amount: number;
  cost_currency: string;
  cost_bam: number;
  price_bam: number;
  compare_at_bam: number | null;
  stock: number;
  status: string;
  price_locked: boolean;
  content_locked: boolean;
  translation_status: string;
  is_featured: boolean;
  is_new: boolean;
  weight_kg: number | null;
  source_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

export async function getAdminProduct(id: number): Promise<AdminProduct | null> {
  return queryOne<AdminProduct>(
    `SELECT p.*, s.name AS supplier_name
       FROM products p
       LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.id = $1`,
    [id],
  );
}

export async function getAdminProductImages(
  productId: number,
): Promise<{ id: number; url: string; sort_order: number }[]> {
  return query(
    `SELECT id, url, sort_order FROM product_images
      WHERE product_id = $1 ORDER BY sort_order, id`,
    [productId],
  );
}

export type RecentImport = {
  id: number;
  supplier_id: number | null;
  supplier_name: string | null;
  status: string;
  rows_total: number;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  failed_count: number;
  message: string | null;
  started_at: string;
  finished_at: string | null;
};

export async function getRecentImports(limit = 5): Promise<RecentImport[]> {
  return query<RecentImport>(
    `SELECT r.id, r.supplier_id, s.name AS supplier_name, r.status,
            r.rows_total, r.created_count, r.updated_count,
            r.skipped_count, r.failed_count, r.message,
            r.started_at, r.finished_at
       FROM import_runs r
       LEFT JOIN suppliers s ON s.id = r.supplier_id
      ORDER BY r.started_at DESC
      LIMIT $1`,
    [limit],
  );
}
