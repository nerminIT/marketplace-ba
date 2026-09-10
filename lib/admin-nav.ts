/**
 * Stavke bocne navigacije CMS-a.
 *
 * `area` odgovara kljucevima u ROLE_AREAS (lib/auth.ts) - tako se ista
 * definicija koristi i za prikaz menija i za provjeru prava pristupa.
 *
 * Ovdje se stavka dodaje tek kad stranica stvarno postoji; menija koji
 * vodi u 404 nema.
 */
export type NavItem = {
  href: string;
  label: string;
  area: string;
  /** Prikazi kao aktivno i za podstranice (npr. /admin/dobavljaci/3). */
  prefix?: boolean;
};

export type NavGroup = { title: string; items: NavItem[] };

export const ADMIN_NAV: NavGroup[] = [
  {
    title: "Pregled",
    items: [{ href: "/admin", label: "Nadzorna ploča", area: "dashboard" }],
  },
  {
    title: "Katalog",
    items: [
      { href: "/admin/proizvodi", label: "Proizvodi", area: "products", prefix: true },
      { href: "/admin/kategorije", label: "Kategorije", area: "categories", prefix: true },
    ],
  },
  {
    title: "Nabavka",
    items: [
      { href: "/admin/dobavljaci", label: "Dobavljači", area: "suppliers", prefix: true },
      { href: "/admin/uvoz", label: "Uvoz proizvoda", area: "suppliers", prefix: true },
      { href: "/admin/kursna-lista", label: "Kursna lista", area: "rates", prefix: true },
    ],
  },
];
