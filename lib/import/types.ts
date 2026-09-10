/**
 * Mapiranje kolona feeda na naša polja.
 *
 * Vrijednost je naziv kolone iz CSV-a onako kako je dobavljač zove.
 * Prazno znači "dobavljač to ne šalje".
 */
export type FieldMap = {
  external_id?: string;
  sku?: string;
  ean?: string;
  name?: string;
  short_description?: string;
  description?: string;
  brand?: string;
  category?: string;
  cost?: string;
  stock?: string;
  images?: string;
  weight?: string;
  url?: string;
};

/** Polja koja CMS nudi za mapiranje, redom kojim se prikazuju. */
export const FIELD_DEFS: {
  key: keyof FieldMap;
  label: string;
  hint: string;
  required?: boolean;
}[] = [
  {
    key: "external_id",
    label: "ID kod dobavljača",
    hint: "Jedinstvena šifra po kojoj prepoznajemo isti proizvod pri svakom uvozu.",
    required: true,
  },
  { key: "name", label: "Naziv", hint: "Naziv proizvoda, prevodi se na bosanski.", required: true },
  { key: "cost", label: "Nabavna cijena", hint: "Cijena u valuti dobavljača.", required: true },
  { key: "stock", label: "Zaliha", hint: "Broj komada. Ako nema, uzima se 0." },
  { key: "sku", label: "SKU / šifra", hint: "Šifra proizvoda koju prikazujemo kupcu." },
  { key: "ean", label: "EAN / barkod", hint: "" },
  { key: "brand", label: "Brend", hint: "" },
  { key: "category", label: "Kategorija", hint: "Naziv kategorije kod dobavljača; mapira se na našu." },
  { key: "short_description", label: "Kratki opis", hint: "" },
  { key: "description", label: "Opis", hint: "Puni opis, prevodi se na bosanski. Može biti HTML." },
  { key: "images", label: "Slike", hint: "Jedan ili više URL-ova, razdvojeni zarezom, tačka-zarezom ili |." },
  { key: "weight", label: "Težina (kg)", hint: "" },
  { key: "url", label: "Link kod dobavljača", hint: "Čuva se radi provjere, ne prikazuje se kupcu." },
];

export type ImportCounts = {
  rowsTotal: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
};

export type ImportLogEntry = {
  level: "info" | "warn" | "error";
  message: string;
  row?: number;
};

export type ImportOutcome = ImportCounts & {
  runId: number | null;
  status: "success" | "failed";
  message: string;
  log: ImportLogEntry[];
};

/** Jedan red feeda preveden u naša polja, prije upisa u bazu. */
export type MappedRow = {
  externalId: string;
  sku: string | null;
  ean: string | null;
  brand: string | null;
  name: string;
  shortDescription: string | null;
  description: string | null;
  categoryLabel: string | null;
  costAmount: number;
  stock: number;
  images: string[];
  weightKg: number | null;
  sourceUrl: string | null;
};
