/** Pretvaranje naziva u URL slug, sa nasim slovima. */

const MAP: Record<string, string> = {
  č: "c",
  ć: "c",
  đ: "dj",
  š: "s",
  ž: "z",
  Č: "c",
  Ć: "c",
  Đ: "dj",
  Š: "s",
  Ž: "z",
  ä: "a",
  ö: "o",
  ü: "u",
  ß: "ss",
  å: "a",
  ø: "o",
  æ: "ae",
  ñ: "n",
  ç: "c",
};

// Kombinujuci dijakriticki znakovi (U+0300 - U+036F) koje NFKD odvoji od slova.
const COMBINING = new RegExp(
  "[" + String.fromCharCode(0x300) + "-" + String.fromCharCode(0x36f) + "]",
  "g",
);

export function slugify(input: string): string {
  if (!input) return "";

  const replaced = input
    .split("")
    .map((ch) => MAP[ch] ?? ch)
    .join("");

  return replaced
    .normalize("NFKD")
    .replace(COMBINING, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

/**
 * Slug koji sigurno ne postoji u bazi. `exists` provjerava jedan slug i
 * vraca true ako je zauzet.
 */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
  fallback = "stavka",
): Promise<string> {
  const root = slugify(base) || fallback;

  if (!(await exists(root))) return root;

  for (let i = 2; i < 500; i++) {
    const candidate = `${root}-${i}`;
    if (!(await exists(candidate))) return candidate;
  }

  return `${root}-${Date.now().toString(36)}`;
}
