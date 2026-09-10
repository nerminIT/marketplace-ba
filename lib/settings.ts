import { cache } from "react";
import { query, execute } from "./db";

/**
 * Postavke sajta. Cuvaju se kao par kljuc -> JSONB u tabeli `settings`.
 * Sve ima razuman default, pa sajt radi i prije nego se ista upise.
 */

export type SiteSettings = {
  name: string;
  tagline: string;
  description: string;
  email: string;
  phone: string;
  viber: string;
  whatsapp: string;
  address: string;
  facebook: string;
  instagram: string;
  tiktok: string;
};

export type ShopSettings = {
  /** Cijena dostave u KM. */
  shippingBam: number;
  /** Iznad ovog iznosa dostava je besplatna. 0 = nikad besplatna. */
  freeShippingOverBam: number;
  /** Prikazi proizvode bez zaliha na shopu. */
  showOutOfStock: boolean;
  /** Dozvoli narudzbu bez zaliha. */
  allowBackorder: boolean;
  deliveryNote: string;
  returnNote: string;
  warrantyNote: string;
};

export type ImportSettings = {
  /** Model koji se koristi za prevod na bosanski. */
  translateModel: string;
  /** Koliko proizvoda se prevodi u jednom zahtjevu. */
  translateBatchSize: number;
  /** Maksimalno redova po jednom uvozu (zastita od ogromnih feedova). */
  maxRowsPerRun: number;
};

export type AllSettings = {
  site: SiteSettings;
  shop: ShopSettings;
  import: ImportSettings;
};

export const DEFAULT_SETTINGS: AllSettings = {
  site: {
    name: "Marketplace BA",
    tagline: "Sve na jednom mjestu",
    description:
      "Online prodavnica sa sirokim asortimanom provjerenih proizvoda i dostavom na kucnu adresu.",
    email: "",
    phone: "",
    viber: "",
    whatsapp: "",
    address: "Bosna i Hercegovina",
    facebook: "",
    instagram: "",
    tiktok: "",
  },
  shop: {
    shippingBam: 10,
    freeShippingOverBam: 100,
    showOutOfStock: true,
    allowBackorder: false,
    deliveryNote: "Dostava u roku od 24h do 48h",
    returnNote: "14 dana pravo na povrat",
    warrantyNote: "Garancija na sve proizvode",
  },
  import: {
    translateModel: "claude-opus-5",
    translateBatchSize: 10,
    maxRowsPerRun: 5000,
  },
};

type SettingsRow = { key: string; value: Record<string, unknown> };

function merge<T extends object>(base: T, override: unknown): T {
  if (!override || typeof override !== "object") return base;
  return { ...base, ...(override as Partial<T>) };
}

/**
 * Ucitaj sve postavke. `cache` dedupira poziv unutar jednog zahtjeva,
 * tako da vise komponenti moze slobodno zvati ovo bez dodatnih upita.
 */
export const getSettings = cache(async (): Promise<AllSettings> => {
  let rows: SettingsRow[] = [];

  try {
    rows = await query<SettingsRow>(`SELECT key, value FROM settings`);
  } catch {
    // Baza jos nije migrirana - vrati defaulte umjesto da srusi stranicu.
    return DEFAULT_SETTINGS;
  }

  const byKey = new Map(rows.map((r) => [r.key, r.value]));

  return {
    site: merge(DEFAULT_SETTINGS.site, byKey.get("site")),
    shop: merge(DEFAULT_SETTINGS.shop, byKey.get("shop")),
    import: merge(DEFAULT_SETTINGS.import, byKey.get("import")),
  };
});

/** Upisi jednu grupu postavki. */
export async function saveSettings(
  key: keyof AllSettings,
  value: Record<string, unknown>,
): Promise<void> {
  await execute(
    `INSERT INTO settings (key, value, updated_at)
          VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, JSON.stringify(value)],
  );
}
