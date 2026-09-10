import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/**
 * Zastita CMS-a.
 *
 * U Next 16 se `middleware` zove `proxy` i uvijek radi na Node runtimeu.
 * Ovdje se radi samo gruba provjera: ima li vazeceg sesijskog kolacica.
 * Provjera uloge (ko sta smije otvoriti) ostaje na samim stranicama i
 * server akcijama, jer je jedino tamo pouzdana.
 */
export const config = {
  matcher: ["/admin/:path*"],
};

const PUBLIC_ADMIN_PATHS = ["/admin/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const secret = process.env.AUTH_SECRET;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  let signedIn = false;

  if (token && secret && secret.length >= 32) {
    try {
      await jwtVerify(token, new TextEncoder().encode(secret));
      signedIn = true;
    } catch {
      signedIn = false;
    }
  }

  const isPublic = PUBLIC_ADMIN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );

  // Prijavljen korisnik na stranici za prijavu -> pravo na nadzornu plocu.
  if (isPublic && signedIn) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (isPublic) return NextResponse.next();

  if (!signedIn) {
    const login = new URL("/admin/login", request.url);
    // Zapamti gdje je korisnik htio ici, da ga vratimo poslije prijave.
    if (pathname !== "/admin") login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}
