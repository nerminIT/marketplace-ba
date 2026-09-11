/**
 * Datumi na bosanskom.
 *
 * NE koristi `toLocaleDateString("bs-BA", ...)`. Vecina ICU izdanja nema
 * bosanska imena mjeseci, pa umjesto "10. septembar" ispise "M09 10" -
 * greska koja prodje nezapazeno u kodu, a kupcu je odmah vidljiva.
 * Zato su imena mjeseci ovdje ispisana rucno.
 */

const MJESECI = [
  "januar",
  "februar",
  "mart",
  "april",
  "maj",
  "juni",
  "juli",
  "august",
  "septembar",
  "oktobar",
  "novembar",
  "decembar",
];

const MJESECI_KRATKO = [
  "jan",
  "feb",
  "mar",
  "apr",
  "maj",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;

  // Datum bez vremena ("2026-09-11") tumaci se kao lokalna ponoc, ne UTC -
  // inace se u nasoj vremenskoj zoni prikaze dan ranije.
  const d =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(value + "T00:00:00")
      : new Date(value);

  return isNaN(d.getTime()) ? null : d;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** "11.09.2026." */
export function datum(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}.`;
}

/** "11.09.2026. u 14:30" */
export function datumVrijeme(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${datum(d)} u ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "11. septembar 2026." */
export function datumDugi(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${d.getDate()}. ${MJESECI[d.getMonth()]} ${d.getFullYear()}.`;
}

/** "11. septembar" - bez godine, za tooltipove i kratke oznake. */
export function datumBezGodine(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${d.getDate()}. ${MJESECI[d.getMonth()]}`;
}

/** "11. sep" - za oznake na osi grafikona, gdje mjesta nema. */
export function datumKratki(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${d.getDate()}. ${MJESECI_KRATKO[d.getMonth()]}`;
}

/** "11.09." - najkraci oblik, za gustu vremensku osu. */
export function danMjesec(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

/** "prije 3 dana", "danas", "juče" - za liste gdje je svjezina bitna. */
export function relativno(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";

  const dani = Math.floor(
    (new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) /
      86_400_000,
  );

  if (dani === 0) return "danas";
  if (dani === 1) return "juče";
  if (dani < 0) return datum(d);
  if (dani < 7) return `prije ${dani} dana`;

  return datum(d);
}
