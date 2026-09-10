import Link from "next/link";
import Container from "./Container";
import { getFooterPages, getMenuCategories } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

export default async function Footer() {
  const [settings, categories, pages] = await Promise.all([
    getSettings(),
    getMenuCategories(),
    getFooterPages(),
  ]);

  const year = new Date().getFullYear();
  const socials = [
    { href: settings.site.facebook, label: "Facebook" },
    { href: settings.site.instagram, label: "Instagram" },
    { href: settings.site.tiktok, label: "TikTok" },
  ].filter((s) => s.href);

  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <Container>
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {/* --------------------------------------------------------- brend */}
          <div>
            <span className="block text-lg font-semibold tracking-tight text-ink">
              {settings.site.name}
            </span>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-2">
              {settings.site.description}
            </p>

            {socials.length > 0 ? (
              <div className="mt-5 flex gap-4">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs tracking-wide text-ink-2 uppercase hover:text-brand"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          {/* ---------------------------------------------------- kategorije */}
          <div>
            <h3 className="mb-4 text-[11px] font-semibold tracking-[0.16em] text-ink uppercase">
              Kategorije
            </h3>
            <ul className="space-y-2">
              {categories.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/kategorija/${c.slug}`}
                    className="text-sm text-ink-2 hover:text-brand"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ------------------------------------------------------ stranice */}
          <div>
            <h3 className="mb-4 text-[11px] font-semibold tracking-[0.16em] text-ink uppercase">
              Informacije
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/shop" className="text-sm text-ink-2 hover:text-brand">
                  Shop
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-sm text-ink-2 hover:text-brand">
                  Blog
                </Link>
              </li>
              {pages.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/${p.slug}`}
                    className="text-sm text-ink-2 hover:text-brand"
                  >
                    {p.nav_label || p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ------------------------------------------------------- kontakt */}
          <div>
            <h3 className="mb-4 text-[11px] font-semibold tracking-[0.16em] text-ink uppercase">
              Kontakt
            </h3>
            <ul className="space-y-2 text-sm text-ink-2">
              {settings.site.address ? <li>{settings.site.address}</li> : null}
              {settings.site.phone ? (
                <li>
                  <a
                    href={`tel:${settings.site.phone.replace(/\s/g, "")}`}
                    className="hover:text-brand"
                  >
                    {settings.site.phone}
                  </a>
                </li>
              ) : null}
              {settings.site.email ? (
                <li>
                  <a
                    href={`mailto:${settings.site.email}`}
                    className="hover:text-brand"
                  >
                    {settings.site.email}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="border-t border-line py-6 text-center text-xs text-ink-3">
          © {year} {settings.site.name}. Sva prava zadržana.
        </div>
      </Container>
    </footer>
  );
}
