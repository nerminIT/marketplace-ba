import { cache } from "react";
import { query as rawQuery } from "./db";
import type { QueryResultRow } from "pg";

/**
 * Upiti koje koristi javni dio sajta.
 * Sve je read-only i omotano u `cache` da se isti upit ne ponovi
 * vise puta u jednom renderu stranice.
 */

export type ProductCardData = {
  id: number;
  slug: string;
  name: string;
  price_bam: number;
  compare_at_bam: number | null;
  stock: number;
  is_new: boolean;
  category_name: string | null;
  category_slug: string | null;
  image_url: string | null;
};

export type CategoryNode = {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  parent_id: number | null;
  product_count: number;
  children: CategoryNode[];
};

/**
 * Prije nego se baza migrira (ili ako padne), javni sajt treba i dalje da
 * se otvori umjesto da baci 500. Zato svaki citalacki upit ide kroz `q`:
 * greska se zabiljezi u log, a stranica dobije praznu listu.
 */
async function q<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  try {
    return await rawQuery<T>(text, params);
  } catch (err) {
    console.error("[queries]", (err as Error).message);
    return [];
  }
}

const PRODUCT_CARD_FIELDS = `
  p.id, p.slug, p.name, p.price_bam, p.compare_at_bam, p.stock, p.is_new,
  c.name AS category_name, c.slug AS category_slug,
  (SELECT i.url FROM product_images i
    WHERE i.product_id = p.id
    ORDER BY i.sort_order, i.id
    LIMIT 1) AS image_url
`;

/** Sve aktivne kategorije, ugnijezdene u stablo (dva nivoa). */
export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  const rows = await q<{
    id: number;
    name: string;
    slug: string;
    image_url: string | null;
    parent_id: number | null;
    show_in_menu: boolean;
    product_count: number;
  }>(
    `SELECT c.id, c.name, c.slug, c.image_url, c.parent_id, c.show_in_menu,
            (SELECT COUNT(*) FROM products p
              WHERE p.category_id = c.id AND p.status = 'active') AS product_count
       FROM categories c
      WHERE c.active
      ORDER BY c.sort_order, c.name`,
  );

  const byId = new Map<number, CategoryNode>();
  for (const r of rows) {
    byId.set(r.id, {
      id: r.id,
      name: r.name,
      slug: r.slug,
      image_url: r.image_url,
      parent_id: r.parent_id,
      product_count: r.product_count,
      children: [],
    });
  }

  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
});

/** Kategorije koje se prikazuju u glavnom meniju. */
export const getMenuCategories = cache(async (): Promise<CategoryNode[]> => {
  const rows = await q<{ id: number }>(
    `SELECT id FROM categories WHERE active AND show_in_menu AND parent_id IS NULL`,
  );
  const allowed = new Set(rows.map((r) => r.id));
  const tree = await getCategoryTree();
  return tree.filter((c) => allowed.has(c.id));
});

/** Kategorije istaknute na pocetnoj stranici. */
export const getHomeCategories = cache(async (): Promise<CategoryNode[]> => {
  const rows = await q<{ id: number }>(
    `SELECT id FROM categories WHERE active AND show_on_home ORDER BY sort_order, name LIMIT 8`,
  );
  const allowed = rows.map((r) => r.id);
  const tree = await getCategoryTree();
  const flat = new Map<number, CategoryNode>();

  const walk = (nodes: CategoryNode[]) => {
    for (const n of nodes) {
      flat.set(n.id, n);
      walk(n.children);
    }
  };
  walk(tree);

  return allowed.map((id) => flat.get(id)).filter(Boolean) as CategoryNode[];
});

export const getFeaturedProducts = cache(
  async (limit = 8): Promise<ProductCardData[]> =>
    q<ProductCardData>(
      `SELECT ${PRODUCT_CARD_FIELDS}
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.status = 'active' AND p.is_featured
        ORDER BY p.updated_at DESC
        LIMIT $1`,
      [limit],
    ),
);

export const getNewProducts = cache(
  async (limit = 8): Promise<ProductCardData[]> =>
    q<ProductCardData>(
      `SELECT ${PRODUCT_CARD_FIELDS}
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.status = 'active'
        ORDER BY p.created_at DESC
        LIMIT $1`,
      [limit],
    ),
);

export const getBestSellers = cache(
  async (limit = 8): Promise<ProductCardData[]> =>
    q<ProductCardData>(
      `SELECT ${PRODUCT_CARD_FIELDS}
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.status = 'active'
        ORDER BY p.sold_count DESC, p.views DESC, p.created_at DESC
        LIMIT $1`,
      [limit],
    ),
);

export const getSaleProducts = cache(
  async (limit = 8): Promise<ProductCardData[]> =>
    q<ProductCardData>(
      `SELECT ${PRODUCT_CARD_FIELDS}
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.status = 'active'
          AND p.compare_at_bam IS NOT NULL
          AND p.compare_at_bam > p.price_bam
        ORDER BY (p.compare_at_bam - p.price_bam) / NULLIF(p.compare_at_bam, 0) DESC
        LIMIT $1`,
      [limit],
    ),
);

