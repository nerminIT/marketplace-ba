/**
 * Demo podaci - SAMO da bi se vidjelo kako sajt i CMS izgledaju dok pravi
 * katalog i narudzbe jos ne postoje. Nikad se ne pokrece automatski.
 *
 *   node scripts/seed-demo.js          ubaci demo proizvode i narudzbe
 *   node scripts/seed-demo.js --clear  obrisi sve demo podatke
 *
 * Sve sto ova skripta napravi je obiljezeno:
 *   - proizvodi: SKU pocinje sa "DEMO-"
 *   - narudzbe:  broj narudzbe pocinje sa "DEMO-"
 * pa se ciste jednim upitom i nikad se ne mijesaju sa stvarnim podacima.
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

/** Deterministicki pseudo-slucajni broj - isti seed uvijek daje iste podatke. */
function rng(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

// naziv, slug, kategorija, nabavna EUR, marza %, zaliha, akcija?, istaknut?
const DEMO = [
  // --- Alati --------------------------------------------------------------
  ["Aku bušilica 20V sa dva akumulatora", "aku-busilica-20v", "alati", 32, 45, 14, false, true],
  ["Set odvijača 42 dijela", "set-odvijaca-42-dijela", "alati", 9.5, 60, 40, true, false],
  ["Ugaona brusilica 900W", "ugaona-brusilica-900w", "alati", 24, 45, 8, false, false],
  ["Digitalni multimetar sa mjeračem", "digitalni-multimetar", "alati", 11, 55, 22, false, false],
  ["Set nasadnih ključeva 108 dijelova", "set-nasadnih-kljuceva-108", "alati", 29, 45, 11, false, false],
  ["Laserski nivelir sa stativom", "laserski-nivelir-stativ", "alati", 41, 40, 5, true, false],
  ["Aku odvijač 12V kompaktni", "aku-odvijac-12v", "alati", 18, 50, 19, false, false],
  ["Toplotna puška 2000W", "toplotna-puska-2000w", "alati", 15, 55, 3, false, false],

  // --- Dom i bašta --------------------------------------------------------
  ["Solarna zidna lampa - set 4 kom", "solarna-zidna-lampa-set", "dom-i-basta", 12, 50, 35, true, true],
  ["Baštenska pumpa za vodu 750W", "bastenska-pumpa-750w", "dom-i-basta", 38, 40, 6, false, false],
  ["Set posuđa od 8 dijelova", "set-posudja-8-dijelova", "dom-i-basta", 27, 45, 11, false, false],
  ["Električni trimer za travu 1200W", "elektricni-trimer-1200w", "dom-i-basta", 26, 45, 9, false, false],
  ["Baštenski set crijeva 25 m", "bastenski-set-crijeva-25m", "dom-i-basta", 14, 55, 24, false, false],
  ["Sklopive ljestve 4 stepenice", "sklopive-ljestve-4", "dom-i-basta", 22, 45, 0, false, false],
  ["Roštilj na drveni ugalj sa poklopcem", "rostilj-drveni-ugalj", "dom-i-basta", 34, 40, 4, true, false],

  // --- Tehnika ------------------------------------------------------------
  ["Bežične slušalice sa kutijicom", "bezicne-slusalice", "tehnika", 14, 60, 50, true, true],
  ["Pametni sat sa mjerenjem pulsa", "pametni-sat-puls", "tehnika", 19, 55, 18, false, false],
  ["Prenosivi Bluetooth zvučnik 20W", "bluetooth-zvucnik-20w", "tehnika", 16, 50, 25, false, false],
  ["Web kamera 1080p sa mikrofonom", "web-kamera-1080p", "tehnika", 13, 55, 31, false, false],
  ["Powerbank 20000 mAh brzo punjenje", "powerbank-20000mah", "tehnika", 17, 50, 28, false, false],
  ["TV držač zidni nagibni 32 do 65 inča", "tv-drzac-zidni-nagibni", "tehnika", 11, 60, 2, false, false],

  // --- Sport i outdoor ----------------------------------------------------
  ["Taktički ruksak 30 L", "takticki-ruksak-30l", "sport-i-outdoor", 17, 50, 12, false, true],
  ["Stolica za kampovanje sklopiva", "stolica-za-kampovanje", "sport-i-outdoor", 21, 45, 9, true, false],
  ["Čeona lampa 1200 lumena", "ceona-lampa-1200lm", "sport-i-outdoor", 8, 65, 44, false, false],
  ["Šator za 3 osobe vodootporni", "sator-3-osobe", "sport-i-outdoor", 44, 40, 6, false, false],
  ["Vreća za spavanje do -5 stepeni", "vreca-za-spavanje-minus5", "sport-i-outdoor", 23, 45, 14, false, false],
  ["Set za pecanje početni", "set-za-pecanje-pocetni", "sport-i-outdoor", 19, 50, 0, true, false],

  // --- Auto oprema --------------------------------------------------------
  ["Univerzalni auto punjač 65W", "auto-punjac-65w", "auto-oprema", 10, 60, 30, false, false],
  ["Set presvlaka za sjedišta", "set-presvlaka-sjedista", "auto-oprema", 23, 45, 7, false, false],
  ["Kompresor za gume 12V digitalni", "kompresor-za-gume-12v", "auto-oprema", 16, 50, 21, true, false],
  ["Set obavezne opreme za auto", "set-obavezne-opreme", "auto-oprema", 12, 55, 4, false, false],

  // --- Igračke ------------------------------------------------------------
  ["RC automobil na daljinsko upravljanje", "rc-automobil", "igracke", 18, 55, 16, true, false],
  ["Set drvenih kocki 100 komada", "set-drvenih-kocki-100", "igracke", 13, 55, 20, false, false],
];

const IMENA = [
  "Amar Hodžić", "Selma Begić", "Mirza Delić", "Lejla Softić", "Haris Kovač",
  "Amina Mujić", "Tarik Osmanović", "Emina Hadžić", "Adnan Salihović", "Dženana Alić",
  "Kemal Zukić", "Ajla Bašić", "Nedim Ferhatović", "Lamija Imamović", "Edin Turković",
  "Merima Šabić", "Faruk Halilović", "Nejra Pašić", "Damir Kadrić", "Azra Muratović",
];

const GRADOVI = [
  "Sarajevo", "Banja Luka", "Tuzla", "Zenica", "Mostar", "Bihać",
  "Brčko", "Bijeljina", "Prijedor", "Travnik", "Doboj", "Cazin",
];

const STATUSI = [
  { status: "zavrsena", payment: "placeno", weight: 46 },
  { status: "poslana", payment: "neplaceno", weight: 18 },
  { status: "u_obradi", payment: "neplaceno", weight: 16 },
  { status: "nova", payment: "neplaceno", weight: 12 },
  { status: "otkazana", payment: "neuspjelo", weight: 8 },
];

function pickStatus(r) {
  const total = STATUSI.reduce((sum, s) => sum + s.weight, 0);
  let n = r() * total;
  for (const s of STATUSI) {
    n -= s.weight;
    if (n <= 0) return s;
  }
  return STATUSI[0];
}

function asciiEmail(name) {
  return name
    .toLowerCase()
    .replace(/č|ć/g, "c")
    .replace(/ž/g, "z")
    .replace(/š/g, "s")
    .replace(/đ/g, "dj")
    .replace(/[^a-z]/g, "");
}

async function main() {
  const client = new Client({
    connectionString,
    ssl: /sslmode=require/.test(connectionString)
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await client.connect();

  /* ------------------------------------------------------------- brisanje */
  if (clearOnly) {
    const orders = await client.query(
      "DELETE FROM orders WHERE order_no LIKE 'DEMO-%'",
    );
    const products = await client.query(
      "DELETE FROM products WHERE sku LIKE 'DEMO-%'",
    );
    await client.end();
    console.log("[demo] obrisano narudzbi: " + orders.rowCount);
    console.log("[demo] obrisano proizvoda: " + products.rowCount);
    return;
  }

  const cats = await client.query("SELECT id, slug FROM categories");
  const catId = new Map(cats.rows.map((r) => [r.slug, r.id]));

  if (catId.size === 0) {
    await client.end();
    console.error("[demo] nema kategorija - pokreni prvo: node scripts/seed.js");
    process.exit(1);
  }

  /* ------------------------------------------------------------ proizvodi */
  let added = 0;

  for (const [index, row] of DEMO.entries()) {
    const [name, slug, cat, costEur, margin, stock, onSale, featured] = row;

    const { costBam, price } = priceFrom(costEur, margin);
    const compareAt = onSale ? priceFrom(costEur, margin + 35).price : null;

    // Razlicit broj prodatih komada i pregleda, da se "Najprodavanije"
    // vidljivo razlikuje od "Novo u ponudi".
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

  console.log("[demo] ubaceno proizvoda: " + added);

  /* -------------------------------------------------------------- narudzbe */
  // Bez narudzbi nadzorna ploca nema sta prikazati - grafikoni prihoda,
  // statusa i najprodavanijih artikala ostali bi prazni.
  const existing = await client.query(
    "SELECT COUNT(*)::int AS n FROM orders WHERE order_no LIKE 'DEMO-%'",
  );

  if (existing.rows[0].n > 0) {
    await client.end();
    console.log(
      "[demo] demo narudzbe vec postoje (" + existing.rows[0].n + ") - preskacem",
    );
    return;
  }

  const sellable = (
    await client.query(
      `SELECT id, name, price_bam::float AS price, cost_bam::float AS cost
         FROM products WHERE sku LIKE 'DEMO-%'`,
    )
  ).rows;

  if (sellable.length === 0) {
    await client.end();
    console.log("[demo] nema demo proizvoda za narudzbe - preskacem");
    return;
  }

  const r = rng(20260911);
  const DAYS = 45;
  let orderCount = 0;
  let itemCount = 0;

  for (let day = DAYS; day >= 0; day--) {
    const date = new Date();
    date.setDate(date.getDate() - day);

    // Vikendom manje narudzbi, uz blagi rast prema danasnjem danu -
    // da grafikon prihoda ima prepoznatljiv oblik umjesto ravne linije.
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const base = weekend ? 0.6 : 1.6;
    const growth = 1 + (DAYS - day) / DAYS;
    const perDay = Math.floor(base * growth + r() * 2);

    for (let n = 0; n < perDay; n++) {
      const when = new Date(date);
      when.setHours(8 + Math.floor(r() * 12), Math.floor(r() * 60), 0, 0);

      const { status, payment } = pickStatus(r);
      const fullName = IMENA[Math.floor(r() * IMENA.length)];
      const [firstName, lastName] = fullName.split(" ");
      const city = GRADOVI[Math.floor(r() * GRADOVI.length)];

      const lines = 1 + Math.floor(r() * 3);
      const chosen = [];
      for (let i = 0; i < lines; i++) {
        const product = sellable[Math.floor(r() * sellable.length)];
        if (!chosen.some((c) => c.id === product.id)) {
          chosen.push({ ...product, qty: 1 + Math.floor(r() * 2) });
        }
      }

      const subtotal = chosen.reduce((sum, c) => sum + c.price * c.qty, 0);
      const costTotal = chosen.reduce((sum, c) => sum + c.cost * c.qty, 0);
      const shipping = subtotal >= 100 ? 0 : 10;

      const orderNo =
        "DEMO-" +
        when.toISOString().slice(2, 10).replace(/-/g, "") +
        "-" +
        String(1000 + Math.floor(r() * 8999));

      const inserted = await client.query(
        `INSERT INTO orders
           (order_no, status, payment_status, payment_method,
            first_name, last_name, email, phone, address, city, postal_code,
            subtotal_bam, shipping_bam, total_bam, cost_total_bam,
            created_at, updated_at)
         VALUES ($1, $2, $3, 'pouzece',
                 $4, $5, $6, $7, $8, $9, $10,
                 $11, $12, $13, $14,
                 $15, $15)
         ON CONFLICT (order_no) DO NOTHING
         RETURNING id`,
        [
          orderNo,
          status,
          payment,
          firstName,
          lastName,
          asciiEmail(firstName) + "." + asciiEmail(lastName) + "@primjer.ba",
          "06" + Math.floor(1000000 + r() * 8999999),
          "Ulica " + (1 + Math.floor(r() * 90)),
          city,
          String(71000 + Math.floor(r() * 8000)),
          Math.round(subtotal * 100) / 100,
          shipping,
          Math.round((subtotal + shipping) * 100) / 100,
          Math.round(costTotal * 100) / 100,
          when.toISOString(),
        ],
      );

      if (inserted.rowCount === 0) continue;

      const orderId = inserted.rows[0].id;
      orderCount++;

      for (const line of chosen) {
        await client.query(
          `INSERT INTO order_items
             (order_id, product_id, name, unit_price_bam, unit_cost_bam, qty)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orderId, line.id, line.name, line.price, line.cost, line.qty],
        );
        itemCount++;
      }

      await client.query(
        `INSERT INTO order_events (order_id, message, created_at)
              VALUES ($1, 'Narudžba kreirana', $2)`,
        [orderId, when.toISOString()],
      );
    }
  }

  console.log(
    "[demo] ubaceno narudzbi: " + orderCount + " (" + itemCount + " stavki)",
  );
  console.log("[demo] brisanje kasnije: node scripts/seed-demo.js --clear");

  await client.end();
}

main().catch((err) => {
  console.error("[demo] neuspjesno:", err.message);
  process.exit(1);
});
