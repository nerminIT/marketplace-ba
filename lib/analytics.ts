import "server-only";
import { query, queryOne } from "./db";
import { ORDER_STATUSES as STATUS_DEFS, type Period as PeriodType } from "./period";

/**
 * Brojke za nadzornu plocu.
 *
 * Dvije odluke koje vrijede svuda u ovom fajlu:
 *   - Otkazane narudzbe se NE racunaju u prihod ni profit. Broje se odvojeno.
 *   - Profit = prodajna vrijednost robe - nabavna vrijednost robe.
 *     Dostava je prolazna stavka i namjerno je izvan racuna, inace bi
 *     besplatna dostava izgledala kao gubitak.
 */

export {
  PERIODS,
  periodLabel,
  parsePeriod,
  ORDER_STATUSES,
  type Period,
} from "./period";

/** Postgres interval za trazeni period. */
const INTERVAL: Record<PeriodType, string> = {
  danas: "1 day",
  sedmica: "7 days",
  mjesec: "30 days",
  godina: "365 days",
};


export type Kpis = {
  revenue: number;
  orders: number;
  units: number;
  aov: number;
  profit: number;
  marginPercent: number;
  cancelled: number;
  /** Promjena u odnosu na prethodni period iste duzine, u procentima. */
  revenueChange: number | null;
  ordersChange: number | null;
  unitsChange: number | null;
  aovChange: number | null;
  profitChange: number | null;
};

