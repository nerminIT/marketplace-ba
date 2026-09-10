"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { saveCategory, type CategoryState } from "@/app/actions/categories";

export type CategoryFormValues = {
  id?: number;
  name: string;
  slug: string;
  parent_id: number | null;
  description: string;
  image_url: string;
  sort_order: number;
  active: boolean;
  show_in_menu: boolean;
  show_on_home: boolean;
  seo_title: string;
  seo_description: string;
};

export default function CategoryForm({
  values,
  parents,
  compact = false,
}: {
  values: CategoryFormValues;
  /** Moguće nadređene kategorije (bez same sebe i svojih potomaka). */
  parents: { id: number; name: string }[];
  compact?: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<CategoryState, FormData>(
    saveCategory,
    null,
  );

  const [done, setDone] = useState(false);
  if (state?.ok && !values.id && !done) {
    setDone(true);
    router.refresh();
  }

  return (
    <form action={action} className="grid gap-4">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <div className={compact ? "grid gap-4 sm:grid-cols-3" : "grid gap-4 sm:grid-cols-2"}>
        <div>
          <label htmlFor={`name-${values.id ?? "new"}`} className="label">
            Naziv *
          </label>
          <input
            id={`name-${values.id ?? "new"}`}
            name="name"
            required
            defaultValue={values.name}
            className="field"
            placeholder="npr. Alati"
          />
        </div>

        <div>
          <label htmlFor={`parent-${values.id ?? "new"}`} className="label">
            Nadređena kategorija
          </label>
          <select
            id={`parent-${values.id ?? "new"}`}
            name="parent_id"
            defaultValue={values.parent_id ?? ""}
            className="field"
          >
            <option value="">— glavna kategorija —</option>
            {parents.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.name}
              </option>
            ))}
          </select>
        </div>

        {compact ? (
          <div className="flex items-end">
            <button type="submit" disabled={pending} className="btn-primary w-full">
              {pending ? "Snimam..." : "Dodaj"}
            </button>
          </div>
        ) : null}
      </div>

      {!compact ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="slug" className="label">
                Slug (adresa)
              </label>
              <input
                id="slug"
                name="slug"
                defaultValue={values.slug}
                className="field font-mono text-xs"
              />
            </div>

            <div>
              <label htmlFor="sort_order" className="label">
                Redoslijed
              </label>
              <input
                id="sort_order"
                name="sort_order"
                type="number"
                defaultValue={values.sort_order}
                className="field"
              />
              <p className="mt-1 text-xs text-ink-3">Manji broj ide prvi.</p>
            </div>
          </div>

          <div>
            <label htmlFor="image_url" className="label">
              Slika kategorije (URL)
            </label>
            <input
              id="image_url"
              name="image_url"
              defaultValue={values.image_url}
              className="field"
              placeholder="https://..."
            />
          </div>

          <div>
            <label htmlFor="description" className="label">
              Opis
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={values.description}
              className="field"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
              <input
                id="seo_description"
                name="seo_description"
                defaultValue={values.seo_description}
                className="field"
              />
            </div>
          </div>
        </>
      ) : null}

      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={values.active}
            className="h-4 w-4 accent-[var(--color-brand)]"
          />
          Aktivna
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="show_in_menu"
            defaultChecked={values.show_in_menu}
            className="h-4 w-4 accent-[var(--color-brand)]"
          />
          U meniju
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="show_on_home"
            defaultChecked={values.show_on_home}
            className="h-4 w-4 accent-[var(--color-brand)]"
          />
          Na početnoj
        </label>
      </div>

      {!compact ? (
        <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
          {state ? (
            <p className={`text-sm ${state.ok ? "text-ok" : "text-sale"}`}>
              {state.message}
            </p>
          ) : (
            <span />
          )}
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Snimam..." : "Sačuvaj"}
          </button>
        </div>
      ) : state ? (
        <p className={`text-sm ${state.ok ? "text-ok" : "text-sale"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
