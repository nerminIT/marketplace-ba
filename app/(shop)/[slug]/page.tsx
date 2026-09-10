import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { getFaqs, getPageBySlug } from "@/lib/queries";

/**
 * Stranice iz CMS-a (o-nama, politika privatnosti, uslovi...).
 *
 * Ovo je najsira ruta u aplikaciji, pa je namjerno posljednja u redu:
 * Next uvijek prvo isprobava staticke segmente (/shop, /blog, /kontakt),
 * a ovdje stize samo ono sto nijedna konkretna ruta nije preuzela.
 */

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (!page) return { title: "Stranica nije pronađena" };

  return {
    title: page.seo_title || page.title,
    description: page.seo_description || undefined,
  };
}

export default async function CmsPage({ params }: { params: Params }) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (!page) notFound();

  // FAQ stranica dodatno ispisuje pitanja iz baze ispod svog teksta.
  const faqs = slug === "faq" ? await getFaqs() : [];

  const grouped = faqs.reduce<Record<string, typeof faqs>>((acc, faq) => {
    (acc[faq.category] ||= []).push(faq);
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title={page.title}
        crumbs={[{ label: "Početna", href: "/" }, { label: page.title }]}
      />

      <Container size="narrow">
        <div className="py-12 sm:py-16">
          {page.content ? (
            <div
              className="prose-bs"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          ) : null}

          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="mt-12">
              <h2 className="mb-5 text-center text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
                {category}
              </h2>

              <div className="border-t border-line">
                {items.map((faq) => (
                  <details key={faq.id} className="group border-b border-line">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
                      {faq.question}
                      <span
                        aria-hidden
                        className="shrink-0 text-ink-3 transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="pb-4 text-sm leading-relaxed text-ink-2">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </>
  );
}
