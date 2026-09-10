import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Prevod naziva i opisa proizvoda na bosanski, preko Claude API-ja.
 *
 * Dva pravila koja drže uvoz sigurnim:
 *   1. Bez `ANTHROPIC_API_KEY` uvoz radi normalno - proizvod samo ostane na
 *      originalnom jeziku sa `translation_status = 'pending'`, pa se kasnije
 *      može prevesti ručno ili ponovnim pokretanjem.
 *   2. Neuspjeh prevoda nikad ne ruši uvoz. Vraća se original i greška se
 *      upiše u log uvoza.
 */

export type TranslateItem = {
  /** Naš interni ključ, da se odgovor može mapirati nazad na proizvod. */
  key: string;
  name: string;
  description?: string;
};

export type TranslateResult = {
  key: string;
  name: string;
  description: string;
};

/** Odgovor mora doći tačno u ovom obliku - garantuje structured output. */
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    prijevodi: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string" },
          naziv: { type: "string" },
          opis: { type: "string" },
        },
        required: ["key", "naziv", "opis"],
        additionalProperties: false,
      },
    },
  },
  required: ["prijevodi"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `Ti si prevodilac za bosansku web prodavnicu.

Prevodiš nazive i opise proizvoda sa bilo kojeg jezika na bosanski.

Pravila:
- Piši prirodnim bosanskim jezikom, onako kako bi pisao domaći prodavac.
- Koristi naša slova: č, ć, đ, š, ž.
- Nazive brendova, modela, šifre i mjerne jedinice ostavi nepromijenjene
  (Makita, DeWalt, USB-C, 20V, 1200 lm).
- Ako je opis HTML, zadrži iste tagove i prevedi samo tekst između njih.
- Ne dodaj informacije kojih nema u originalu i ne izmišljaj karakteristike.
- Ne piši marketinške fraze kojih nema u originalu.
- Ako je polje prazno, vrati prazan string.
- Naziv drži kratkim i jasnim, do 120 znakova ako je ikako moguće.

Vrati prijevod za svaki proizvod, sa istim "key" koji si dobio.`;

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic();
  return client;
}

export function isTranslationConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Prevede jednu grupu proizvoda. Grupa treba biti mala (5-15 stavki) da
 * odgovor stane u `max_tokens` i da se jedan neuspjeh ne odrazi na sve.
 */
export async function translateBatch(
  items: TranslateItem[],
  model = "claude-opus-5",
): Promise<{ results: TranslateResult[]; error?: string }> {
  if (items.length === 0) return { results: [] };

  const anthropic = getClient();
  if (!anthropic) {
    return { results: [], error: "ANTHROPIC_API_KEY nije postavljen." };
  }

  const payload = items.map((item) => ({
    key: item.key,
    naziv: item.name,
    opis: item.description ?? "",
  }));

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content:
            "Prevedi sljedeće proizvode na bosanski:\n\n" +
            JSON.stringify(payload, null, 2),
        },
      ],
      output_config: {
        format: { type: "json_schema", schema: RESPONSE_SCHEMA },
      },
    });

    if (response.stop_reason === "refusal") {
      return { results: [], error: "Model je odbio zahtjev za prevod." };
    }

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    if (!text.trim()) {
      return { results: [], error: "Prazan odgovor modela." };
    }

    const parsed = JSON.parse(text) as {
      prijevodi?: { key: string; naziv: string; opis: string }[];
    };

    const results = (parsed.prijevodi ?? []).map((row) => ({
      key: String(row.key),
      name: String(row.naziv ?? "").trim(),
      description: String(row.opis ?? "").trim(),
    }));

    return { results };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return { results: [], error: "Dostignut limit zahtjeva prema Claude API." };
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return { results: [], error: "ANTHROPIC_API_KEY nije ispravan." };
    }
    if (err instanceof Anthropic.APIError) {
      return { results: [], error: `Claude API greška ${err.status}: ${err.message}` };
    }
    return { results: [], error: (err as Error).message };
  }
}

/**
 * Prevede proizvoljan broj stavki, u grupama.
 * Vraća mapu key -> prijevod; stavke koje nisu prevedene jednostavno
 * nedostaju u mapi, pa pozivalac zadrži original.
 */
export async function translateAll(
  items: TranslateItem[],
  options: { model?: string; batchSize?: number } = {},
): Promise<{ map: Map<string, TranslateResult>; errors: string[] }> {
  const batchSize = Math.min(Math.max(options.batchSize ?? 10, 1), 25);
  const map = new Map<string, TranslateResult>();
  const errors: string[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const { results, error } = await translateBatch(batch, options.model);

    if (error) {
      errors.push(error);
      // Greška autentikacije ili limita se neće popraviti sama - prekini,
      // da ne trošimo vrijeme na preostale grupe.
      if (
        error.includes("API_KEY") ||
        error.includes("limit") ||
        error.includes("odbio")
      ) {
        break;
      }
      continue;
    }

    for (const result of results) map.set(result.key, result);
  }

  return { map, errors };
}
