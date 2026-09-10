import "server-only";
import { execute, query, queryOne, transaction } from "@/lib/db";
import { calculatePrice, resolveMargin, type MarginRule } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { plural } from "@/lib/plural";
import { getSettings } from "@/lib/settings";
import { isTranslationConfigured, translateAll } from "@/lib/translate";
import {
  getCategoryMap,
  getMarginRules,
  getRate,
  getSupplier,
  type Supplier,
} from "@/lib/suppliers";
import { fetchFeedText, mapRow, parseFeed } from "./feed";
import type {
  ImportLogEntry,
  ImportOutcome,
  MappedRow,
} from "./types";

/**
 * Engine za uvoz proizvoda od dobavljača.
 *
 * Tok je uvijek isti:
 *   preuzmi feed -> razloži CSV -> mapiraj kolone -> preračunaj u KM
 *   -> primijeni maržu -> zaokruži -> prevedi -> upiši
 *
 * Dva pravila koja se nikad ne krše:
 *   - `price_locked` proizvod zadržava ručno postavljenu cijenu.
 *   - `content_locked` proizvod zadržava ručno uređen naziv i opis.
 * Uvoz takvim proizvodima osvježava samo zalihu i nabavnu cijenu.
 */

export type PreviewRow = {
  row: number;
  externalId: string;
  name: string;
  categoryLabel: string | null;
  resolvedCategory: string | null;
  costAmount: number;
  costBam: number;
  priceBam: number;
  profitBam: number;
  marginPercent: number;
  stock: number;
  images: number;
  exists: boolean;
  priceLocked: boolean;
};

export type PreviewResult = {
  ok: boolean;
  message: string;
  headers: string[];
  totalRows: number;
  rows: PreviewRow[];
  errors: string[];
  /** Vrijednosti kolone kategorije koje još nisu mapirane na našu kategoriju. */
  unmappedCategories: string[];
};

type PricingContext = {
  supplier: Supplier;
  rate: number;
  rules: MarginRule[];
  categoryByLabel: Map<string, number | null>;
};

async function buildContext(supplier: Supplier): Promise<PricingContext> {
  const [rate, ruleRows, mapRows] = await Promise.all([
    getRate(supplier.currency),
    getMarginRules(supplier.id),
    getCategoryMap(supplier.id),
  ]);

  if (rate === null) {
    throw new Error(
      `Valuta ${supplier.currency} nije u kursnoj listi. Dodajte je pod Kursna lista.`,
    );
  }

  const categoryByLabel = new Map<string, number | null>();
  for (const row of mapRows) {
    categoryByLabel.set(row.source_value.toLowerCase(), row.category_id);
  }

  return {
    supplier,
    rate,
    rules: ruleRows.map((r) => ({
      category_id: r.category_id,
      min_cost_bam: r.min_cost_bam === null ? null : Number(r.min_cost_bam),
      max_cost_bam: r.max_cost_bam === null ? null : Number(r.max_cost_bam),
      margin_percent: Number(r.margin_percent),
      margin_fixed_bam: Number(r.margin_fixed_bam),
      priority: r.priority,
    })),
    categoryByLabel,
  };
}

/** Kategorija se traži po mapiranju dobavljača, pa tek onda pada na zadanu. */
function resolveCategory(ctx: PricingContext, label: string | null): number | null {
  if (label) {
    const mapped = ctx.categoryByLabel.get(label.toLowerCase());
    if (mapped !== undefined && mapped !== null) return mapped;
  }
  return ctx.supplier.default_category_id;
}

function priceRow(ctx: PricingContext, item: MappedRow, categoryId: number | null) {
  const costBamOnly = Number(
    (item.costAmount * ctx.rate + Number(ctx.supplier.inbound_ship_bam)).toFixed(2),
  );

  const margin = resolveMargin(ctx.rules, costBamOnly, categoryId, {
    marginPercent: Number(ctx.supplier.margin_percent),
    marginFixedBam: Number(ctx.supplier.margin_fixed_bam),
  });

  return {
    margin,
    pricing: calculatePrice({
      costAmount: item.costAmount,
      costCurrency: ctx.supplier.currency,
      rateToBam: ctx.rate,
      inboundShipBam: Number(ctx.supplier.inbound_ship_bam),
      marginPercent: margin.marginPercent,
      marginFixedBam: margin.marginFixedBam,
      vatPercent: Number(ctx.supplier.vat_percent),
      roundMode: ctx.supplier.round_mode,
    }),
  };
}

async function loadFeed(
  supplier: Supplier,
  override: { text?: string; maxRows?: number },
) {
  const settings = await getSettings();
  const maxRows = override.maxRows ?? settings.import.maxRowsPerRun;

  const text =
    override.text ??
    (await fetchFeedText(supplier.feed_url ?? "", {
      headers: supplier.feed_headers ?? {},
      encoding: supplier.feed_encoding,
    }));

  const parsed = parseFeed(text, {
    delimiter: supplier.feed_delimiter || undefined,
    maxRows,
  });

  return { parsed, settings };
}

