import type { Metadata } from "next";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import ContactForm from "@/components/ContactForm";
import { getPageBySlug } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Pitanja o narudžbi, dostavi ili proizvodima - javite nam se.",
};

export default async function ContactPage() {
  const [page, settings] = await Promise.all([
    getPageBySlug("kontakt"),
    getSettings(),
  ]);

  const details = [
    { label: "Adresa", value: settings.site.address, href: undefined },
    {
      label: "Telefon",
      value: settings.site.phone,
      href: settings.site.phone
        ? `tel:${settings.site.phone.replace(/\s/g, "")}`
        : undefined,
    },
    {
      label: "Email",
      value: settings.site.email,
      href: settings.site.email ? `mailto:${settings.site.email}` : undefined,
    },
    { label: "Viber", value: settings.site.viber, href: undefined },
    { label: "WhatsApp", value: settings.site.whatsapp, href: undefined },
  ].filter((d) => d.value);

  return (
    <>
      <PageHeader
        title={page?.title || "Kontakt"}
        subtitle="Odgovaramo radnim danima, najčešće isti dan."
        crumbs={[{ label: "Početna", href: "/" }, { label: "Kontakt" }]}
      />

      <Container>
        <div className="grid gap-12 py-12 sm:py-16 lg:grid-cols-[1fr_360px] lg:gap-16">
          <div>
            {page?.content ? (
              <div
                className="prose-bs mb-10"
                dangerouslySetInnerHTML={{ __html: page.content }}
              />
            ) : null}

            <ContactForm />
          </div>

          <aside>
            <h2 className="mb-5 text-[11px] font-semibold tracking-[0.16em] text-ink uppercase">
              Podaci
            </h2>

            {details.length === 0 ? (
              <p className="text-sm text-ink-3">
                Kontakt podaci se unose u CMS-u, pod Postavke.
              </p>
            ) : (
              <dl className="divide-y divide-line border-y border-line">
                {details.map((item) => (
                  <div key={item.label} className="flex justify-between gap-4 py-3">
                    <dt className="text-sm text-ink-3">{item.label}</dt>
                    <dd className="text-right text-sm text-ink">
                      {item.href ? (
                        <a href={item.href} className="hover:text-brand">
                          {item.value}
                        </a>
                      ) : (
                        item.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </aside>
        </div>
      </Container>
    </>
  );
}
