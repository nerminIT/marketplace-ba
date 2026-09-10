/**
 * Idempotentna migracija seme za PostgreSQL.
 *
 * Pokrece se na svakom deployu (OctaDeploy nikad ne pokrece migracije sam),
 * zato svaka naredba mora biti sigurna za ponovljeno izvrsavanje:
 *   CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS
 * Nikad DROP, nikad DELETE.
 *
 *   node scripts/migrate.js
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

const statements = [
  // ---------------------------------------------------------------- korisnici
  `CREATE TABLE IF NOT EXISTS admin_users (
     id             SERIAL PRIMARY KEY,
     email          VARCHAR(190) NOT NULL UNIQUE,
     password_hash  VARCHAR(255) NOT NULL,
     name           VARCHAR(120) NOT NULL DEFAULT '',
     role           VARCHAR(20)  NOT NULL DEFAULT 'urednik',
     active         BOOLEAN      NOT NULL DEFAULT TRUE,
     last_login_at  TIMESTAMPTZ,
     created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
     updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
   )`,

  // ----------------------------------------------------------------- postavke
  `CREATE TABLE IF NOT EXISTS settings (
     key        VARCHAR(80) PRIMARY KEY,
     value      JSONB       NOT NULL DEFAULT '{}'::jsonb,
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,

  // ------------------------------------------------------------- kursna lista
  `CREATE TABLE IF NOT EXISTS exchange_rates (
     currency    CHAR(3) PRIMARY KEY,
     rate_to_bam NUMERIC(14,6) NOT NULL,
     is_fixed    BOOLEAN NOT NULL DEFAULT FALSE,
     source      VARCHAR(80),
     updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  // EUR je zakonski fiksiran na 1.95583 KM - nikad se ne osvjezava sa API-ja.
  `INSERT INTO exchange_rates (currency, rate_to_bam, is_fixed, source)
     VALUES ('BAM', 1.000000, TRUE, 'fiksno'),
            ('EUR', 1.955830, TRUE, 'CBBH fiksni kurs')
   ON CONFLICT (currency) DO NOTHING`,
  `INSERT INTO exchange_rates (currency, rate_to_bam, is_fixed, source)
     VALUES ('USD', 1.800000, FALSE, 'pocetna vrijednost'),
            ('GBP', 2.280000, FALSE, 'pocetna vrijednost'),
            ('CNY', 0.250000, FALSE, 'pocetna vrijednost'),
            ('PLN', 0.460000, FALSE, 'pocetna vrijednost'),
            ('TRY', 0.045000, FALSE, 'pocetna vrijednost')
   ON CONFLICT (currency) DO NOTHING`,

  // --------------------------------------------------------------- kategorije
  `CREATE TABLE IF NOT EXISTS categories (
     id              SERIAL PRIMARY KEY,
     parent_id       INTEGER REFERENCES categories(id) ON DELETE SET NULL,
     name            VARCHAR(160) NOT NULL,
     slug            VARCHAR(190) NOT NULL UNIQUE,
     description     TEXT,
     image_url       TEXT,
     sort_order      INTEGER NOT NULL DEFAULT 0,
     active          BOOLEAN NOT NULL DEFAULT TRUE,
     show_in_menu    BOOLEAN NOT NULL DEFAULT TRUE,
     show_on_home    BOOLEAN NOT NULL DEFAULT FALSE,
     seo_title       VARCHAR(200),
     seo_description VARCHAR(400),
     created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)`,
  `CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(active, sort_order)`,

  // --------------------------------------------------------------- dobavljaci
  `CREATE TABLE IF NOT EXISTS suppliers (
     id                  SERIAL PRIMARY KEY,
     name                VARCHAR(160) NOT NULL,
     slug                VARCHAR(190) NOT NULL UNIQUE,
     active              BOOLEAN NOT NULL DEFAULT TRUE,
     contact_email       VARCHAR(190),
     website             TEXT,
     note                TEXT,

     currency            CHAR(3) NOT NULL DEFAULT 'EUR',

     feed_type           VARCHAR(16) NOT NULL DEFAULT 'csv',
     feed_url            TEXT,
     feed_delimiter      VARCHAR(4)  NOT NULL DEFAULT ',',
     feed_encoding       VARCHAR(24) NOT NULL DEFAULT 'utf-8',
     feed_headers        JSONB NOT NULL DEFAULT '{}'::jsonb,
     field_map           JSONB NOT NULL DEFAULT '{}'::jsonb,

     margin_percent      NUMERIC(7,2)  NOT NULL DEFAULT 30,
     margin_fixed_bam    NUMERIC(12,2) NOT NULL DEFAULT 0,
     inbound_ship_bam    NUMERIC(12,2) NOT NULL DEFAULT 0,
     vat_percent         NUMERIC(5,2)  NOT NULL DEFAULT 0,
     round_mode          VARCHAR(16)   NOT NULL DEFAULT 'psych_90',

     auto_translate      BOOLEAN NOT NULL DEFAULT TRUE,
     auto_publish        BOOLEAN NOT NULL DEFAULT FALSE,
     deactivate_missing  BOOLEAN NOT NULL DEFAULT TRUE,
     default_category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,

     last_sync_at        TIMESTAMPTZ,
     last_sync_status    VARCHAR(16),
     last_sync_message   TEXT,
     created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,

  `CREATE TABLE IF NOT EXISTS supplier_margin_rules (
     id               SERIAL PRIMARY KEY,
     supplier_id      INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
     category_id      INTEGER REFERENCES categories(id) ON DELETE CASCADE,
     min_cost_bam     NUMERIC(12,2),
     max_cost_bam     NUMERIC(12,2),
     margin_percent   NUMERIC(7,2)  NOT NULL DEFAULT 0,
     margin_fixed_bam NUMERIC(12,2) NOT NULL DEFAULT 0,
     priority         INTEGER NOT NULL DEFAULT 0,
     created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_margin_rules_supplier
     ON supplier_margin_rules(supplier_id, priority DESC)`,

  `CREATE TABLE IF NOT EXISTS supplier_category_map (
     id           SERIAL PRIMARY KEY,
     supplier_id  INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
     source_value VARCHAR(255) NOT NULL,
     category_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL,
     created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     UNIQUE (supplier_id, source_value)
   )`,

  // ---------------------------------------------------------------- proizvodi
  `CREATE TABLE IF NOT EXISTS products (
     id                 SERIAL PRIMARY KEY,
     supplier_id        INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
     external_id        VARCHAR(190),
     sku                VARCHAR(120),
     ean                VARCHAR(64),
     brand              VARCHAR(120),

     slug               VARCHAR(240) NOT NULL UNIQUE,
     name               VARCHAR(255) NOT NULL,
     name_source        VARCHAR(255),
     short_description  VARCHAR(500),
     description        TEXT,
     description_source TEXT,

     category_id        INTEGER REFERENCES categories(id) ON DELETE SET NULL,

     cost_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
     cost_currency      CHAR(3)       NOT NULL DEFAULT 'EUR',
     cost_bam           NUMERIC(12,2) NOT NULL DEFAULT 0,
     price_bam          NUMERIC(12,2) NOT NULL DEFAULT 0,
     compare_at_bam     NUMERIC(12,2),

     stock              INTEGER NOT NULL DEFAULT 0,
     status             VARCHAR(16) NOT NULL DEFAULT 'draft',

     price_locked       BOOLEAN NOT NULL DEFAULT FALSE,
     content_locked     BOOLEAN NOT NULL DEFAULT FALSE,
     translation_status VARCHAR(16) NOT NULL DEFAULT 'pending',

     is_featured        BOOLEAN NOT NULL DEFAULT FALSE,
     is_new             BOOLEAN NOT NULL DEFAULT TRUE,

     attributes         JSONB NOT NULL DEFAULT '{}'::jsonb,
     weight_kg          NUMERIC(10,3),
     source_url         TEXT,

     seo_title          VARCHAR(200),
     seo_description    VARCHAR(400),

     views              INTEGER NOT NULL DEFAULT 0,
     sold_count         INTEGER NOT NULL DEFAULT 0,

     last_seen_at       TIMESTAMPTZ,
     created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_products_supplier_external
     ON products(supplier_id, external_id)
     WHERE supplier_id IS NOT NULL AND external_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_products_status   ON products(status)`,
  `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id)`,
  `CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured`,
  `CREATE INDEX IF NOT EXISTS idx_products_created  ON products(created_at DESC)`,

  `CREATE TABLE IF NOT EXISTS product_images (
     id         SERIAL PRIMARY KEY,
     product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
     url        TEXT NOT NULL,
     sort_order INTEGER NOT NULL DEFAULT 0
   )`,
  `CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id, sort_order)`,

  // ------------------------------------------------------------- uvoz / audit
  `CREATE TABLE IF NOT EXISTS import_runs (
     id            SERIAL PRIMARY KEY,
     supplier_id   INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
     status        VARCHAR(16) NOT NULL DEFAULT 'running',
     source        VARCHAR(16) NOT NULL DEFAULT 'url',
     rows_total    INTEGER NOT NULL DEFAULT 0,
     created_count INTEGER NOT NULL DEFAULT 0,
     updated_count INTEGER NOT NULL DEFAULT 0,
     skipped_count INTEGER NOT NULL DEFAULT 0,
     failed_count  INTEGER NOT NULL DEFAULT 0,
     message       TEXT,
     log           JSONB NOT NULL DEFAULT '[]'::jsonb,
     started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     finished_at   TIMESTAMPTZ
   )`,
  `CREATE INDEX IF NOT EXISTS idx_import_runs_supplier ON import_runs(supplier_id, started_at DESC)`,

  // ----------------------------------------------------------------- narudzbe
  `CREATE TABLE IF NOT EXISTS orders (
     id             SERIAL PRIMARY KEY,
     order_no       VARCHAR(32) NOT NULL UNIQUE,
     status         VARCHAR(20) NOT NULL DEFAULT 'nova',
     payment_status VARCHAR(20) NOT NULL DEFAULT 'neplaceno',
     payment_method VARCHAR(30) NOT NULL DEFAULT 'pouzece',

     first_name     VARCHAR(120) NOT NULL DEFAULT '',
     last_name      VARCHAR(120) NOT NULL DEFAULT '',
     email          VARCHAR(190),
     phone          VARCHAR(60),
     address        VARCHAR(255),
     city           VARCHAR(120),
     postal_code    VARCHAR(20),
     country        VARCHAR(80) NOT NULL DEFAULT 'Bosna i Hercegovina',
     note           TEXT,

     subtotal_bam   NUMERIC(12,2) NOT NULL DEFAULT 0,
     shipping_bam   NUMERIC(12,2) NOT NULL DEFAULT 0,
     discount_bam   NUMERIC(12,2) NOT NULL DEFAULT 0,
     total_bam      NUMERIC(12,2) NOT NULL DEFAULT 0,
     cost_total_bam NUMERIC(12,2) NOT NULL DEFAULT 0,

     created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status)`,

  `CREATE TABLE IF NOT EXISTS order_items (
     id             SERIAL PRIMARY KEY,
     order_id       INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
     product_id     INTEGER REFERENCES products(id) ON DELETE SET NULL,
     name           VARCHAR(255) NOT NULL,
     sku            VARCHAR(120),
     image_url      TEXT,
     unit_price_bam NUMERIC(12,2) NOT NULL DEFAULT 0,
     unit_cost_bam  NUMERIC(12,2) NOT NULL DEFAULT 0,
     qty            INTEGER NOT NULL DEFAULT 1
   )`,
  `CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)`,

  `CREATE TABLE IF NOT EXISTS order_events (
     id         SERIAL PRIMARY KEY,
     order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
     message    VARCHAR(255) NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id, created_at)`,

  // ------------------------------------------------------------------ sadrzaj
  `CREATE TABLE IF NOT EXISTS pages (
     id              SERIAL PRIMARY KEY,
     slug            VARCHAR(190) NOT NULL UNIQUE,
     title           VARCHAR(200) NOT NULL,
     content         TEXT,
     published       BOOLEAN NOT NULL DEFAULT TRUE,
     show_in_nav     BOOLEAN NOT NULL DEFAULT FALSE,
     nav_label       VARCHAR(80),
     sort_order      INTEGER NOT NULL DEFAULT 0,
     seo_title       VARCHAR(200),
     seo_description VARCHAR(400),
     created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,

  `CREATE TABLE IF NOT EXISTS blog_posts (
     id              SERIAL PRIMARY KEY,
     slug            VARCHAR(220) NOT NULL UNIQUE,
     title           VARCHAR(220) NOT NULL,
     excerpt         VARCHAR(500),
     content         TEXT,
     cover_url       TEXT,
     author          VARCHAR(120),
     tags            TEXT,
     published       BOOLEAN NOT NULL DEFAULT FALSE,
     published_at    TIMESTAMPTZ,
     seo_title       VARCHAR(200),
     seo_description VARCHAR(400),
     created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_blog_published ON blog_posts(published, published_at DESC)`,

  `CREATE TABLE IF NOT EXISTS faqs (
     id         SERIAL PRIMARY KEY,
     question   VARCHAR(300) NOT NULL,
     answer     TEXT NOT NULL,
     category   VARCHAR(80) NOT NULL DEFAULT 'Opcenito',
     active     BOOLEAN NOT NULL DEFAULT TRUE,
     sort_order INTEGER NOT NULL DEFAULT 0,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,

  `CREATE TABLE IF NOT EXISTS banners (
     id          SERIAL PRIMARY KEY,
     title       VARCHAR(200) NOT NULL,
     subtitle    VARCHAR(300),
     image_url   TEXT,
     link_url    TEXT,
     button_text VARCHAR(80),
     placement   VARCHAR(40) NOT NULL DEFAULT 'home_hero',
     active      BOOLEAN NOT NULL DEFAULT TRUE,
     sort_order  INTEGER NOT NULL DEFAULT 0,
     created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_banners_placement ON banners(placement, active, sort_order)`,

  `CREATE TABLE IF NOT EXISTS newsletter_subscribers (
     id         SERIAL PRIMARY KEY,
     email      VARCHAR(190) NOT NULL UNIQUE,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,

  `CREATE TABLE IF NOT EXISTS contact_messages (
     id         SERIAL PRIMARY KEY,
     name       VARCHAR(160) NOT NULL,
     email      VARCHAR(190),
     phone      VARCHAR(60),
     subject    VARCHAR(200),
     message    TEXT NOT NULL,
     is_read    BOOLEAN NOT NULL DEFAULT FALSE,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
];

async function main() {
  const client = new Client({
    connectionString,
    ssl: /sslmode=require/.test(connectionString)
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await client.connect();
  console.log("[migrate] povezan na bazu");

  let done = 0;
  for (const sql of statements) {
    try {
      await client.query(sql);
      done++;
    } catch (err) {
      console.error("[migrate] GRESKA na naredbi:\n" + sql.slice(0, 300));
      await client.end().catch(() => {});
      throw err;
    }
  }

  await client.end();
  console.log("[migrate] gotovo - " + done + " naredbi izvrseno");
}

main().catch((err) => {
  console.error("[migrate] neuspjesno:", err.message);
  process.exit(1);
});
