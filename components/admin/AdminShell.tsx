"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CloseIcon, MenuIcon } from "@/components/Icons";
import { logoutAction } from "@/app/actions/auth";
import type { NavGroup } from "@/lib/admin-nav";

/**
 * Okvir CMS-a: bocna navigacija, zaglavlje na mobitelu i sadrzaj.
 * Filtriranje po ulozi radi server; ovdje stizu samo dozvoljene stavke.
 */
export default function AdminShell({
  nav,
  user,
  siteName,
  children,
}: {
  nav: NavGroup[];
  user: { name: string; email: string; roleLabel: string };
  siteName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Zatvaranje menija na promjenu stranice - podesavanje u toku rendera,
  // ne kroz efekt (izbjegava kaskadne rendere).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  const isActive = (href: string, prefix?: boolean) =>
    prefix ? pathname.startsWith(href) : pathname === href;

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-5 py-5">
        <span className="block text-sm font-semibold tracking-tight text-ink">
          {siteName}
        </span>
        <span className="mt-0.5 block text-[10px] tracking-[0.18em] text-ink-3 uppercase">
          Administracija
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {nav.map((group) => (
          <div key={group.title} className="mb-6">
            <span className="mb-2 block px-2 text-[10px] font-semibold tracking-[0.16em] text-ink-3 uppercase">
              {group.title}
            </span>

            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-2 py-1.5 text-sm transition-colors ${
                  isActive(item.href, item.prefix)
                    ? "bg-brand-soft font-medium text-brand"
                    : "text-ink-2 hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-line px-5 py-4">
        <span className="block truncate text-sm font-medium text-ink">
          {user.name || user.email}
        </span>
        <span className="mt-0.5 block text-[11px] text-ink-3">
          {user.roleLabel}
        </span>

        <div className="mt-3 flex items-center gap-3 text-xs">
          <Link href="/" className="text-ink-2 hover:text-brand">
            Otvori shop
          </Link>
          <span aria-hidden className="text-line-strong">
            |
          </span>
          <form action={logoutAction}>
            <button type="submit" className="text-ink-2 hover:text-sale">
              Odjavi se
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ground">
      {/* ------------------------------------------------ mobilno zaglavlje */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
        <span className="text-sm font-semibold text-ink">{siteName}</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Meni"
          className="p-1 text-ink-2"
        >
          <MenuIcon />
        </button>
      </div>

      <div className="lg:flex">
        {/* --------------------------------------------- bocna na desktopu */}
        <aside className="hidden w-60 shrink-0 border-r border-line bg-surface lg:sticky lg:top-0 lg:block lg:h-screen">
          {sidebar}
        </aside>

        {/* ------------------------------------------------ bocna na mobitelu */}
        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-ink/40"
              onClick={() => setOpen(false)}
            />
            <div className="animate-rise absolute inset-y-0 left-0 w-72 bg-surface">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Zatvori"
                className="absolute top-4 right-3 p-1 text-ink-2"
              >
                <CloseIcon />
              </button>
              {sidebar}
            </div>
          </div>
        ) : null}

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
