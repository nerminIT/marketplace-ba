"use client";

import { useActionState, useMemo, useState } from "react";
import { saveProduct, type ProductState } from "@/app/actions/products";
import { formatKM } from "@/lib/money";

export type ProductFormValues = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  ean: string;
  brand: string;
  short_description: string;
  description: string;
  category_id: number | null;
  cost_bam: number;
  cost_amount: number;
  cost_currency: string;
  price_bam: number;
  compare_at_bam: number | null;
  stock: number;
  status: string;
  price_locked: boolean;
  content_locked: boolean;
  is_featured: boolean;
  is_new: boolean;
  seo_title: string;
  seo_description: string;
  images: string[];
  name_source: string | null;
  supplier_name: string | null;
  translation_status: string;
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card mb-6 p-6">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {description ? (
        <p className="mt-1 mb-5 text-sm text-ink-2">{description}</p>
      ) : (
        <div className="mb-5" />
      )}
      {children}
    </section>
  );
}

export default function ProductForm({
  values,
  categories,
}: {
  values: ProductFormValues;
  categories: { id: number; name: string }[];
}) {
  const [state, action, pending] = useActionState<ProductState, FormData>(
    saveProduct,
    null,
  );

  const [price, setPrice] = useState(values.price_bam);
  const cost = Number(values.cost_bam);

  const profit = useMemo(() => {
    const value = price - cost;
    const percent = price > 0 ? Math.round((value / price) * 100) : 0;
    return { value, percent };
  }, [price, cost]);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={values.id} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {/* ------------------------------------------------------- sadržaj */}
          <Section title="Naziv i opis">
            <div>
              <label htmlFor="name" className="label">
                Naziv *
              </label>
              <input
                id="name"
                name="name"
                required
                defaultValue={values.name}
                className="field"
              />
              {values.name_source && values.name_source !== values.name ? (
                <p className="mt-1 text-xs text-ink-3">
                  Original od dobavljača: {values.name_source}
                </p>
              ) : null}
            </div>

            <div className="mt-4">
              <label htmlFor="slug" className="label">
                Slug (adresa)
              </label>
              <input
                id="slug"
                name="slug"
                defaultValue={values.slug}
                className="field font-mono text-xs"
              />
              <p className="mt-1 text-xs text-ink-3">
                /proizvod/{values.slug}
              </p>
            </div>

            <div className="mt-4">
              <label htmlFor="short_description" className="label">
                Kratki opis
              </label>
              <textarea
                id="short_description"
                name="short_description"
                rows={2}
                defaultValue={values.short_description}
                className="field"
              />
            </div>

            <div className="mt-4">
              <label htmlFor="description" className="label">
                Opis (HTML)
              </label>
              <textarea
                id="description"
                name="description"
                rows={10}
                defaultValue={values.description}
                className="field font-mono text-xs"
              />
            </div>
          </Section>

          {/* --------------------------------------------------------- slike */}
          <Section
            title="Slike"
            description="Jedan URL po redu. Prva slika je glavna."
          >
            <textarea
              name="images"
              rows={Math.max(values.images.length + 1, 3)}
              defaultValue={values.images.join("\n")}
              className="field font-mono text-xs"
              placeholder="https://..."
            />
          </Section>

          {/* ----------------------------------------------------------- SEO */}
          <Section title="SEO">
            <div className="grid gap-4">
              <div>
                <label htmlFor="seo_title" className="label">
                  SEO naslov
                </label>
                <input
                  id="seo_title"
                  name="seo_title"
                  defaultValue={values.seo_title}
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="seo_description" className="label">
                  SEO opis
                </label>
                <textarea
                  id="seo_description"
                  name="seo_description"
                  rows={2}
                  defaultValue={values.seo_description}
                  className="field"
                />
              </div>
            </div>
          </Section>
        </div>

        {/* ----------------------------------------------------- bočna kolona */}
        <div>
          <Section title="Cijena i zaliha">
            <div className="mb-4 border border-line bg-ground p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-3">Nabavno</span>
                <span className="text-ink">{formatKM(cost)}</span>
              </div>
              {values.cost_amount > 0 ? (
                <div className="mt-1 flex justify-between text-xs">
                  <span className="text-ink-3">Od dobavljača</span>
                  <span className="text-ink-3">
                    {values.cost_amount} {values.cost_currency}
                  </span>
                </div>
              ) : null}
              <div className="mt-2 flex justify-between border-t border-line pt-2">
                <span className="text-ink-3">Zarada</span>
                <span className={profit.value >= 0 ? "text-ok" : "text-sale"}>
                  {formatKM(profit.value)} ({profit.percent}%)
                </span>
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <label htmlFor="price_bam" className="label">
                  Prodajna cijena (KM) *
                </label>
                <input
                  id="price_bam"
                  name="price_bam"
                  type="number"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  className="field"
                />
              </div>

              <div>
                <label htmlFor="compare_at_bam" className="label">
                  Stara cijena (KM)
                </label>
                <input
                  id="compare_at_bam"
                  name="compare_at_bam"
                  type="number"
                  step="0.01"
                  defaultValue={values.compare_at_bam ?? ""}
                  className="field"
                />
                <p className="mt-1 text-xs text-ink-3">
                  Prikazuje se precrtano. Mora biti veća od prodajne.
                </p>
              </div>

              <div>
                <label htmlFor="stock" className="label">
                  Zaliha (kom)
                </label>
                <input
                  id="stock"
                  name="stock"
                  type="number"
                  defaultValue={values.stock}
                  className="field"
                />
              </div>
            </div>
          </Section>

          <Section title="Objava">
            <div className="grid gap-4">
              <div>
                <label htmlFor="status" className="label">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={values.status}
                  className="field"
                >
                  <option value="draft">Skica — nije na shopu</option>
                  <option value="active">Aktivan — vidljiv kupcima</option>
                  <option value="archived">Arhiviran</option>
                </select>
              </div>

              <div>
                <label htmlFor="category_id" className="label">
                  Kategorija
                </label>
                <select
                  id="category_id"
                  name="category_id"
                  defaultValue={values.category_id ?? ""}
                  className="field"
                >
                  <option value="">— bez kategorije —</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 divide-y divide-line border-t border-line">
              <label className="flex cursor-pointer items-center gap-3 py-2 text-sm">
                <input
                  type="checkbox"
                  name="is_featured"
                  defaultChecked={values.is_featured}
                  className="h-4 w-4 accent-[var(--color-brand)]"
                />
                Istaknut na početnoj
              </label>
              <label className="flex cursor-pointer items-center gap-3 py-2 text-sm">
                <input
                  type="checkbox"
                  name="is_new"
                  defaultChecked={values.is_new}
                  className="h-4 w-4 accent-[var(--color-brand)]"
                />
                Oznaka &bdquo;Novo&ldquo;
              </label>
            </div>
          </Section>

          {/* ----------------------------------------------------- zaključavanje */}
          <Section
            title="Zaštita od uvoza"
            description="Zaključana polja sljedeći uvoz od dobavljača neće promijeniti."
          >
            <label className="flex cursor-pointer items-start gap-3 py-2">
              <input
                type="checkbox"
                name="price_locked"
                defaultChecked={values.price_locked}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand)]"
              />
              <span>
                <span className="block text-sm text-ink">Zaključaj cijenu</span>
                <span className="block text-xs text-ink-3">
                  Uvoz i dalje osvježava nabavnu cijenu i zalihu.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 border-t border-line py-2">
              <input
                type="checkbox"
                name="content_locked"
                defaultChecked={values.content_locked}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand)]"
              />
              <span>
                <span className="block text-sm text-ink">
                  Zaključaj naziv i opis
                </span>
                <span className="block text-xs text-ink-3">
                  Sprječava i automatski prevod da pregazi vaš tekst.
                </span>
              </span>
            </label>
          </Section>

          <Section title="Podaci dobavljača">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-3">Dobavljač</dt>
                <dd className="text-right text-ink">
                  {values.supplier_name ?? "ručni unos"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-3">Prevod</dt>
                <dd className="text-right text-ink">
                  {values.translation_status === "done"
                    ? "preveden"
                    : values.translation_status === "manual"
                      ? "ručno"
                      : values.translation_status === "failed"
                        ? "neuspio"
                        : "čeka"}
                </dd>
              </div>
            </dl>

            <div className="mt-4 grid gap-3">
              <div>
                <label htmlFor="sku" className="label">
                  SKU
                </label>
                <input id="sku" name="sku" defaultValue={values.sku} className="field" />
              </div>
              <div>
                <label htmlFor="ean" className="label">
                  EAN
                </label>
                <input id="ean" name="ean" defaultValue={values.ean} className="field" />
              </div>
              <div>
                <label htmlFor="brand" className="label">
                  Brend
                </label>
                <input
                  id="brand"
                  name="brand"
                  defaultValue={values.brand}
                  className="field"
                />
              </div>
            </div>
          </Section>
        </div>
      </div>

      <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t border-line bg-surface px-6 py-4">
        {state ? (
          <p className={`text-sm ${state.ok ? "text-ok" : "text-sale"}`}>
            {state.message}
          </p>
        ) : (
          <span />
        )}

        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Snimam..." : "Sačuvaj proizvod"}
        </button>
      </div>
    </form>
  );
}
