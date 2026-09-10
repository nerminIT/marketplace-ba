/**
 * Demo proizvodi - SAMO da bi se vidjelo kako sajt izgleda dok pravi uvoz
 * jos nije podesen. Nikad se ne pokrece automatski.
 *
 *   node scripts/seed-demo.js          ubaci demo proizvode
 *   node scripts/seed-demo.js --clear  obrisi ih sve
 *
 * Svi demo zapisi imaju SKU koji pocinje sa "DEMO-", pa se ciste jednim
 * upitom i nikad se ne mijesaju sa stvarnim proizvodima iz feedova.
 */
const { Client } = require("pg");

function buildUrlFromParts() {
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "5432";
  const name = process.env.DB_NAME || process.env.DB_DATABASE || "marketplace";
  const user = process.env.DB_USER || process.env.DB_USERNAME || "postgres";
  const pass = process.env.DB_PASS || process.env.DB_PASSWORD || "";
  return (
    "postgres://" +
    encodeURIComponent(user) +
    ":" +
    encodeURIComponent(pass) +
    "@" +
    host +
    ":" +
    port +
    "/" +
    name
  );
}

const connectionString = process.env.DATABASE_URL || buildUrlFromParts();
const clearOnly = process.argv.includes("--clear");

const EUR_TO_BAM = 1.95583;

/** Isti obracun kao lib/money.ts: marza pa zaokruzivanje na ,90. */
function priceFrom(costEur, marginPercent) {
  const costBam = Math.round(costEur * EUR_TO_BAM * 100) / 100;
  const withMargin = costBam * (1 + marginPercent / 100);
  const base = Math.floor(withMargin);
  const price = withMargin <= base + 0.9 ? base + 0.9 : base + 1.9;
  return { costBam, price: Math.round(price * 100) / 100 };
}

// naziv, slug, kategorija (slug), nabavna u EUR, marza %, zaliha, akcija?, istaknut?
const DEMO = [
  ["Aku bušilica 20V sa dva akumulatora", "aku-busilica-20v", "alati", 32, 45, 14, false, true],
  ["Set odvijača 42 dijela", "set-odvijaca-42-dijela", "alati", 9.5, 60, 40, true, false],
  ["Ugaona brusilica 900W", "ugaona-brusilica-900w", "alati", 24, 45, 8, false, false],
  ["Digitalni multimetar sa mjeračem", "digitalni-multimetar", "alati", 11, 55, 22, false, false],
  ["Solarna zidna lampa - set 4 kom", "solarna-zidna-lampa-set", "dom-i-basta", 12, 50, 35, true, true],
  ["Baštenska pumpa za vodu 750W", "bastenska-pumpa-750w", "dom-i-basta", 38, 40, 6, false, false],
  ["Set posuđa od 8 dijelova", "set-posudja-8-dijelova", "dom-i-basta", 27, 45, 11, false, false],
  ["Bežične slušalice sa kutijicom", "bezicne-slusalice", "tehnika", 14, 60, 50, true, true],
  ["Pametni sat sa mjerenjem pulsa", "pametni-sat-puls", "tehnika", 19, 55, 18, false, false],
  ["Prenosivi Bluetooth zvučnik 20W", "bluetooth-zvucnik-20w", "tehnika", 16, 50, 25, false, false],
  ["Taktički ruksak 30 L", "takticki-ruksak-30l", "sport-i-outdoor", 17, 50, 12, false, true],
  ["Stolica za kampovanje sklopiva", "stolica-za-kampovanje", "sport-i-outdoor", 21, 45, 9, true, false],
  ["Čeona lampa 1200 lumena", "ceona-lampa-1200lm", "sport-i-outdoor", 8, 65, 44, false, false],
  ["Univerzalni auto punjač 65W", "auto-punjac-65w", "auto-oprema", 10, 60, 30, false, false],
  ["Set presvlaka za sjedišta", "set-presvlaka-sjedista", "auto-oprema", 23, 45, 7, false, false],
  ["RC automobil na daljinsko upravljanje", "rc-automobil", "igracke", 18, 55, 16, true, false],
];

async function main() {
  const client = new Client({
    connectionString,
    ssl: /sslmode=require/.test(connectionString)
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await client.connect();

  if (clearOnly) {
    const res = await client.query(
      "DELETE FROM products WHERE sku LIKE 'DEMO-%'",
    );
    await client.end();
    console.log("[demo] obrisano proizvoda: " + res.rowCount);
    return;
  }

  const cats = await client.query("SELECT id, slug FROM categories");
  const catId = new Map(cats.rows.map((r) => [r.slug, r.id]));

  if (catId.size === 0) {
    await client.end();
    console.error("[demo] nema kategorija - pokreni prvo: node scripts/seed.js");
    process.exit(1);
  }

  let added = 0;

  for (const [index, row] of DEMO.entries()) {
    const [name, slug, cat, costEur, margin, stock, onSale, featured] = row;

    const { costBam, price } = priceFrom(costEur, margin);
    // Kod akcijskih artikala "stara cijena" je ista roba sa vecom marzom.
    const compareAt = onSale ? priceFrom(costEur, margin + 35).price : null;

    // Razlicit broj prodatih komada i pregleda, da se "Najprodavanije"
    // vidljivo razlikuje od "Novo u ponudi". Bez ovoga bi obje sekcije
    // prikazale isti redoslijed i izgledale kao greska.
    const soldCount = ((index * 7) % 23) + 1;
    const views = soldCount * 13 + 4;

    const res = await client.query(
      `INSERT INTO products
         (sku, slug, name, short_description, description, category_id,
          cost_amount, cost_currency, cost_bam, price_bam, compare_at_bam,
          stock, status, is_featured, is_new, translation_status,
          sold_count, views, last_seen_at)
       VALUES ($1, $2, $3, $4, $5, $6,
               $7, 'EUR', $8, $9, $10,
               $11, 'active', $12, TRUE, 'manual',
               $13, $14, NOW())
       ON CONFLICT (slug) DO NOTHING
       RETURNING id`,
      [
        "DEMO-" + slug.toUpperCase().slice(0, 24),
        slug,
        name,
        "Demo proizvod - služi samo za prikaz izgleda sajta.",
        "<p>Ovo je demo opis. Pravi opisi dolaze iz feeda dobavljača i " +
          "automatski se prevode na bosanski.</p>",
        catId.get(cat) || null,
        costEur,
        costBam,
        price,
        compareAt,
        stock,
        featured,
        soldCount,
        views,
      ],
    );

    if (res.rowCount === 0) continue;

    const productId = res.rows[0].id;
    added++;

    for (let i = 1; i <= 3; i++) {
      await client.query(
        `INSERT INTO product_images (product_id, url, sort_order) VALUES ($1, $2, $3)`,
        [productId, `https://picsum.photos/seed/${slug}-${i}/900/900`, i],
      );
    }
  }

  await client.end();
  console.log("[demo] ubaceno proizvoda: " + added);
  console.log("[demo] brisanje kasnije: node scripts/seed-demo.js --clear");
}

main().catch((err) => {
  console.error("[demo] neuspjesno:", err.message);
  process.exit(1);
});
