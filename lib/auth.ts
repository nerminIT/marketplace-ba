import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { queryOne, execute } from "./db";
import { SESSION_COOKIE, SESSION_DAYS } from "./session-cookie";

/**
 * Prijava u CMS. Sesija je potpisani JWT u httpOnly kolacicu -
 * bez tabele sesija, bez dodatnih zavisnosti.
 */

export { SESSION_COOKIE };

export type Role = "super_admin" | "admin" | "urednik";

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: Role;
};

/** Sta koja uloga smije otvoriti u CMS-u. */
export const ROLE_AREAS: Record<Role, string[] | "*"> = {
  super_admin: "*",
  // Sve osim korisnika i postavki sajta.
  admin: [
    "dashboard",
    "products",
    "categories",
    "suppliers",
    "rates",
    "orders",
    "blog",
    "pages",
    "faq",
    "banners",
    "messages",
  ],
  // Samo sadrzaj - ne vidi nabavne cijene, dobavljace ni narudzbe.
  urednik: [
    "dashboard",
    "products",
    "categories",
    "blog",
    "pages",
    "faq",
    "banners",
  ],
};

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super admin",
  admin: "Administrator",
  urednik: "Urednik",
};

export function canAccess(role: Role, area: string): boolean {
  const areas = ROLE_AREAS[role];
  if (areas === "*") return true;
  return areas.includes(area);
}

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET nije postavljen ili je kraci od 32 znaka. " +
        "Generisi ga sa: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"",
    );
  }

  return new TextEncoder().encode(secret);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Provjeri email + lozinku. Vraca korisnika ili null. */
export async function authenticate(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const row = await queryOne<{
    id: number;
    email: string;
    name: string;
    role: Role;
    password_hash: string;
    active: boolean;
  }>(
    `SELECT id, email, name, role, password_hash, active
       FROM admin_users
      WHERE lower(email) = lower($1)
      LIMIT 1`,
    [email.trim()],
  );

  if (!row || !row.active) return null;
  if (!(await verifyPassword(password, row.password_hash))) return null;

  await execute(`UPDATE admin_users SET last_login_at = NOW() WHERE id = $1`, [
    row.id,
  ]);

  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

/** Upise sesijski kolacic. */
export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Trenutno prijavljeni korisnik, ili null. */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());

    return {
      id: Number(payload.sub),
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: (payload.role as Role) ?? "urednik",
    };
  } catch {
    return null;
  }
}

/**
 * Za server akcije i stranice: baca ako korisnik nije prijavljen ili
 * nema pristup trazenom dijelu CMS-a.
 */
export async function requireUser(area?: string): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new Error("NEAUTORIZOVANO");
  if (area && !canAccess(user.role, area)) throw new Error("ZABRANJENO");
  return user;
}
