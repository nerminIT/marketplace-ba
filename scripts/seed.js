/**
 * Pocetni podaci - pokrece se JEDNOM, rucno, poslije migracije.
 *
 *   node scripts/seed.js
 *
 * Skripta je nedestruktivna: sve ide kroz ON CONFLICT DO NOTHING ili
 * provjeru "postoji li vec", pa ponovno pokretanje nista ne pokvari.
 *
 * Prvi admin:
 *   ADMIN_EMAIL i ADMIN_PASSWORD iz okruzenja; ako ih nema, lozinka se
 *   generise nasumicno i ispise u konzoli.
 */
const { Client } = require("pg");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

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

const CATEGORIES = [
  { name: "Alati", slug: "alati", home: true },
  { name: "Dom i bašta", slug: "dom-i-basta", home: true },
  { name: "Tehnika", slug: "tehnika", home: true },
  { name: "Sport i outdoor", slug: "sport-i-outdoor", home: true },
  { name: "Auto oprema", slug: "auto-oprema", home: false },
  { name: "Igračke", slug: "igracke", home: false },
  { name: "Ljepota i zdravlje", slug: "ljepota-i-zdravlje", home: false },
  { name: "Ostalo", slug: "ostalo", home: false },
];

const PAGES = [
  {
    slug: "o-nama",
    title: "O nama",
    nav_label: "O nama",
    show_in_nav: true,
    sort_order: 1,
    content:
      "<p>Ovdje upišite priču o svojoj prodavnici. Tekst se uređuje u CMS-u, pod <strong>Stranice</strong>.</p>",
  },
  {
    slug: "kontakt",
    title: "Kontakt",
    nav_label: "Kontakt",
    show_in_nav: true,
    sort_order: 2,
    content: "<p>Kontakt podaci se postavljaju u CMS-u, pod Postavke.</p>",
  },
  {
    slug: "uslovi-koristenja",
    title: "Uslovi korištenja",
    nav_label: null,
    show_in_nav: false,
    sort_order: 8,
    content: "<p>Uslovi korištenja web prodavnice.</p>",
  },
  {
    slug: "politika-privatnosti",
    title: "Politika privatnosti",
    nav_label: null,
    show_in_nav: false,
    sort_order: 9,
    content: "<p>Kako čuvamo i koristimo podatke kupaca.</p>",
  },
  {
    slug: "povrat-i-reklamacije",
    title: "Povrat i reklamacije",
    nav_label: null,
    show_in_nav: false,
    sort_order: 10,
    content: "<p>Postupak povrata robe i prijave reklamacije.</p>",
  },
];

const FAQS = [
  {
    q: "Kako mogu naručiti proizvod?",
    a: "Odaberite proizvod, dodajte ga u korpu i popunite podatke za dostavu. Registracija nije obavezna.",
    cat: "Naručivanje",
  },
  {
    q: "Koji načini plaćanja su dostupni?",
    a: "Plaćanje pouzećem prilikom preuzimanja pošiljke.",
    cat: "Naručivanje",
  },
  {
    q: "Koliko traje dostava?",
    a: "Dostava se obavlja u roku od 24 do 48 sati za većinu artikala.",
    cat: "Dostava",
  },
  {
    q: "Mogu li vratiti proizvod?",
    a: "Da, u roku od 14 dana od preuzimanja, ako je proizvod neoštećen i u originalnom pakovanju.",
    cat: "Povrat",
  },
];

async function main() {
  const client = new Client({
    connectionString,
    ssl: /sslmode=require/.test(connectionString)
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await client.connect();
  console.log("[seed] povezan na bazu");

  /**
   * Zastita od "vaskrsavanja" obrisanog sadrzaja.
   *
   * Skripta smije stajati u OctaDeploy Start Commandu i vrtjeti se na svaki
   * restart, ali pocetne kategorije/stranice/FAQ smiju se ubaciti SAMO jednom.
   * Bez ovoga bi kategorija koju obrises u CMS-u bila ponovo kreirana pri
   * sljedecem deployu (slug bi bio slobodan, pa ON CONFLICT ne bi pomogao).
   */
  const marker = await client.query(
    "SELECT 1 FROM settings WHERE key = 'seeded_at'",
  );
  const firstRun = marker.rowCount === 0;

  if (!firstRun) {
    console.log("[seed] pocetni sadrzaj je vec ubacen ranije - preskacem ga");
  }

  // ------------------------------------------------------------ prvi admin
  const email = (process.env.ADMIN_EMAIL || "admin@marketplace.ba").toLowerCase();
  const existing = await client.query(
    "SELECT id FROM admin_users WHERE lower(email) = $1",
    [email],
  );

  if (existing.rowCount === 0) {
    const password =
      process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString("base64url");
    const hash = await bcrypt.hash(password, 10);

    await client.query(
      `INSERT INTO admin_users (email, password_hash, name, role, active)
            VALUES ($1, $2, $3, 'super_admin', TRUE)`,
      [email, hash, process.env.ADMIN_NAME || "Administrator"],
    );

    console.log("[seed] kreiran super admin:");
    console.log("       email:   " + email);
    console.log("       lozinka: " + password);
    if (!process.env.ADMIN_PASSWORD) {
      console.log("       (zapišite je - nece se ponovo prikazati)");
    }
  } else {
    console.log("[seed] admin vec postoji, preskacem");
  }

  // -------------------------------------------------------------- postavke
  const defaults = {
    site: {
      name: "Marketplace BA",
      tagline: "Sve na jednom mjestu",
      description:
        "Online prodavnica sa širokim asortimanom provjerenih proizvoda i dostavom na kućnu adresu.",
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

  for (const [key, value] of Object.entries(defaults)) {
    await client.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO NOTHING`,
      [key, JSON.stringify(value)],
    );
  }
  console.log("[seed] postavke spremne");

  // -------------------------------------------- pocetni sadrzaj (samo 1x)
  if (firstRun) {
    let order = 0;
    for (const cat of CATEGORIES) {
      order += 10;
      await client.query(
        `INSERT INTO categories (name, slug, sort_order, active, show_in_menu, show_on_home)
              VALUES ($1, $2, $3, TRUE, TRUE, $4)
         ON CONFLICT (slug) DO NOTHING`,
        [cat.name, cat.slug, order, cat.home],
      );
    }
    console.log("[seed] kategorije ubacene (" + CATEGORIES.length + ")");

    for (const page of PAGES) {
      await client.query(
        `INSERT INTO pages (slug, title, content, published, show_in_nav, nav_label, sort_order)
              VALUES ($1, $2, $3, TRUE, $4, $5, $6)
         ON CONFLICT (slug) DO NOTHING`,
        [
          page.slug,
          page.title,
          page.content,
          page.show_in_nav,
          page.nav_label,
          page.sort_order,
        ],
      );
    }
    console.log("[seed] stranice ubacene (" + PAGES.length + ")");

    let i = 0;
    for (const faq of FAQS) {
      i += 10;
      await client.query(
        `INSERT INTO faqs (question, answer, category, sort_order) VALUES ($1, $2, $3, $4)`,
        [faq.q, faq.a, faq.cat, i],
      );
    }
    console.log("[seed] FAQ ubacen (" + FAQS.length + ")");

    await client.query(
      `INSERT INTO settings (key, value) VALUES ('seeded_at', $1::jsonb)
       ON CONFLICT (key) DO NOTHING`,
      [JSON.stringify({ at: new Date().toISOString() })],
    );
  }

  await client.end();
  console.log("[seed] gotovo");
}

main().catch((err) => {
  console.error("[seed] neuspjesno:", err.message);
  process.exit(1);
});
