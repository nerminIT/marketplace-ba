"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, CloseIcon, MenuIcon, SearchIcon } from "./Icons";

export type NavCategory = {
  id: number;
  name: string;
  slug: string;
  children: { id: number; name: string; slug: string }[];
};

export type NavLink = { href: string; label: string };

/**
 * Interaktivni dio zaglavlja: mobilni meni, padajuci meni kategorija
 * i polje za pretragu. Podatke dobija sa servera kao props.
 */
export default function HeaderNav({
  categories,
  links,
}: {
  categories: NavCategory[];
  links: NavLink[];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState("");

  const pathname = usePathname();
  const router = useRouter();

  // Svaka promjena stranice zatvara sve otvoreno.
  //
  // Ovo je namjerno podesavanje stanja u toku rendera, a ne `useEffect`:
  // React tako odmah ponovo renderuje sa zatvorenim menijem, bez dodatnog
  // prolaza kroz DOM. Zatvaranje kroz efekt bi izazvalo kaskadne rendere
  // (react-hooks/set-state-in-effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileOpen(false);
    setCatOpen(false);
    setSearchOpen(false);
  }

  // Kad je mobilni meni otvoren, stranica ispod se ne smije skrolati.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = term.trim();
    if (!q) return;
    router.push(`/shop?q=${encodeURIComponent(q)}`);
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* ---------------------------------------------------- desktop meni */}
      <nav className="hidden flex-1 items-center justify-center gap-7 lg:flex">
        <Link
          href="/"
          className={`text-sm transition-colors hover:text-brand ${
            isActive("/") ? "text-brand" : "text-ink-2"
          }`}
        >
          Početna
        </Link>

        {categories.length > 0 ? (
          <div
            className="relative"
            onMouseEnter={() => setCatOpen(true)}
            onMouseLeave={() => setCatOpen(false)}
          >
            <button
              type="button"
              onClick={() => setCatOpen((v) => !v)}
              aria-expanded={catOpen}
              className="flex items-center gap-1 text-sm text-ink-2 transition-colors hover:text-brand"
            >
              Kategorije
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${catOpen ? "rotate-180" : ""}`}
              />
            </button>

            {catOpen ? (
              <div className="animate-rise absolute top-full left-1/2 z-50 w-[640px] -translate-x-1/2 pt-3">
                <div className="grid grid-cols-3 gap-x-6 gap-y-5 border border-line bg-surface p-6 shadow-[0_12px_40px_-16px_rgba(16,19,26,0.25)]">
                  {categories.map((cat) => (
                    <div key={cat.id}>
                      <Link
                        href={`/kategorija/${cat.slug}`}
                        className="mb-2 block text-sm font-medium text-ink hover:text-brand"
                      >
                        {cat.name}
                      </Link>
                      {cat.children.length > 0 ? (
                        <ul className="space-y-1">
                          {cat.children.slice(0, 5).map((sub) => (
                            <li key={sub.id}>
                              <Link
                                href={`/kategorija/${sub.slug}`}
                                className="text-[13px] text-ink-2 hover:text-brand"
                              >
                                {sub.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm transition-colors hover:text-brand ${
              isActive(link.href) ? "text-brand" : "text-ink-2"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* ------------------------------------------------------- alatna traka */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setSearchOpen((v) => !v)}
          aria-label="Pretraga"
          className="p-2 text-ink-2 transition-colors hover:text-ink"
        >
          {searchOpen ? <CloseIcon /> : <SearchIcon />}
        </button>

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Meni"
          className="p-2 text-ink-2 transition-colors hover:text-ink lg:hidden"
        >
          <MenuIcon />
        </button>
      </div>

      {/* ---------------------------------------------------------- pretraga */}
      {searchOpen ? (
        <div className="animate-rise absolute inset-x-0 top-full z-40 border-t border-line bg-surface">
          <form
            onSubmit={submitSearch}
            className="mx-auto flex max-w-[1240px] items-center gap-3 px-4 py-4 sm:px-6"
          >
            <SearchIcon className="h-5 w-5 shrink-0 text-ink-3" />
            <input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Šta tražite?"
              className="w-full bg-transparent py-1 text-sm outline-none placeholder:text-ink-3"
            />
            <button type="submit" className="btn-primary btn-sm">
              Traži
            </button>
          </form>
        </div>
      ) : null}

      {/* ----------------------------------------------------- mobilni meni */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setMobileOpen(false)}
          />

          <div className="animate-rise absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col bg-surface">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <span className="text-sm font-medium tracking-wide uppercase">
                Meni
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Zatvori"
                className="p-1 text-ink-2"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <Link href="/" className="block py-2.5 text-sm text-ink">
                Početna
              </Link>
              <Link href="/shop" className="block py-2.5 text-sm text-ink">
                Shop
              </Link>

              {categories.length > 0 ? (
                <div className="mt-5 border-t border-line pt-5">
                  <span className="mb-2 block text-[11px] tracking-[0.16em] text-ink-3 uppercase">
                    Kategorije
                  </span>
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/kategorija/${cat.slug}`}
                      className="block py-2 text-sm text-ink-2"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              ) : null}

              <div className="mt-5 border-t border-line pt-5">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block py-2 text-sm text-ink-2"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
