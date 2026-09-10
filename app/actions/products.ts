"use server";

import { revalidatePath } from "next/cache";
import { execute, queryOne, transaction } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { slugify } from "@/lib/slug";

export type ProductState = { ok: boolean; message: string } | null;

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

async function uniqueSlug(base: string, productId: number): Promise<string> {
  const root = slugify(base) || "proizvod";

  for (let i = 0; i < 200; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const clash = await queryOne<{ id: number }>(
      `SELECT id FROM products WHERE slug = $1`,
      [candidate],
    );
    if (!clash || clash.id === productId) return candidate;
  }

  return `${root}-${Date.now().toString(36)}`;
}

export async function saveProduct(
  _prev: ProductState,
  form: FormData,
): Promise<ProductState> {
  try {
    await requireUser("products");
  } catch {
    return { ok: false, message: "Nemate pravo uređivanja proizvoda." };
  }

  const id = Number(form.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Nepoznat proizvod." };
  }

  const name = str(form, "name");
  if (name.length < 2) return { ok: false, message: "Unesite naziv proizvoda." };

  const price = num(form, "price_bam", -1);
  if (price < 0) return { ok: false, message: "Cijena mora biti broj." };

  const compareAtRaw = str(form, "compare_at_bam");
  const compareAt = compareAtRaw ? num(form, "compare_at_bam") : null;

  if (compareAt !== null && compareAt > 0 && compareAt <= price) {
    return {
      ok: false,
      message: "Stara cijena mora biti veća od prodajne, inače popust nema smisla.",
    };
  }

  const slugInput = str(form, "slug") || name;
  const slug = await uniqueSlug(slugInput, id);

  // Slike stižu kao jedan URL po redu; prazni redovi se ignorišu.
  const images = str(form, "images")
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter((url) => /^https?:\/\//i.test(url))
    .slice(0, 20);

  try {
    await transaction(async (client) => {
      await client.query(
        `UPDATE products SET
           name = $2, slug = $3, sku = $4, ean = $5, brand = $6,
           short_description = $7, description = $8,
           category_id = $9, price_bam = $10, compare_at_bam = $11,
           stock = $12, status = $13,
           price_locked = $14, content_locked = $15,
           is_featured = $16, is_new = $17,
           seo_title = $18, seo_description = $19,
           translation_status = CASE WHEN $15 THEN 'manual' ELSE translation_status END,
           updated_at = NOW()
         WHERE id = $1`,
        [
          id,
          name,
          slug,
          str(form, "sku") || null,
          str(form, "ean") || null,
          str(form, "brand") || null,
          str(form, "short_description") || null,
          str(form, "description") || null,
          Number(form.get("category_id")) || null,
          price,
          compareAt && compareAt > 0 ? compareAt : null,
          Math.max(0, Math.round(num(form, "stock", 0))),
          str(form, "status") || "draft",
          bool(form, "price_locked"),
          bool(form, "content_locked"),
          bool(form, "is_featured"),
          bool(form, "is_new"),
          str(form, "seo_title") || null,
          str(form, "seo_description") || null,
        ],
      );

      await client.query(`DELETE FROM product_images WHERE product_id = $1`, [id]);
      for (let i = 0; i < images.length; i++) {
        await client.query(
          `INSERT INTO product_images (product_id, url, sort_order) VALUES ($1, $2, $3)`,
          [id, images[i], i + 1],
        );
      }
    });

    revalidatePath("/admin/proizvodi");
    revalidatePath(`/admin/proizvodi/${id}`);
    revalidatePath(`/proizvod/${slug}`);
    revalidatePath("/shop");

    return { ok: true, message: "Proizvod je sačuvan." };
  } catch (err) {
    console.error("[saveProduct]", (err as Error).message);
    return { ok: false, message: `Greška pri snimanju: ${(err as Error).message}` };
  }
}

/** Brza promjena statusa iz liste, bez otvaranja proizvoda. */
export async function setProductStatus(
  id: number,
  status: "draft" | "active" | "archived",
): Promise<ProductState> {
  try {
    await requireUser("products");
  } catch {
    return { ok: false, message: "Nemate pravo uređivanja proizvoda." };
  }

  try {
    await execute(
      `UPDATE products SET status = $2, updated_at = NOW() WHERE id = $1`,
      [id, status],
    );
    revalidatePath("/admin/proizvodi");
    revalidatePath("/shop");
    return { ok: true, message: "Status je promijenjen." };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function deleteProduct(id: number): Promise<ProductState> {
  try {
    await requireUser("products");
  } catch {
    return { ok: false, message: "Nemate pravo brisanja proizvoda." };
  }

  try {
    await execute(`DELETE FROM products WHERE id = $1`, [id]);
    revalidatePath("/admin/proizvodi");
    revalidatePath("/shop");
    return { ok: true, message: "Proizvod je obrisan." };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