/* ==========================================================================
   Pregled prije uvoza
   ========================================================================== */

export async function previewImport(
  supplierId: number,
  options: { text?: string; limit?: number } = {},
): Promise<PreviewResult> {
  const empty: PreviewResult = {
    ok: false,
    message: "",
    headers: [],
    totalRows: 0,
    rows: [],
    errors: [],
    unmappedCategories: [],
  };

  const supplier = await getSupplier(supplierId);
  if (!supplier) return { ...empty, message: "Dobavljač nije pronađen." };

  let ctx: PricingContext;
  try {
    ctx = await buildContext(supplier);
  } catch (err) {
    return { ...empty, message: (err as Error).message };
  }

  let parsed;
  try {
    ({ parsed } = await loadFeed(supplier, { text: options.text }));
  } catch (err) {
    return { ...empty, message: (err as Error).message };
  }

  if (parsed.headers.length === 0) {
    return { ...empty, message: "Feed je prazan ili nije u CSV formatu." };
  }

  const limit = Math.min(options.limit ?? 15, 100);
  const rows: PreviewRow[] = [];
  const errors: string[] = [];
  const unmapped = new Set<string>();

  // Nazivi naših kategorija za prikaz u pregledu.
  const categoryNames = new Map<number, string>();
  for (const c of await query<{ id: number; name: string }>(
    `SELECT id, name FROM categories`,
  )) {
    categoryNames.set(c.id, c.name);
  }

  for (let i = 0; i < parsed.rows.length; i++) {
    const mapped = mapRow(parsed.rows[i], supplier.field_map);

    if ("error" in mapped) {
      if (errors.length < 20) errors.push(`Red ${i + 2}: ${mapped.error}`);
      continue;
    }

    const item = mapped.value;

    if (item.categoryLabel) {
      const known = ctx.categoryByLabel.get(item.categoryLabel.toLowerCase());
      if (known === undefined || known === null) unmapped.add(item.categoryLabel);
    }

    if (rows.length >= limit) continue;

    const categoryId = resolveCategory(ctx, item.categoryLabel);
    const { margin, pricing } = priceRow(ctx, item, categoryId);

    const existing = await queryOne<{ id: number; price_locked: boolean }>(
      `SELECT id, price_locked FROM products
        WHERE supplier_id = $1 AND external_id = $2`,
      [supplier.id, item.externalId],
    );

    rows.push({
      row: i + 2,
      externalId: item.externalId,
      name: item.name,
      categoryLabel: item.categoryLabel,
      resolvedCategory: categoryId ? (categoryNames.get(categoryId) ?? null) : null,
      costAmount: item.costAmount,
      costBam: pricing.costBam,
      priceBam: pricing.priceBam,
      profitBam: pricing.profitBam,
      marginPercent: margin.marginPercent,
      stock: item.stock,
      images: item.images.length,
      exists: Boolean(existing),
      priceLocked: Boolean(existing?.price_locked),
    });
  }

  return {
    ok: true,
    message: "",
    headers: parsed.headers,
    totalRows: parsed.rows.length,
    rows,
    errors,
    unmappedCategories: [...unmapped].slice(0, 50),
  };
}

/* ==========================================================================
   Uvoz
   ========================================================================== */

async function uniqueProductSlug(base: string, productId?: number): Promise<string> {
  const root = slugify(base) || "proizvod";

  for (let i = 0; i < 500; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const clash = await queryOne<{ id: number }>(
      `SELECT id FROM products WHERE slug = $1`,
      [candidate],
    );
    if (!clash || clash.id === productId) return candidate;
  }

  return `${root}-${Date.now().toString(36)}`;
}