function change(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function getKpis(period: PeriodType): Promise<Kpis> {
  const interval = INTERVAL[period];

  const row = await queryOne<{
    revenue: number;
    orders: number;
    units: number;
    profit: number;
    cancelled: number;
    prev_revenue: number;
    prev_orders: number;
    prev_units: number;
    prev_profit: number;
  }>(
    `WITH tekuci AS (
       SELECT o.id, o.status, o.subtotal_bam, o.total_bam, o.cost_total_bam
         FROM orders o
        WHERE o.created_at >= NOW() - $1::interval
     ),
     prethodni AS (
       SELECT o.id, o.status, o.subtotal_bam, o.total_bam, o.cost_total_bam
         FROM orders o
        WHERE o.created_at >= NOW() - ($1::interval * 2)
          AND o.created_at <  NOW() - $1::interval
     )
     SELECT
       COALESCE((SELECT SUM(total_bam) FROM tekuci WHERE status <> 'otkazana'), 0)
         AS revenue,
       (SELECT COUNT(*) FROM tekuci WHERE status <> 'otkazana')::int
         AS orders,
       COALESCE((SELECT SUM(i.qty) FROM order_items i
                   JOIN tekuci t ON t.id = i.order_id
                  WHERE t.status <> 'otkazana'), 0)::int
         AS units,
       COALESCE((SELECT SUM(subtotal_bam - cost_total_bam) FROM tekuci
                  WHERE status <> 'otkazana'), 0)
         AS profit,
       (SELECT COUNT(*) FROM tekuci WHERE status = 'otkazana')::int
         AS cancelled,
       COALESCE((SELECT SUM(total_bam) FROM prethodni WHERE status <> 'otkazana'), 0)
         AS prev_revenue,
       (SELECT COUNT(*) FROM prethodni WHERE status <> 'otkazana')::int
         AS prev_orders,
       COALESCE((SELECT SUM(i.qty) FROM order_items i
                   JOIN prethodni p ON p.id = i.order_id
                  WHERE p.status <> 'otkazana'), 0)::int
         AS prev_units,
       COALESCE((SELECT SUM(subtotal_bam - cost_total_bam) FROM prethodni
                  WHERE status <> 'otkazana'), 0)
         AS prev_profit`,
    [interval],
  );

  const r = row ?? {
    revenue: 0,
    orders: 0,
    units: 0,
    profit: 0,
    cancelled: 0,
    prev_revenue: 0,
    prev_orders: 0,
    prev_units: 0,
    prev_profit: 0,
  };

  const aov = r.orders > 0 ? r.revenue / r.orders : 0;
  const prevAov = r.prev_orders > 0 ? r.prev_revenue / r.prev_orders : 0;

  return {
    revenue: Number(r.revenue),
    orders: r.orders,
    units: r.units,
    aov: Math.round(aov * 100) / 100,
    profit: Number(r.profit),
    marginPercent:
      Number(r.revenue) > 0
        ? Math.round((Number(r.profit) / Number(r.revenue)) * 100)
        : 0,
    cancelled: r.cancelled,
    revenueChange: change(Number(r.revenue), Number(r.prev_revenue)),
    ordersChange: change(r.orders, r.prev_orders),
    unitsChange: change(r.units, r.prev_units),
    aovChange: change(aov, prevAov),
    profitChange: change(Number(r.profit), Number(r.prev_profit)),
  };
}

/* ==========================================================================
   Vremenska serija
   ========================================================================== */

export type DayPoint = { date: string; revenue: number; profit: number; orders: number };

/**
 * Prihod i profit po danima. `generate_series` popunjava i dane bez narudzbi
 * nulama - bez toga bi grafikon preskakao prazne dane i lagao o obliku.
 */
export async function getDailySeries(days = 30): Promise<DayPoint[]> {
  return query<DayPoint>(
    `WITH dani AS (
       SELECT generate_series(
         (CURRENT_DATE - ($1::int - 1))::timestamptz,
         CURRENT_DATE::timestamptz,
         '1 day'
       )::date AS dan
     )
     SELECT to_char(d.dan, 'YYYY-MM-DD') AS date,
            COALESCE(SUM(o.total_bam), 0) AS revenue,
            COALESCE(SUM(o.subtotal_bam - o.cost_total_bam), 0) AS profit,
            COUNT(o.id)::int AS orders
       FROM dani d
       LEFT JOIN orders o
         ON o.created_at::date = d.dan
        AND o.status <> 'otkazana'
      GROUP BY d.dan
      ORDER BY d.dan`,
    [days],
  );
}

/* ==========================================================================
   Statusi narudzbi
   ========================================================================== */


export type StatusSlice = {
  value: string;
  label: string;
  viz: number;
  count: number;
  percent: number;
};

export async function getStatusBreakdown(period: PeriodType): Promise<StatusSlice[]> {
  const rows = await query<{ status: string; n: number }>(
    `SELECT status, COUNT(*)::int AS n
       FROM orders
      WHERE created_at >= NOW() - $1::interval
      GROUP BY status`,
    [INTERVAL[period]],
  );

  const counts = new Map(rows.map((r) => [r.status, r.n]));
  const total = rows.reduce((sum, r) => sum + r.n, 0);

  return STATUS_DEFS.map((s) => {
    const count = counts.get(s.value) ?? 0;
    return {
      value: s.value,
      label: s.label,
      viz: s.viz,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
}

/* ==========================================================================
   Kategorije i proizvodi
   ========================================================================== */

export type CategoryRevenue = { name: string; revenue: number; units: number };

export async function getCategoryRevenue(limit = 8): Promise<CategoryRevenue[]> {
  return query<CategoryRevenue>(
    `SELECT COALESCE(c.name, 'Bez kategorije') AS name,
            SUM(i.unit_price_bam * i.qty) AS revenue,
            SUM(i.qty)::int AS units
       FROM order_items i
       JOIN orders o   ON o.id = i.order_id AND o.status <> 'otkazana'
       LEFT JOIN products p  ON p.id = i.product_id
       LEFT JOIN categories c ON c.id = p.category_id
      GROUP BY c.name
      ORDER BY revenue DESC
      LIMIT $1`,
    [limit],
  );
}

export type ProductSales = {
  id: number | null;
  name: string;
  slug: string | null;
  image_url: string | null;
  units: number;
  revenue: number;
};

/** `direction` bira najbolje ili najslabije prodavane artikle. */
export async function getProductSales(
  direction: "top" | "bottom",
  limit = 10,
): Promise<ProductSales[]> {
  return query<ProductSales>(
    `SELECT p.id, COALESCE(p.name, i.name) AS name, p.slug,
            (SELECT im.url FROM product_images im
              WHERE im.product_id = p.id
              ORDER BY im.sort_order, im.id LIMIT 1) AS image_url,
            SUM(i.qty)::int AS units,
            SUM(i.unit_price_bam * i.qty) AS revenue
       FROM order_items i
       JOIN orders o  ON o.id = i.order_id AND o.status <> 'otkazana'
       LEFT JOIN products p ON p.id = i.product_id
      GROUP BY p.id, i.name, p.name, p.slug
      ORDER BY SUM(i.qty) ${direction === "top" ? "DESC" : "ASC"},
               SUM(i.unit_price_bam * i.qty) ${direction === "top" ? "DESC" : "ASC"}
      LIMIT $1`,
    [limit],
  );
}

/* ==========================================================================
   Zalihe
   ========================================================================== */

export type StockRow = {
  id: number;
  name: string;
  stock: number;
  category_name: string | null;
  image_url: string | null;
};

export async function getStockAlerts(threshold = 5): Promise<{
  low: StockRow[];
  out: StockRow[];
  lowCount: number;
  outCount: number;
}> {
  const [low, out, counts] = await Promise.all([
    query<StockRow>(
      `SELECT p.id, p.name, p.stock, c.name AS category_name,
              (SELECT i.url FROM product_images i WHERE i.product_id = p.id
                ORDER BY i.sort_order, i.id LIMIT 1) AS image_url
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.status = 'active' AND p.stock > 0 AND p.stock <= $1
        ORDER BY p.stock, p.name
        LIMIT 8`,
      [threshold],
    ),
    query<StockRow>(
      `SELECT p.id, p.name, p.stock, c.name AS category_name,
              (SELECT i.url FROM product_images i WHERE i.product_id = p.id
                ORDER BY i.sort_order, i.id LIMIT 1) AS image_url
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.status = 'active' AND p.stock <= 0
        ORDER BY p.name
        LIMIT 8`,
    ),
    queryOne<{ low: number; out: number; skus: number; units: number; retail: number; cost: number }>(
      `SELECT
         (SELECT COUNT(*) FROM products
           WHERE status = 'active' AND stock > 0 AND stock <= $1)::int AS low,
         (SELECT COUNT(*) FROM products
           WHERE status = 'active' AND stock <= 0)::int AS out,
         (SELECT COUNT(*) FROM products)::int AS skus,
         COALESCE((SELECT SUM(GREATEST(stock, 0)) FROM products), 0)::int AS units,
         COALESCE((SELECT SUM(price_bam * GREATEST(stock, 0)) FROM products), 0) AS retail,
         COALESCE((SELECT SUM(cost_bam  * GREATEST(stock, 0)) FROM products), 0) AS cost`,
      [threshold],
    ),
  ]);

  return {
    low,
    out,
    lowCount: counts?.low ?? 0,
    outCount: counts?.out ?? 0,
  };
}

export type StockSummary = {
  skus: number;
  units: number;
  retail: number;
  cost: number;
};

export async function getStockSummary(): Promise<StockSummary> {
  const row = await queryOne<StockSummary>(
    `SELECT (SELECT COUNT(*) FROM products)::int AS skus,
            COALESCE((SELECT SUM(GREATEST(stock, 0)) FROM products), 0)::int AS units,
            COALESCE((SELECT SUM(price_bam * GREATEST(stock, 0)) FROM products), 0) AS retail,
            COALESCE((SELECT SUM(cost_bam  * GREATEST(stock, 0)) FROM products), 0) AS cost`,
  );

  return row ?? { skus: 0, units: 0, retail: 0, cost: 0 };
}
