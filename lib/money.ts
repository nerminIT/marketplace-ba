/**
 * Cijene, valute i marze.
 *
 * Jedna jedina putanja od nabavne cijene dobavljaca do nase prodajne cijene:
 *
 *   1. nabavna cijena u valuti dobavljaca  ->  KM  (kursna lista)
 *   2. + ulazna dostava (fiksno po komadu, u KM)   =  nabavna cijena (cost_bam)
 *   3. + marza (% i/ili fiksni iznos)
 *   4. + PDV ako ga dodajemo na maloprodajnu cijenu
 *   5. zaokruzivanje na "lijep" iznos                =  prodajna cijena (price_bam)
 *
 * Ova logika se koristi i pri uvozu i pri rucnom pregledu u CMS-u,
 * da bi obracun uvijek bio identican.
 */

export const BAM = "BAM";

/** EUR je fiksiran zakonom - nikad se ne povlaci sa vanjskog API-ja. */
export const FIXED_RATES: Record<string, number> = {
  BAM: 1,
  EUR: 1.95583,
};

export type RoundMode = "none" | "up_1" | "up_5" | "psych_90" | "psych_99";

export const ROUND_MODES: { value: RoundMode; label: string }[] = [
  { value: "none", label: "Bez zaokruzivanja (2 decimale)" },
  { value: "psych_90", label: "Na ,90 (npr. 34,90 KM)" },
  { value: "psych_99", label: "Na ,99 (npr. 34,99 KM)" },
  { value: "up_1", label: "Na punu marku navise (35 KM)" },
  { value: "up_5", label: "Na 5 KM navise (35 KM)" },
];

export type PricingInput = {
  /** Nabavna cijena kako je dobavljac salje. */
  costAmount: number;
  /** Valuta dobavljaca, npr. "EUR", "USD". */
  costCurrency: string;
  /** Kurs te valute prema KM. */
  rateToBam: number;
  /** Fiksni trosak ulazne dostave po komadu, u KM. */
  inboundShipBam?: number;
  marginPercent?: number;
  marginFixedBam?: number;
  vatPercent?: number;
  roundMode?: RoundMode;
};

export type PricingResult = {
  /** Nabavna cijena prevedena u KM, ukljucujuci ulaznu dostavu. */
  costBam: number;
  /** Prodajna cijena prije zaokruzivanja. */
  rawPriceBam: number;
  /** Konacna prodajna cijena. */
  priceBam: number;
  /** Zarada u KM po komadu. */
  profitBam: number;
  /** Zarada kao % prodajne cijene. */
  profitPercent: number;
};

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Zaokruzivanje uvijek ide NAVISE ili ostaje isto - nikad ispod izracunate
 * cijene, da zaokruzivanje ne bi pojelo marzu.
 */
export function applyRounding(value: number, mode: RoundMode = "none"): number {
  if (!isFinite(value) || value <= 0) return 0;

  switch (mode) {
    case "up_1":
      return Math.ceil(value);
    case "up_5":
      return Math.ceil(value / 5) * 5;
    case "psych_90": {
      const base = Math.floor(value);
      return round2(value <= base + 0.9 ? base + 0.9 : base + 1.9);
    }
    case "psych_99": {
      const base = Math.floor(value);
      return round2(value <= base + 0.99 ? base + 0.99 : base + 1.99);
    }
    case "none":
    default:
      return round2(value);
  }
}

/** Nabavna cijena dobavljaca prevedena u KM. */
export function toBam(amount: number, rateToBam: number): number {
  if (!isFinite(amount) || !isFinite(rateToBam)) return 0;
  return round2(amount * rateToBam);
}

/** Kompletan obracun prodajne cijene. */
export function calculatePrice(input: PricingInput): PricingResult {
  const {
    costAmount,
    rateToBam,
    inboundShipBam = 0,
    marginPercent = 0,
    marginFixedBam = 0,
    vatPercent = 0,
    roundMode = "none",
  } = input;

  const costBam = round2(toBam(costAmount, rateToBam) + inboundShipBam);
  const withMargin = costBam * (1 + marginPercent / 100) + marginFixedBam;
  const withVat = withMargin * (1 + vatPercent / 100);

  const rawPriceBam = round2(withVat);
  const priceBam = applyRounding(withVat, roundMode);
  const profitBam = round2(priceBam - costBam);
  const profitPercent = priceBam > 0 ? round2((profitBam / priceBam) * 100) : 0;

  return { costBam, rawPriceBam, priceBam, profitBam, profitPercent };
}

/**
 * Marzu bira prvo pravilo koje odgovara (najveci priority pobjeduje),
 * inace se koristi zadana marza dobavljaca.
 */
export type MarginRule = {
  category_id: number | null;
  min_cost_bam: number | null;
  max_cost_bam: number | null;
  margin_percent: number;
  margin_fixed_bam: number;
  priority: number;
};

export function resolveMargin(
  rules: MarginRule[],
  costBam: number,
  categoryId: number | null,
  fallback: { marginPercent: number; marginFixedBam: number },
): { marginPercent: number; marginFixedBam: number } {
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);

  for (const rule of sorted) {
    if (rule.category_id !== null && rule.category_id !== categoryId) continue;
    if (rule.min_cost_bam !== null && costBam < rule.min_cost_bam) continue;
    if (rule.max_cost_bam !== null && costBam > rule.max_cost_bam) continue;
    return {
      marginPercent: Number(rule.margin_percent),
      marginFixedBam: Number(rule.margin_fixed_bam),
    };
  }

  return fallback;
}

/** "1.234,50 KM" - bosanski format, tacka za hiljade, zarez za decimale. */
export function formatKM(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (n === null || n === undefined || !isFinite(n as number)) return "0,00 KM";

  const fixed = Math.abs(n as number).toFixed(2);
  const [whole, decimals] = fixed.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = (n as number) < 0 ? "-" : "";

  return `${sign}${grouped},${decimals} KM`;
}

/** Broj bez oznake valute, npr. za input polja. */
export function formatNumber(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (n === null || n === undefined || !isFinite(n as number)) return "0,00";
  return formatKM(n).replace(" KM", "");
}

/**
 * Cita broj iz teksta feeda. Dobavljaci salju "12.50", "12,50", "€12,50",
 * "1.234,56" ili "1,234.56" - sve to mora dati isti broj.
 */
export function parseNumber(raw: unknown): number {
  if (typeof raw === "number") return isFinite(raw) ? raw : 0;
  if (raw === null || raw === undefined) return 0;

  let s = String(raw).trim();
  if (!s) return 0;

  // skini sve osim cifara, zareza, tacke i minusa
  s = s.replace(/[^0-9.,-]/g, "");
  if (!s) return 0;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    // onaj koji je zadnji je decimalni separator
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    // "1,234" moze biti hiljade ili decimale - tri cifre iza znaci hiljade
    const after = s.length - lastComma - 1;
    s = after === 3 ? s.replace(/,/g, "") : s.replace(",", ".");
  }

  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}
