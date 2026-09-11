/**
 * Periodi nadzorne ploce i statusi narudzbi.
 *
 * Zaseban fajl bez ijedne zavisnosti, jer ovo dijele server i klijent:
 * `PeriodFilter` je klijentska komponenta, a `lib/analytics.ts` povlaci `pg`.
 * Da filter uvozi odatle, PostgreSQL drajver bi zavrsio u browser bundleu.
 */

export type Period = "danas" | "sedmica" | "mjesec" | "godina";

export const PERIODS: { value: Period; label: string }[] = [
  { value: "danas", label: "Danas" },
  { value: "sedmica", label: "Ova sedmica" },
  { value: "mjesec", label: "Ovaj mjesec" },
  { value: "godina", label: "Ova godina" },
];

export const DEFAULT_PERIOD: Period = "mjesec";

export function periodLabel(period: Period): string {
  return PERIODS.find((p) => p.value === period)?.label ?? "Ovaj mjesec";
}

export function parsePeriod(raw: string | undefined): Period {
  return PERIODS.some((p) => p.value === raw) ? (raw as Period) : DEFAULT_PERIOD;
}

/**
 * Statusi narudzbi, redom kojim narudzba prolazi kroz obradu.
 * `viz` je slot u paleti grafikona - fiksan, nikad se ne rotira.
 */
export const ORDER_STATUSES = [
  { value: "nova", label: "Nova", viz: 1 },
  { value: "u_obradi", label: "U obradi", viz: 2 },
  { value: "poslana", label: "Poslana", viz: 3 },
  { value: "zavrsena", label: "Završena", viz: 4 },
  { value: "otkazana", label: "Otkazana", viz: 5 },
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number]["value"];

export function orderStatusLabel(value: string): string {
  return ORDER_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export const PAYMENT_STATUSES = [
  { value: "neplaceno", label: "Neplaćeno" },
  { value: "placeno", label: "Plaćeno" },
  { value: "vraceno", label: "Vraćeno" },
  { value: "neuspjelo", label: "Neuspjelo" },
] as const;

export function paymentStatusLabel(value: string): string {
  return PAYMENT_STATUSES.find((s) => s.value === value)?.label ?? value;
}
