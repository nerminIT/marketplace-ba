import Link from "next/link";
import Container from "./Container";
import HeaderNav, { type NavCategory, type NavLink } from "./HeaderNav";
import { getMenuCategories, getNavPages } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

export default async function Header() {
  const [categories, pages, settings] = await Promise.all([
    getMenuCategories(),
    getNavPages(),
    getSettings(),
  ]);

  const navCategories: NavCategory[] = categories.slice(0, 9).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    children: c.children.map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
  }));

  const links: NavLink[] = [
    { href: "/shop", label: "Shop" },
    ...pages.map((p) => ({
      href: `/${p.slug}`,
      label: p.nav_label || p.title,
    })),
    { href: "/blog", label: "Blog" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      {/* Tanka traka sa jednom porukom - bez pretrpavanja. */}
      {settings.shop.deliveryNote ? (
        <div className="border-b border-line bg-ink text-white">
          <Container>
            <p className="py-2 text-center text-[11px] tracking-[0.14em] uppercase">
              {settings.shop.deliveryNote}
              {settings.shop.freeShippingOverBam > 0
                ? ` · Besplatna dostava preko ${settings.shop.freeShippingOverBam} KM`
                : ""}
            </p>
          </Container>
        </div>
      ) : null}

      <Container>
        <div className="relative flex h-16 items-center justify-between gap-6 sm:h-20">
          <Link href="/" className="shrink-0">
            <span className="block text-lg font-semibold tracking-tight text-ink sm:text-xl">
              {settings.site.name}
            </span>
            {settings.site.tagline ? (
              <span className="hidden text-[10px] tracking-[0.2em] text-ink-3 uppercase sm:block">
                {settings.site.tagline}
              </span>
            ) : null}
          </Link>

          <HeaderNav categories={navCategories} links={links} />
        </div>
      </Container>
    </header>
  );
}
