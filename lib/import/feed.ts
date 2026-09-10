import "server-only";
import { parseCsv, type ParsedCsv } from "@/lib/csv";
import { parseNumber } from "@/lib/money";
import type { FieldMap, MappedRow } from "./types";

/** Preuzimanje i razlaganje feeda. Nema dodira sa bazom. */

const FETCH_TIMEOUT_MS = 60_000;
const MAX_FEED_BYTES = 60 * 1024 * 1024;

export async function fetchFeedText(
  url: string,
  options: { headers?: Record<string, string>; encoding?: string } = {},
): Promise<string> {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("Adresa feeda mora počinjati sa http:// ili https://");
  }

  const response = await fetch(url, {
    headers: {
      // Neki dobavljači odbijaju zahtjeve bez prepoznatljivog agenta.
      "user-agent": "marketplace-ba-import/1.0",
      ...(options.headers ?? {}),
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Feed nije dostupan (HTTP ${response.status} ${response.statusText}).`,
    );
  }

  const buffer = await response.arrayBuffer();

  if (buffer.byteLength > MAX_FEED_BYTES) {
    throw new Error(
      `Feed je prevelik (${Math.round(buffer.byteLength / 1024 / 1024)} MB).`,
    );
  }

  const encoding = (options.encoding || "utf-8").toLowerCase();

  try {
    return new TextDecoder(encoding).decode(buffer);
  } catch {
    // Nepoznato kodiranje - pokušaj kao UTF-8 umjesto da pukne uvoz.
    return new TextDecoder("utf-8").decode(buffer);
  }
}

export function parseFeed(
  text: string,
  options: { delimiter?: string; maxRows?: number } = {},
): ParsedCsv {
  return parseCsv(text, options);
}

/** Slike znaju stizati razdvojene zarezom, tačka-zarezom, cijevi ili razmakom. */
function splitImages(raw: string): string[] {
  if (!raw) return [];

  return raw
    .split(/[|;,\s]+/)
    .map((url) => url.trim())
    .filter((url) => /^https?:\/\//i.test(url))
    .slice(0, 10);
}

/** Prevede jedan red feeda u naša polja. Vraća null ako red nije upotrebljiv. */
export function mapRow(
  row: Record<string, string>,
  map: FieldMap,
): { value: MappedRow } | { error: string } {
  const get = (key: keyof FieldMap): string => {
    const column = map[key];
    if (!column) return "";
    return (row[column] ?? "").trim();
  };

  const externalId = get("external_id") || get("sku");
  if (!externalId) {
    return { error: "Red nema ID kod dobavljača ni SKU - ne može se pratiti." };
  }

  const name = get("name");
  if (!name) return { error: `Red ${externalId} nema naziv.` };

  const costRaw = get("cost");
  const costAmount = parseNumber(costRaw);
  if (costAmount <= 0) {
    return {
      error: `Red ${externalId} nema upotrebljivu nabavnu cijenu (pročitano: "${costRaw}").`,
    };
  }

  const stockRaw = get("stock");
  const stock = stockRaw ? Math.max(0, Math.round(parseNumber(stockRaw))) : 0;

  const weightRaw = get("weight");
  const weightKg = weightRaw ? parseNumber(weightRaw) : null;

  const url = get("url");

  return {
    value: {
      externalId,
      sku: get("sku") || null,
      ean: get("ean") || null,
      brand: get("brand") || null,
      name,
      shortDescription: get("short_description") || null,
      description: get("description") || null,
      categoryLabel: get("category") || null,
      costAmount,
      stock,
      images: splitImages(get("images")),
      weightKg: weightKg && weightKg > 0 ? weightKg : null,
      sourceUrl: /^https?:\/\//i.test(url) ? url : null,
    },
  };
}