export type Banner = {
  id: number;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  button_text: string | null;
  placement: string;
};

export const getBanners = cache(
  async (placement: string): Promise<Banner[]> =>
    q<Banner>(
      `SELECT id, title, subtitle, image_url, link_url, button_text, placement
         FROM banners
        WHERE active AND placement = $1
        ORDER BY sort_order, id`,
      [placement],
    ),
);

export type PostCardData = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  author: string | null;
  published_at: string | null;
};

export const getLatestPosts = cache(
  async (limit = 3): Promise<PostCardData[]> =>
    q<PostCardData>(
      `SELECT id, slug, title, excerpt, cover_url, author, published_at
         FROM blog_posts
        WHERE published
        ORDER BY published_at DESC NULLS LAST, id DESC
        LIMIT $1`,
      [limit],
    ),
);

export type NavPage = { slug: string; title: string; nav_label: string | null };

export const getNavPages = cache(
  async (): Promise<NavPage[]> =>
    q<NavPage>(
      `SELECT slug, title, nav_label
         FROM pages
        WHERE published AND show_in_nav
        ORDER BY sort_order, title`,
    ),
);

export const getFooterPages = cache(
  async (): Promise<NavPage[]> =>
    q<NavPage>(
      `SELECT slug, title, nav_label
         FROM pages
        WHERE published
        ORDER BY sort_order, title`,
    ),
);

/* ==========================================================================
   Listanje proizvoda (shop i kategorije)
   ========================================================================== */

// Sortiranje po polju iz bijele liste - vrijednost iz URL-a nikad ne ulazi
// direktno u SQL, nego samo bira gotov izraz iz ove mape.
const ORDER_BY: Record<string, string> = {
  novo: "p.created_at DESC",
  popularno: "p.sold_count DESC, p.views DESC, p.created_at DESC",
  "cijena-rastuce": "p.price_bam ASC",
  "cijena-opadajuce": "p.price_bam DESC",
  naziv: "p.name ASC",
};

export type ProductFilters = {
  q?: string;
  categoryIds?: number[];
  sort?: string;
  page?: number;
  perPage?: number;
  onSale?: boolean;
  hideOutOfStock?: boolean;
};

export type ProductListResult = {
  items: ProductCardData[];
  total: number;
  page: number;
  pages: number;
};

export async function listProducts(
  filters: ProductFilters = {},
): Promise<ProductListResult> {
  const perPage = Math.min(Math.max(filters.perPage ?? 24, 1), 60);
  const page = Math.max(filters.page ?? 1, 1);

  const where: string[] = ["p.status = 'active'"];
  const params: unknown[] = [];

  if (filters.categoryIds && filters.categoryIds.length > 0) {
    params.push(filters.categoryIds);
    where.push(`p.category_id = ANY($${params.length}::int[])`);
  }

  if (filters.q) {
    params.push(`%${filters.q}%`);
    const i = params.length;
    where.push(
      `(p.name ILIKE $${i} OR p.brand ILIKE $${i} OR p.sku ILIKE $${i})`,
    );
  }

  if (filters.onSale) {
    where.push("p.compare_at_bam IS NOT NULL AND p.compare_at_bam > p.price_bam");
  }

  if (filters.hideOutOfStock) {
    where.push("p.stock > 0");
  }

  const whereSql = where.join(" AND ");
  const orderSql = ORDER_BY[filters.sort ?? ""] ?? ORDER_BY.novo;

  const countRows = await q<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM products p WHERE ${whereSql}`,
    params,
  );
  const total = countRows[0]?.total ?? 0;
  const pages = Math.max(Math.ceil(total / perPage), 1);
  const safePage = Math.min(page, pages);

  const items = await q<ProductCardData>(
    `SELECT ${PRODUCT_CARD_FIELDS}
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${whereSql}
      ORDER BY ${orderSql}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, perPage, (safePage - 1) * perPage],
  );

  return { items, total, page: safePage, pages };
}

/* ==========================================================================
   Kategorije
   ========================================================================== */

export type CategoryDetail = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: number | null;
  seo_title: string | null;
  seo_description: string | null;
};

export const getCategoryBySlug = cache(
  async (slug: string): Promise<CategoryDetail | null> => {
    const rows = await q<CategoryDetail>(
      `SELECT id, name, slug, description, image_url, parent_id,
              seo_title, seo_description
         FROM categories
        WHERE slug = $1 AND active
        LIMIT 1`,
      [slug],
    );
    return rows[0] ?? null;
  },
);

/**
 * ID kategorije zajedno sa svim njenim podkategorijama - da kategorija
 * "Alati" prikaze i proizvode iz "Bušilice", a ne samo one direktno u sebi.
 */
