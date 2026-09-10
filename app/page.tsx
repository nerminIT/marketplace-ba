import Container from "@/components/Container";
import Hero from "@/components/Hero";
import TrustStrip from "@/components/TrustStrip";
import SectionHeading from "@/components/SectionHeading";
import CategoryGrid from "@/components/CategoryGrid";
import ProductGrid from "@/components/ProductGrid";
import BannerStrip from "@/components/BannerStrip";
import PostGrid from "@/components/PostGrid";
import Newsletter from "@/components/Newsletter";
import {
  getBanners,
  getBestSellers,
  getFeaturedProducts,
  getHomeCategories,
  getLatestPosts,
  getNewProducts,
  getSaleProducts,
} from "@/lib/queries";
import { getSettings } from "@/lib/settings";

/**
 * Renderuje se na svaki zahtjev.
 *
 * Namjerno NIJE staticki: pri `next build` na OctaDeployu baza jos nije
 * dostupna (DATABASE_URL je runtime varijabla, ne build arg), pa bi se
 * stranica zaledila u praznom stanju i takva se servirala kupcima.
 * Kad sadrzaj bude stabilan, prelazimo na ISR sa revalidacijom iz CMS-a.
 */
export const dynamic = "force-dynamic";

/** Sekcija sa centriranim naslovom - jedini raspored koji koristimo. */
function Section({
  eyebrow,
  title,
  subtitle,
  href,
  children,
  tone = "ground",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  href?: string;
  children: React.ReactNode;
  tone?: "ground" | "surface";
}) {
  return (
    <section
      className={`py-16 sm:py-20 ${tone === "surface" ? "bg-surface" : ""}`}
    >
      <Container>
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          href={href}
        />
        {children}
      </Container>
    </section>
  );
}

export default async function HomePage() {
  const [
    settings,
    heroBanners,
    midBanners,
    categories,
    newProducts,
    bestSellers,
    saleProducts,
    featured,
    posts,
  ] = await Promise.all([
    getSettings(),
    getBanners("home_hero"),
    getBanners("home_mid"),
    getHomeCategories(),
    getNewProducts(8),
    getBestSellers(8),
    getSaleProducts(4),
    getFeaturedProducts(4),
    getLatestPosts(3),
  ]);

  return (
    <>
      <Hero
        banner={heroBanners[0]}
        fallbackTitle={`${settings.site.name} - ${settings.site.tagline}`}
        fallbackSubtitle={settings.site.description}
      />

      <TrustStrip />

      {categories.length > 0 ? (
        <Section
          eyebrow="Ponuda"
          title="Kupujte po kategorijama"
          subtitle="Sve što vam treba, razvrstano na jasan način."
          tone="surface"
        >
          <CategoryGrid categories={categories} />
        </Section>
      ) : null}

      {newProducts.length > 0 ? (
        <Section
          eyebrow="Upravo stiglo"
          title="Novo u ponudi"
          href="/shop?sort=novo"
        >
          <ProductGrid products={newProducts} />
        </Section>
      ) : null}

      <BannerStrip banner={midBanners[0]} />

      {bestSellers.length > 0 ? (
        <Section
          eyebrow="Izbor kupaca"
          title="Najprodavaniji artikli"
          href="/shop?sort=popularno"
          tone="surface"
        >
          <ProductGrid products={bestSellers} />
        </Section>
      ) : null}

      {saleProducts.length > 0 ? (
        <Section
          eyebrow="Sniženje"
          title="Artikli na akciji"
          subtitle="Ograničene količine po sniženim cijenama."
          href="/shop?akcija=1"
        >
          <ProductGrid products={saleProducts} />
        </Section>
      ) : null}

      {featured.length > 0 ? (
        <Section
          eyebrow="Naš izbor"
          title="Istaknuti proizvodi"
          tone="surface"
          href="/shop"
        >
          <ProductGrid products={featured} />
        </Section>
      ) : null}

      {posts.length > 0 ? (
        <Section eyebrow="Savjeti i novosti" title="Sa bloga" href="/blog">
          <PostGrid posts={posts} />
        </Section>
      ) : null}

      <Newsletter />
    </>
  );
}
