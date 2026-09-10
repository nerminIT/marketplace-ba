"use server";

import { revalidatePath } from "next/cache";
import { execute, queryOne } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { fetchFeedText, parseFeed } from "@/lib/import/feed";
import { previewImport, runImport, type PreviewResult } from "@/lib/import/engine";
import type { FieldMap } from "@/lib/import/types";
import type { RoundMode } from "@/lib/money";

export type ActionState = { ok: boolean; message: string; id?: number } | null;

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}
function num(form: FormData, key: string, fallback = 0): number {
  const value = parseFloat(String(form.get(key) ?? "").replace(",", "."));
  return isFinite(value) ? value : fallback;
}
function bool(form: FormData, key: string): boolean {
  return form.get(key) === "on" || form.get(key) === "true";
}

const FIELD_KEYS: (keyof FieldMap)[] = [
  "external_id",
  "sku",
  "ean",
  "brand",
  "name",
  "short_description",
  "description",
  "category",
  "cost",
  "stock",
  "images",
  "weight",
  "url",
];

async function uniqueSupplierSlug(name: string, id?: number): Promise<string> {
  const root = slugify(name) || "dobavljac";

  for (let i = 0; i < 200; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const clash = await queryOne<{ id: number }>(
      `SELECT id FROM suppliers WHERE slug = $1`,
      [candidate],
    );
    if (!clash || clash.id === id) return candidate;
  }

  return `${root}-${Date.now().toString(36)}`;
}

export async function saveSupplier(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    await requireUser("suppliers");
  } catch {
    return { ok: false, message: "Nemate pravo pristupa dobavljačima." };
  }

  const id = Number(form.get("id")) || 0;
  const name = str(form, "name");

  if (name.length < 2) {
    return { ok: false, message: "Unesite naziv dobavljača." };
  }

  const feedUrl = str(form, "feed_url");
  if (feedUrl && !/^https?:\/\//i.test(feedUrl)) {
    return { ok: false, message: "Adresa feeda mora počinjati sa http:// ili https://" };
  }

  // Mapiranje kolona stiže kao map_<polje> u istoj formi.
  const fieldMap: FieldMap = {};
  for (const key of FIELD_KEYS) {
    const value = str(form, `map_${key}`);
    if (value) fieldMap[key] = value;
  }

  // Zaglavlja za autentikaciju: po jedno "Kljuc: vrijednost" u redu.
  const headers: Record<string, string> = {};
  for (const line of str(form, "feed_headers").split(/\r?\n/)) {
    const at = line.indexOf(":");
    if (at > 0) {
      const key = line.slice(0, at).trim();
      const value = line.slice(at + 1).trim();
      if (key && value) headers[key] = value;
    }
  }

  const values = {
    name,
    active: bool(form, "active"),
    contact_email: str(form, "contact_email") || null,
    website: str(form, "website") || null,
    note: str(form, "note") || null,
    currency: (str(form, "currency") || "EUR").toUpperCase().slice(0, 3),
    feed_type: str(form, "feed_type") || "csv",
    feed_url: feedUrl || null,
    feed_delimiter: str(form, "feed_delimiter") || ",",
    feed_encoding: str(form, "feed_encoding") || "utf-8",
    feed_headers: JSON.stringify(headers),
    field_map: JSON.stringify(fieldMap),
    margin_percent: num(form, "margin_percent", 0),
    margin_fixed_bam: num(form, "margin_fixed_bam", 0),
    inbound_ship_bam: num(form, "inbound_ship_bam", 0),
    vat_percent: num(form, "vat_percent", 0),
    round_mode: (str(form, "round_mode") || "psych_90") as RoundMode,
    auto_translate: bool(form, "auto_translate"),
    auto_publish: bool(form, "auto_publish"),
    deactivate_missing: bool(form, "deactivate_missing"),
    default_category_id: Number(form.get("default_category_id")) || null,
  };

  try {
    if (id) {
      await execute(
        `UPDATE suppliers SET
           name = $2, active = $3, contact_email = $4, website = $5, note = $6,
           currency = $7, feed_type = $8, feed_url = $9, feed_delimiter = $10,
           feed_encoding = $11, feed_headers = $12::jsonb, field_map = $13::jsonb,
           margin_percent = $14, margin_fixed_bam = $15, inbound_ship_bam = $16,
           vat_percent = $17, round_mode = $18, auto_translate = $19,
           auto_publish = $20, deactivate_missing = $21, default_category_id = $22,
           updated_at = NOW()
         WHERE id = $1`,
        [
          id,
          values.name,
          values.active,
          values.contact_email,
          values.website,
          values.note,
          values.currency,
          values.feed_type,
          values.feed_url,
          values.feed_delimiter,
          values.feed_encoding,
          values.feed_headers,
          values.field_map,
          values.margin_percent,
          values.margin_fixed_bam,
          values.inbound_ship_bam,
          values.vat_percent,
          values.round_mode,
          values.auto_translate,
          values.auto_publish,
          values.deactivate_missing,
          values.default_category_id,
        ],
      );

      revalidatePath("/admin/dobavljaci");
      return { ok: true, message: "Izmjene su sačuvane.", id };
    }

    const slug = await uniqueSupplierSlug(name);
    const row = await queryOne<{ id: number }>(
      `INSERT INTO suppliers
         (name, slug, active, contact_email, website, note, currency,
          feed_type, feed_url, feed_delimiter, feed_encoding, feed_headers,
          field_map, margin_percent, margin_fixed_bam, inbound_ship_bam,
          vat_percent, round_mode, auto_translate, auto_publish,
          deactivate_missing, default_category_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7,
               $8, $9, $10, $11, $12::jsonb,
               $13::jsonb, $14, $15, $16,
               $17, $18, $19, $20,
               $21, $22)
       RETURNING id`,
      [
        values.name,
        slug,
        values.active,
        values.contact_email,
        values.website,
        values.note,
        values.currency,
        values.feed_type,
        values.feed_url,
        values.feed_delimiter,
        values.feed_encoding,
        values.feed_headers,
        values.field_map,
        values.margin_percent,
        values.margin_fixed_bam,
        values.inbound_ship_bam,
        values.vat_percent,
        values.round_mode,
        values.auto_translate,
        values.auto_publish,
        values.deactivate_missing,
        values.default_category_id,
      ],
    );

    revalidatePath("/admin/dobavljaci");
    return { ok: true, message: "Dobavljač je dodan.", id: row?.id };
  } catch (err) {
    console.error("[saveSupplier]", (err as Error).message);
    return { ok: false, message: `Greška pri snimanju: ${(err as Error).message}` };
  }
}

