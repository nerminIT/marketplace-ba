import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Container from "@/components/Container";
import ProductGallery from "@/components/ProductGallery";
import ProductGrid from "@/components/ProductGrid";
import SectionHeading from "@/components/SectionHeading";
import { ReturnIcon, ShieldIcon, TruckIcon } from "@/components/Icons";
import { formatKM } from "@/lib/money";
import {
  bumpProductViews,
  getProductBySlug,
  getProductImages,
  getRelatedProducts,
} from "@/lib/queries";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return { title: "Proizvod nije pronađen" };

  return {
    title: product.seo_title || product.name,
    description:
      product.seo_description ||
      product.short_description ||
      `${product.name} - dostupno uz dostavu na kućnu adresu.`,
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const [images, related, settings] = await Promise.all([
    getProductImages(product.id),
    getRelatedProducts(product.id, product.category_id, 4),
    getSettings(),
  ]);

  // Broji se pri svakom otvaranju stranice; koristi se za "najpopularnije".
  await bumpProductViews(product.id);

  const price = Number(product.price_bam);
  const compareAt =
    product.compare_at_bam === null ? null : Number(product.compare_at_bam);
  const discount =
    compareAt && compareAt > price
      ? Math.round(((compareAt - price) / compareAt) * 100)
      : null;

  const inStock = product.stock > 0;
  const attributes = Object.entries(product.attributes ?? {}).filter(
    ([, value]) => value,
  );

  const crumbs = [
    { label: "Početna", href: "/" },
    { label: "Shop", href: "/shop" },
    ...(product.parent_category_slug && product.parent_category_name
      ? [
          {
            label: product.parent_category_name,
            href: `/kategorija/${product.parent_category_slug}`,
          },
        ]
      : []),
    ...(product.category_slug && product.category_name
      ? [
          {
            label: product.category_name,
            href: `/kategorija/${product.category_slug}`,
          },
        ]
      : []),
  ];

  return (
    <>
      <Container>
        <nav
          aria-label="Putanja"
          className="flex flex-wrap items-center gap-x-2 gap-y-1 py-6 text-[11px] tracking-wide text-ink-3 uppercase"
        >
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 ? <span aria-hidden>/</span> : null}
              <Link href={crumb.href} className="hover:text-brand">
                {crumb.label}
              </Link>
            </span>
          ))}
        </nav>

        <div className="grid gap-10 pb-16 lg:grid-cols-2 lg:gap-14">
          <ProductGallery images={images} alt={product.name} />

          <div>
            {product.brand ? (
              <span className="text-[11px] tracking-[0.16em] text-ink-3 uppercase">
                {product.brand}
              </span>
            ) : null}

            <h1 className="mt-2 text-2xl leading-tight font-semibold text-ink sm:text-3xl">
              {product.name}
            </h1>

            {product.short_description ? (
              <p className="mt-4 text-sm leading-relaxed text-ink-2">
                {product.short_description}
              </p>
            ) : null}

            {/* ------------------------------------------------- cijena */}
            <div className="mt-7 flex flex-wrap items-baseline gap-3 border-y border-line py-5">
              <span className="text-3xl font-semibold text-ink">
                {formatKM(price)}
              </span>

              {compareAt && compareAt > price ? (
                <>
                  <span className="text-base text-ink-3 line-through">
                    {formatKM(compareAt)}
                  </span>
                  <span className="chip bg-sale text-white">-{discount}%</span>
                </>
              ) : null}
            </div>

            {/* ------------------------------------------------ dostupnost */}
            <div className="mt-5 flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className={`h-2 w-2 rounded-full ${inStock ? "bg-ok" : "bg-ink-3"}`}
              />
              <span className={inStock ? "text-ok" : "text-ink-3"}>
                {inStock ? `Na stanju (${product.stock} kom)` : "Trenutno nedostupno"}
              </span>
            </div>

            {/* --------------------------------------------------- akcija */}
            <div className="mt-7">
              <button
                type="button"
                disabled
                className="btn-dark w-full sm:w-auto sm:min-w-56"
              >
                Dodaj u korpu
              </button>

              <p className="mt-2 text-xs text-ink-3">
                Korpa i naručivanje dolaze u sljedećoj fazi izrade.
              </p>

              {settings.site.phone ? (
                <p className="mt-4 text-sm text-ink-2">
                  Za narudžbu odmah pozovite{" "}
                  <a
                    href={`tel:${settings.site.phone.replace(/\s/g, "")}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {settings.site.phone}
                  </a>
                </p>
              ) : null}
            </div>

            {/* ----------------------------------------------- uslovi kupovine */}
            <ul className="mt-8 space-y-3 border-t border-line pt-6 text-sm text-ink-2">
              {settings.shop.deliveryNote ? (
                <li className="flex items-center gap-3">
                  <TruckIcon className="h-4 w-4 shrink-0 text-brand" />
                  {settings.shop.deliveryNote}
                </li>
              ) : null}
              {settings.shop.warrantyNote ? (
                <li className="flex items-center gap-3">
                  <ShieldIcon className="h-4 w-4 shrink-0 text-brand" />
                  {settings.shop.warrantyNote}
                </li>
              ) : null}
              {settings.shop.returnNote ? (
                <li className="flex items-center gap-3">
                  <ReturnIcon className="h-4 w-4 shrink-0 text-brand" />
                  {settings.shop.returnNote}
                </li>
              ) : null}
            </ul>

            {product.sku || product.ean ? (
              <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-1 text-xs text-ink-3">
                {product.sku ? (
                  <div className="flex gap-2">
                    <dt>Šifra:</dt>
                    <dd>{product.sku}</dd>
                  </div>
                ) : null}
                {product.ean ? (
                  <div className="flex gap-2">
                    <dt>EAN:</dt>
                    <dd>{product.ean}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </div>
        </div>
      </Container>

      {/* -------------------------------------------------------- opis */}
      {product.description || attributes.length > 0 ? (
        <section className="border-y border-line bg-surface py-16">
          <Container size="narrow">
            <SectionHeading eyebrow="Detalji" title="Opis proizvoda" />

            {product.description ? (
              <div
                className="prose-bs"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            ) : null}

            {attributes.length > 0 ? (
              <table className="mt-8 w-full border-collapse text-sm">
                <tbody>
                  {attributes.map(([key, value]) => (
                    <tr key={key} className="border-b border-line">
                      <th className="w-1/3 py-2.5 pr-4 text-left font-medium text-ink">
                        {key}
                      </th>
                      <td className="py-2.5 text-ink-2">{String(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </Container>
        </section>
      ) : null}

      {/* ------------------------------------------------- slicni proizvodi */}
      {related.length > 0 ? (
        <section className="py-16">
          <Container>
            <SectionHeading eyebrow="Moglo bi vam se svidjeti" title="Slični proizvodi" />
            <ProductGrid products={related} />
          </Container>
        </section>
      ) : null}
    </>
  );
}
