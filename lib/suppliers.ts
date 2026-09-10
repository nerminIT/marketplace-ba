import "server-only";
import { query, queryOne } from "./db";
import type { RoundMode } from "./money";
import type { FieldMap } from "./import/types";

export type Supplier = {
  id: number;
  name: string;
  slug: string;
  active: boolean;
  contact_email: string | null;
  website: string | null;
  note: string | null;

  currency: string;

  feed_type: string;
  feed_url: string | null;
  feed_delimiter: string;
  feed_encoding: string;
  feed_headers: Record<string, string>;
  field_map: FieldMap;

  margin_percent: number;
  margin_fixed_bam: number;
  inbound_ship_bam: number;
  vat_percent: number;
  round_mode: RoundMode;

  auto_translate: boolean;
  auto_publish: boolean;
  deactivate_missing: boolean;
  default_category_id: number | null;

  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_message: string | null;
};

export type SupplierListItem = Supplier & {
  product_count: number;
  default_category_name: string | null;
};

export async function listSuppliers(): Promise<SupplierListItem[]> {
  return query<SupplierListItem>(
    `SELECT s.*,
            (SELECT COUNT(*) FROM products p WHERE p.supplier_id = s.id)::int
              AS product_count,
            c.name AS default_category_name
       FROM suppliers s
       LEFT JOIN categories c ON c.id = s.default_category_id
      ORDER BY s.active DESC, s.name`,
  );
}

export async function getSupplier(id: number): Promise<Supplier | null> {
  return queryOne<Supplier>(`SELECT * FROM suppliers WHERE id = $1`, [id]);
}

export type MarginRuleRow = {
  id: number;
  supplier_id: number;
  category_id: number | null;
  category_name: string | null;
  min_cost_bam: number | null;
  max_cost_bam: number | null;
  margin_percent: number;
  margin_fixed_bam: number;
  priority: number;
};

export async function getMarginRules(
  supplierId: number,
): Promise<MarginRuleRow[]> {
  return query<MarginRuleRow>(
    `SELECT r.*, c.name AS category_name
       FROM supplier_margin_rules r
       LEFT JOIN categories c ON c.id = r.category_id
      WHERE r.supplier_id = $1
      ORDER BY r.priority DESC, r.id`,
    [supplierId],
  );
}

export type CategoryMapRow = {
  id: number;
  supplier_id: number;
  source_value: string;
  category_id: number | null;
  category_name: string | null;
};

export async function getCategoryMap(
  supplierId: number,
): Promise<CategoryMapRow[]> {
  return query<CategoryMapRow>(
    `SELECT m.*, c.name AS category_name
       FROM supplier_category_map m
       LEFT JOIN categories c ON c.id = m.category_id
      WHERE m.supplier_id = $1
      ORDER BY m.source_value`,
    [supplierId],
  );
}

export type ExchangeRate = {
  currency: string;
  rate_to_bam: number;
  is_fixed: boolean;
  source: string | null;
  updated_at: string;
};

export async function listExchangeRates(): Promise<ExchangeRate[]> {
  return query<ExchangeRate>(
    `SELECT currency, rate_to_bam, is_fixed, source, updated_at
       FROM exchange_rates
      ORDER BY is_fixed DESC, currency`,
  );
}

export async function getRate(currency: string): Promise<number | null> {
  const row = await queryOne<{ rate_to_bam: number }>(
    `SELECT rate_to_bam FROM exchange_rates WHERE currency = $1`,
    [currency.toUpperCase()],
  );
  return row ? Number(row.rate_to_bam) : null;
}