export const getCategoryWithDescendants = cache(
  async (categoryId: number): Promise<number[]> => {
    const tree = await getCategoryTree();
    const ids: number[] = [];

    const collect = (node: CategoryNode) => {
      ids.push(node.id);
      node.children.forEach(collect);
    };

    const find = (nodes: CategoryNode[]): CategoryNode | null => {
      for (const n of nodes) {
        if (n.id === categoryId) return n;
        const hit = find(n.children);
        if (hit) return hit;
      }
      return null;
    };

    const node = find(tree);
    if (node) collect(node);
    else ids.push(categoryId);

    return ids;
  },
);

/* ==========================================================================
   Pojedinacni proizvod
   ========================================================================== */

export type ProductDetail = {
  id: number;
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  brand: string | null;
  sku: string | null;
  ean: string | null;
  price_bam: number;
  compare_at_bam: number | null;
  stock: number;
  weight_kg: number | null;
  attributes: Record<string, string> | null;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  parent_category_name: string | null;
  parent_category_slug: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

export const getProductBySlug = cache(
  async (slug: string): Promise<ProductDetail | null> => {
    const rows = await q<ProductDetail>(
      `SELECT p.id, p.slug, p.name, p.short_description, p.description,
              p.brand, p.sku, p.ean, p.price_bam, p.compare_at_bam, p.stock,
              p.weight_kg, p.attributes, p.category_id,
              p.seo_title, p.seo_description,
              c.name AS category_name, c.slug AS category_slug,
              pc.name AS parent_category_name, pc.slug AS parent_category_slug
         FROM products p
         LEFT JOIN categories c  ON c.id = p.category_id
         LEFT JOIN categories pc ON pc.id = c.parent_id
        WHERE p.slug = $1 AND p.status = 'active'
        LIMIT 1`,
      [slug],
    );
    return rows[0] ?? null;
  },
);

export const getProductImages = cache(
  async (productId: number): Promise<string[]> => {
    const rows = await q<{ url: string }>(
      `SELECT url FROM product_images
        WHERE product_id = $1
        ORDER BY sort_order, id`,
      [productId],
    );
    return rows.map((r) => r.url);
  },
);

export const getRelatedProducts = cache(
  async (
    productId: number,
    categoryId: number | null,
    limit = 4,
  ): Promise<ProductCardData[]> =>
    q<ProductCardData>(
      `SELECT ${PRODUCT_CARD_FIELDS}
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.status = 'active'
          AND p.id <> $1
          AND ($2::int IS NULL OR p.category_id = $2::int)
        ORDER BY p.sold_count DESC, p.created_at DESC
        LIMIT $3`,
      [productId, categoryId, limit],
    ),
);

/** Broj pregleda - "fire and forget", nikad ne smije srusiti stranicu. */
export async function bumpProductViews(productId: number): Promise<void> {
  try {
    await rawQuery(`UPDATE products SET views = views + 1 WHERE id = $1`, [
      productId,
    ]);
  } catch {
    /* namjerno tiho */
  }
}

/* ==========================================================================
   Blog i stranice
   ========================================================================== */

export type PostDetail = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  cover_url: string | null;
  author: string | null;
  tags: string | null;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

export async function listPosts(
  page = 1,
  perPage = 9,
): Promise<{ items: PostCardData[]; total: number; page: number; pages: number }> {
  const safePerPage = Math.min(Math.max(perPage, 1), 30);

  const countRows = await q<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM blog_posts WHERE published`,
  );
  const total = countRows[0]?.total ?? 0;
  const pages = Math.max(Math.ceil(total / safePerPage), 1);
  const safePage = Math.min(Math.max(page, 1), pages);

  const items = await q<PostCardData>(
    `SELECT id, slug, title, excerpt, cover_url, author, published_at
       FROM blog_posts
      WHERE published
      ORDER BY published_at DESC NULLS LAST, id DESC
      LIMIT $1 OFFSET $2`,
    [safePerPage, (safePage - 1) * safePerPage],
  );

  return { items, total, page: safePage, pages };
}

export const getPostBySlug = cache(
  async (slug: string): Promise<PostDetail | null> => {
    const rows = await q<PostDetail>(
      `SELECT id, slug, title, excerpt, content, cover_url, author, tags,
              published_at, seo_title, seo_description
         FROM blog_posts
        WHERE slug = $1 AND published
        LIMIT 1`,
      [slug],
    );
    return rows[0] ?? null;
  },
);

export type PageDetail = {
  slug: string;
  title: string;
  content: string | null;
  seo_title: string | null;
  seo_description: string | null;
  updated_at: string | null;
};

export const getPageBySlug = cache(
  async (slug: string): Promise<PageDetail | null> => {
    const rows = await q<PageDetail>(
      `SELECT slug, title, content, seo_title, seo_description, updated_at
         FROM pages
        WHERE slug = $1 AND published
        LIMIT 1`,
      [slug],
    );
    return rows[0] ?? null;
  },
);

export type Faq = { id: number; question: string; answer: string; category: string };

export const getFaqs = cache(
  async (): Promise<Faq[]> =>
    q<Faq>(
      `SELECT id, question, answer, category
         FROM faqs
        WHERE active
        ORDER BY sort_order, id`,
    ),
);
