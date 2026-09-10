import { Pool, types } from "pg";
import type { QueryResultRow } from "pg";

/**
 * PostgreSQL konekcija.
 *
 * OctaDeploy uvijek ubacuje DATABASE_URL. Lokalno se moze koristiti ili
 * DATABASE_URL iz .env.local ili pojedinacne DB_* varijable.
 */

// pg po defaultu vraca NUMERIC kao string (da ne izgubi preciznost).
// Sve nase NUMERIC kolone su novcani iznosi sa 2 decimale i kolicine,
// pa ih sigurno mozemo citati kao number.
types.setTypeParser(1700, (value) => parseFloat(value));
// BIGINT (npr. COUNT(*)) -> number
types.setTypeParser(20, (value) => parseInt(value, 10));

function connectionString(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "5432";
  const name = process.env.DB_NAME || process.env.DB_DATABASE || "marketplace";
  const user = process.env.DB_USER || process.env.DB_USERNAME || "postgres";
  const pass = process.env.DB_PASS || process.env.DB_PASSWORD || "";

  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(
    pass,
  )}@${host}:${port}/${name}`;
}

declare global {
  var __pgPool: Pool | undefined;
}

function createPool(): Pool {
  const url = connectionString();
  return new Pool({
    connectionString: url,
    ssl: /sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined,
    max: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

// U dev-u Next hot-reload bi inace otvarao novi pool na svaku izmjenu.
export const pool: Pool = global.__pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") global.__pgPool = pool;

/** Vraca sve redove upita. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await pool.query<T>(text, params as never[]);
  return res.rows;
}

/** Vraca prvi red ili null. */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Izvrsi upit bez citanja rezultata, vrati broj pogodjenih redova. */
export async function execute(
  text: string,
  params: unknown[] = [],
): Promise<number> {
  const res = await pool.query(text, params as never[]);
  return res.rowCount ?? 0;
}

/** Pokrene callback unutar transakcije; rollback na bilo koju gresku. */
export async function transaction<T>(
  fn: (client: import("pg").PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
