"use server";

import { revalidatePath } from "next/cache";
import { execute, queryOne } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { slugify } from "@/lib/slug";

export type CategoryState = { ok: boolean; message: string; id?: number } | null;

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}
function bool(form: FormData, key: string): boolean {
  return form.get(key) === "on" || form.get(key) === "true";
}

async function uniqueSlug(base: string, id?: number): Promise<string> {
  const root = slugify(base) || "kategorija";

  for (let i = 0; i < 200; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const clash = await queryOne<{ id: number }>(
      `SELECT id FROM categories WHERE slug = $1`,
      [candidate],
    );
    if (!clash || clash.id === id) return candidate;
  }

  return `${root}-${Date.now().toString(36)}`;
}

/** Spriječi da kategorija postane vlastiti potomak (ciklus u stablu). */
async function wouldCreateCycle(id: number, parentId: number): Promise<boolean> {
  let current: number | null = parentId;

  for (let i = 0; i < 20 && current !== null; i++) {
    if (current === id) return true;
    const row: { parent_id: number | null } | null = await queryOne(
      `SELECT parent_id FROM categories WHERE id = $1`,
      [current],
    );
    current = row?.parent_id ?? null;
  }

  return false;
}

export async function saveCategory(
  _prev: CategoryState,
  form: FormData,
): Promise<CategoryState> {
  try {
    await requireUser("categories");
  } catch {
    return { ok: false, message: "Nemate pravo uređivanja kategorija." };
  }

  const id = Number(form.get("id")) || 0;
  const name = str(form, "name");

  if (name.length < 2) return { ok: false, message: "Unesite naziv kategorije." };

  const parentId = Number(form.get("parent_id")) || null;

  if (id && parentId && (await wouldCreateCycle(id, parentId))) {
    return {
      ok: false,
      message: "Kategorija ne može biti smještena unutar same sebe.",
    };
  }

  const slug = await uniqueSlug(str(form, "slug") || name, id || undefined);

  const values = [
    name,
    slug,
    parentId,
    str(form, "description") || null,
    str(form, "image_url") || null,
    Number(form.get("sort_order")) || 0,
    bool(form, "active"),
    bool(form, "show_in_menu"),
    bool(form, "show_on_home"),
    str(form, "seo_title") || null,
    str(form, "seo_description") || null,
  ];

  try {
    if (id) {
      await execute(
        `UPDATE categories SET
           name = $2, slug = $3, parent_id = $4, description = $5, image_url = $6,
           sort_order = $7, active = $8, show_in_menu = $9, show_on_home = $10,
           seo_title = $11, seo_description = $12, updated_at = NOW()
         WHERE id = $1`,
        [id, ...values],
      );
    } else {
      const row = await queryOne<{ id: number }>(
        `INSERT INTO categories
           (name, slug, parent_id, description, image_url, sort_order,
            active, show_in_menu, show_on_home, seo_title, seo_description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        values,
      );

      revalidatePath("/admin/kategorije");
      revalidatePath("/");
      return { ok: true, message: "Kategorija je dodana.", id: row?.id };
    }

    revalidatePath("/admin/kategorije");
    revalidatePath("/");
    revalidatePath(`/kategorija/${slug}`);
    return { ok: true, message: "Izmjene su sačuvane.", id };
  } catch (err) {
    console.error("[saveCategory]", (err as Error).message);
    return { ok: false, message: `Greška pri snimanju: ${(err as Error).message}` };
  }
}

export async function deleteCategory(id: number): Promise<CategoryState> {
  try {
    await requireUser("categories");
  } catch {
    return { ok: false, message: "Nemate pravo brisanja kategorija." };
  }

  const inUse = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM products WHERE category_id = $1`,
    [id],
  );

  if ((inUse?.n ?? 0) > 0) {
    return {
      ok: false,
      message: `Kategorija se koristi na ${inUse!.n} proizvoda. Prvo ih premjestite.`,
    };
  }

  try {
    // Podkategorije ostaju, samo im se veza prekida (ON DELETE SET NULL).
    await execute(`DELETE FROM categories WHERE id = $1`, [id]);
    revalidatePath("/admin/kategorije");
    revalidatePath("/");
    return { ok: true, message: "Kategorija je obrisana." };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