export async function deleteSupplier(id: number): Promise<ActionState> {
  try {
    await requireUser("suppliers");
  } catch {
    return { ok: false, message: "Nemate pravo pristupa dobavljačima." };
  }

  try {
    // Proizvodi ostaju - samo im se veza sa dobavljačem briše (ON DELETE SET NULL),
    // da brisanje dobavljača nikad ne obriše katalog.
    await execute(`DELETE FROM suppliers WHERE id = $1`, [id]);
    revalidatePath("/admin/dobavljaci");
    return { ok: true, message: "Dobavljač je obrisan. Proizvodi su zadržani." };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

/** Učita kolone iz feeda, da se mapiranje bira iz liste umjesto napamet. */
export async function loadFeedHeaders(
  url: string,
  options: { delimiter?: string; encoding?: string; headers?: Record<string, string> } = {},
): Promise<{ ok: boolean; message: string; headers: string[]; sample?: Record<string, string> }> {
  try {
    await requireUser("suppliers");
  } catch {
    return { ok: false, message: "Nemate pravo pristupa.", headers: [] };
  }

  try {
    const text = await fetchFeedText(url, {
      encoding: options.encoding,
      headers: options.headers,
    });
    const parsed = parseFeed(text, { delimiter: options.delimiter, maxRows: 1 });

    if (parsed.headers.length === 0) {
      return { ok: false, message: "Feed nema zaglavlje sa nazivima kolona.", headers: [] };
    }

    return {
      ok: true,
      message: `Pronađeno ${parsed.headers.length} kolona (razdvajač: "${parsed.delimiter === "\t" ? "tab" : parsed.delimiter}").`,
      headers: parsed.headers,
      sample: parsed.rows[0],
    };
  } catch (err) {
    return { ok: false, message: (err as Error).message, headers: [] };
  }
}

export async function previewSupplierImport(
  supplierId: number,
): Promise<PreviewResult> {
  await requireUser("suppliers");
  return previewImport(supplierId, { limit: 15 });
}

export async function runSupplierImport(
  supplierId: number,
): Promise<{ ok: boolean; message: string; runId: number | null }> {
  try {
    await requireUser("suppliers");
  } catch {
    return { ok: false, message: "Nemate pravo pristupa.", runId: null };
  }

  const outcome = await runImport(supplierId, { source: "url" });

  revalidatePath("/admin/uvoz");
  revalidatePath("/admin/proizvodi");
  revalidatePath("/admin/dobavljaci");

  return {
    ok: outcome.status === "success",
    message: outcome.message,
    runId: outcome.runId,
  };
}

/** Poveže vrijednost kategorije iz feeda sa našom kategorijom. */
export async function mapSupplierCategory(
  supplierId: number,
  sourceValue: string,
  categoryId: number | null,
): Promise<ActionState> {
  try {
    await requireUser("suppliers");
  } catch {
    return { ok: false, message: "Nemate pravo pristupa." };
  }

  try {
    await execute(
      `INSERT INTO supplier_category_map (supplier_id, source_value, category_id)
            VALUES ($1, $2, $3)
       ON CONFLICT (supplier_id, source_value)
       DO UPDATE SET category_id = EXCLUDED.category_id`,
      [supplierId, sourceValue, categoryId],
    );

    revalidatePath(`/admin/dobavljaci/${supplierId}`);
    return { ok: true, message: "Kategorija je mapirana." };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