export async function runImport(
  supplierId: number,
  options: { text?: string; source?: "url" | "upload" } = {},
): Promise<ImportOutcome> {
  const log: ImportLogEntry[] = [];
  const counts = { rowsTotal: 0, created: 0, updated: 0, skipped: 0, failed: 0 };

  const fail = async (
    runId: number | null,
    message: string,
  ): Promise<ImportOutcome> => {
    log.push({ level: "error", message });

    if (runId) {
      await execute(
        `UPDATE import_runs
            SET status = 'failed', message = $2, log = $3::jsonb, finished_at = NOW()
          WHERE id = $1`,
        [runId, message, JSON.stringify(log)],
      );
    }
    await execute(
      `UPDATE suppliers
          SET last_sync_at = NOW(), last_sync_status = 'failed', last_sync_message = $2
        WHERE id = $1`,
      [supplierId, message],
    );

    return { ...counts, runId, status: "failed", message, log };
  };

  const supplier = await getSupplier(supplierId);
  if (!supplier) return fail(null, "Dobavljač nije pronađen.");

  const runRow = await queryOne<{ id: number }>(
    `INSERT INTO import_runs (supplier_id, status, source)
          VALUES ($1, 'running', $2)
       RETURNING id`,
    [supplierId, options.source ?? "url"],
  );
  const runId = runRow?.id ?? null;
  const startedAt = new Date();

  let ctx: PricingContext;
  try {
    ctx = await buildContext(supplier);
  } catch (err) {
    return fail(runId, (err as Error).message);
  }

  let parsed;
  let settings;
  try {
    ({ parsed, settings } = await loadFeed(supplier, { text: options.text }));
  } catch (err) {
    return fail(runId, `Feed nije moguće učitati: ${(err as Error).message}`);
  }

  if (parsed.headers.length === 0) {
    return fail(runId, "Feed je prazan ili nije u CSV formatu.");
  }

  counts.rowsTotal = parsed.rows.length;
  log.push({
    level: "info",
    message: `Učitano ${parsed.rows.length} redova, kolone: ${parsed.headers.join(", ")}`,
  });

  // Proizvodi koje treba prevesti nakon upisa (samo novi i oni bez zaključanog
  // sadržaja) - prevod ide u jednom prolazu na kraju, u grupama.
  const toTranslate: {
    key: string;
    name: string;
    description?: string;
  }[] = [];
  const translateTargets = new Map<string, number>();

  for (let i = 0; i < parsed.rows.length; i++) {
    const rowNumber = i + 2;
    const mapped = mapRow(parsed.rows[i], supplier.field_map);

    if ("error" in mapped) {
      // Red koji ne prolazi provjeru nije greška uvoza nego neupotrebljiv
      // podatak dobavljača - broji se odvojeno od stvarnih grešaka upisa.
      counts.skipped++;
      if (log.length < 300) {
        log.push({ level: "warn", message: mapped.error, row: rowNumber });
      }
      continue;
    }

    const item = mapped.value;
    const categoryId = resolveCategory(ctx, item.categoryLabel);
    const { pricing } = priceRow(ctx, item, categoryId);

    try {
      const existing = await queryOne<{
        id: number;
        price_locked: boolean;
        content_locked: boolean;
        translation_status: string;
      }>(
        `SELECT id, price_locked, content_locked, translation_status
           FROM products
          WHERE supplier_id = $1 AND external_id = $2`,
        [supplier.id, item.externalId],
      );

      if (existing) {
        await transaction(async (client) => {
          // Zaključana polja se ne diraju - to je jedina zaštita ručnog rada.
          await client.query(
            `UPDATE products SET
               sku          = COALESCE($2, sku),
               ean          = COALESCE($3, ean),
               brand        = COALESCE($4, brand),
               name         = CASE WHEN content_locked THEN name ELSE $5 END,
               name_source  = $5,
               short_description =
                 CASE WHEN content_locked THEN short_description ELSE $6 END,
               description  = CASE WHEN content_locked THEN description ELSE $7 END,
               description_source = $7,
               category_id  = COALESCE(category_id, $8),
               cost_amount  = $9,
               cost_currency = $10,
               cost_bam     = $11,
               price_bam    = CASE WHEN price_locked THEN price_bam ELSE $12 END,
               stock        = $13,
               weight_kg    = COALESCE($14, weight_kg),
               source_url   = COALESCE($15, source_url),
               translation_status =
                 CASE WHEN content_locked THEN translation_status
                      ELSE 'pending' END,
               last_seen_at = NOW(),
               updated_at   = NOW()
             WHERE id = $1`,
            [
              existing.id,
              item.sku,
              item.ean,
              item.brand,
              item.name,
              item.shortDescription,
              item.description,
              categoryId,
              item.costAmount,
              supplier.currency,
              pricing.costBam,
              pricing.priceBam,
              item.stock,
              item.weightKg,
              item.sourceUrl,
            ],
          );

          // Slike se uvijek zamjenjuju kompletno - dobavljač je vlasnik te liste.
          if (item.images.length > 0) {
            await client.query(
              `DELETE FROM product_images WHERE product_id = $1`,
              [existing.id],
            );
            for (let n = 0; n < item.images.length; n++) {
              await client.query(
                `INSERT INTO product_images (product_id, url, sort_order)
                      VALUES ($1, $2, $3)`,
                [existing.id, item.images[n], n + 1],
              );
            }
          }
        });

        counts.updated++;

        if (!existing.content_locked) {
          const key = `p${existing.id}`;
          translateTargets.set(key, existing.id);
          toTranslate.push({
            key,
            name: item.name,
            description: item.description ?? "",
          });
        }
      } else {
        const slug = await uniqueProductSlug(item.name);

        const inserted = await transaction(async (client) => {
          const res = await client.query<{ id: number }>(
            `INSERT INTO products
               (supplier_id, external_id, sku, ean, brand, slug,
                name, name_source, short_description, description, description_source,
                category_id, cost_amount, cost_currency, cost_bam, price_bam,
                stock, status, weight_kg, source_url, translation_status, last_seen_at)
             VALUES ($1, $2, $3, $4, $5, $6,
                     $7, $7, $8, $9, $9,
                     $10, $11, $12, $13, $14,
                     $15, $16, $17, $18, 'pending', NOW())
             RETURNING id`,
            [
              supplier.id,
              item.externalId,
              item.sku,
              item.ean,
              item.brand,
              slug,
              item.name,
              item.shortDescription,
              item.description,
              categoryId,
              item.costAmount,
              supplier.currency,
              pricing.costBam,
              pricing.priceBam,
              item.stock,
              supplier.auto_publish ? "active" : "draft",
              item.weightKg,
              item.sourceUrl,
            ],
          );

          const productId = res.rows[0].id;

          for (let n = 0; n < item.images.length; n++) {
            await client.query(
              `INSERT INTO product_images (product_id, url, sort_order)
                    VALUES ($1, $2, $3)`,
              [productId, item.images[n], n + 1],
            );
          }

          return productId;
        });

        counts.created++;

        const key = `p${inserted}`;
        translateTargets.set(key, inserted);
        toTranslate.push({
          key,
          name: item.name,
          description: item.description ?? "",
        });
      }
    } catch (err) {
      counts.failed++;
      if (log.length < 300) {
        log.push({
          level: "error",
          message: `${item.externalId}: ${(err as Error).message}`,
          row: rowNumber,
        });
      }
    }
  }

  /* ---------------------------------------------------------------- prevod */
  if (supplier.auto_translate && toTranslate.length > 0) {
    if (!isTranslationConfigured()) {
      log.push({
        level: "warn",
        message:
          "Automatski prevod je uključen, ali ANTHROPIC_API_KEY nije postavljen. " +
          "Proizvodi su uvezeni na originalnom jeziku.",
      });
    } else {
      const { map, errors } = await translateAll(toTranslate, {
        model: settings.import.translateModel,
        batchSize: settings.import.translateBatchSize,
      });

      let translated = 0;
      for (const [key, result] of map) {
        const productId = translateTargets.get(key);
        if (!productId || !result.name) continue;

        await execute(
          `UPDATE products
              SET name = $2,
                  description = CASE WHEN $3 = '' THEN description ELSE $3 END,
                  translation_status = 'done',
                  updated_at = NOW()
            WHERE id = $1 AND NOT content_locked`,
          [productId, result.name, result.description],
        );
        translated++;
      }

      log.push({
        level: "info",
        message: `Prevedeno ${translated} od ${toTranslate.length} proizvoda.`,
      });

      for (const error of errors.slice(0, 5)) {
        log.push({ level: "warn", message: `Prevod: ${error}` });
      }
    }
  }

  /* ------------------------------------------- proizvodi kojih više nema */
  if (supplier.deactivate_missing && counts.rowsTotal > 0 && counts.failed < counts.rowsTotal) {
    const archived = await execute(
      `UPDATE products
          SET status = 'archived', stock = 0, updated_at = NOW()
        WHERE supplier_id = $1
          AND status <> 'archived'
          AND (last_seen_at IS NULL OR last_seen_at < $2)`,
      [supplier.id, startedAt.toISOString()],
    );

    if (archived > 0) {
      log.push({
        level: "info",
        message: `${archived} proizvoda nije više u feedu - arhivirano.`,
      });
    }
  }

  const message = [
    `${counts.created} ${plural(counts.created, "nov", "nova", "novih")}`,
    `${counts.updated} ${plural(counts.updated, "osvježen", "osvježena", "osvježenih")}`,
    counts.skipped > 0
      ? `${counts.skipped} ${plural(counts.skipped, "preskočen", "preskočena", "preskočenih")}`
      : null,
    counts.failed > 0
      ? `${counts.failed} ${plural(counts.failed, "greška", "greške", "grešaka")}`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  if (runId) {
    await execute(
      `UPDATE import_runs
          SET status = 'success', rows_total = $2, created_count = $3,
              updated_count = $4, skipped_count = $5, failed_count = $6,
              message = $7, log = $8::jsonb, finished_at = NOW()
        WHERE id = $1`,
      [
        runId,
        counts.rowsTotal,
        counts.created,
        counts.updated,
        counts.skipped,
        counts.failed,
        message,
        JSON.stringify(log),
      ],
    );
  }

  await execute(
    `UPDATE suppliers
        SET last_sync_at = NOW(), last_sync_status = 'success', last_sync_message = $2
      WHERE id = $1`,
    [supplierId, message],
  );

  return { ...counts, runId, status: "success", message, log };
}
