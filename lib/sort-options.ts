/**
 * Opcije sortiranja u shopu.
 *
 * Namjerno u zasebnom fajlu: `ShopToolbar` je klijentska komponenta, a
 * `lib/queries.ts` povlaci `pg`. Da toolbar uvozi opcije odatle, cijeli
 * PostgreSQL drajver bi zavrsio u klijentskom bundleu.
 */

export const SORT_OPTIONS = [
  { value: "novo", label: "Najnovije" },
  { value: "popularno", label: "Najpopularnije" },
  { value: "cijena-rastuce", label: "Cijena: niža prvo" },
  { value: "cijena-opadajuce", label: "Cijena: viša prvo" },
  { value: "naziv", label: "Naziv A-Ž" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export const DEFAULT_SORT: SortValue = "novo";
