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
