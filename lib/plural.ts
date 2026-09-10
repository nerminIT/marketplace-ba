/**
 * Množina u bosanskom jeziku.
 *
 * Tri oblika, po zadnjoj cifri:
 *   1, 21, 31...        -> jednina        (1 red, 21 red)
 *   2-4, 22-24...       -> paukal         (2 reda, 23 reda)
 *   0, 5-9, 11-14...    -> genitiv množine (5 redova, 12 redova)
 *
 * Brojevi 11-14 su izuzetak i uvijek idu u treći oblik.
 */
export function plural(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const n = Math.abs(Math.trunc(count));
  const lastTwo = n % 100;
  const last = n % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

/** Broj sa pravilnim oblikom riječi, npr. "3 reda". */
export function pluralize(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  return `${count} ${plural(count, one, few, many)}`;
}

export const RED = ["red", "reda", "redova"] as const;
export const PROIZVOD = ["proizvod", "proizvoda", "proizvoda"] as const;
export const KOLONA = ["kolona", "kolone", "kolona"] as const;
export const KATEGORIJA = ["kategorija", "kategorije", "kategorija"] as const;
export const DOBAVLJAC = ["dobavljač", "dobavljača", "dobavljača"] as const;
export const KOMAD = ["komad", "komada", "komada"] as const;
