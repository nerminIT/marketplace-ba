import Image from "next/image";
import Link from "next/link";
import Container from "./Container";
import { ArrowRight } from "./Icons";
import type { Banner } from "@/lib/queries";

/**
 * Naslovni blok pocetne stranice.
 * Ako u CMS-u postoji baner za `home_hero`, koristi se on; u suprotnom
 * se prikazuje cist tipografski hero da stranica nikad ne izgleda prazno.
 */
export default function Hero({
  banner,
  fallbackTitle,
  fallbackSubtitle,
}: {
  banner?: Banner;
  fallbackTitle: string;
  fallbackSubtitle: string;
}) {
  const title = banner?.title ?? fallbackTitle;
  const subtitle = banner?.subtitle ?? fallbackSubtitle;
  const href = banner?.link_url ?? "/shop";
  const cta = banner?.button_text ?? "Pogledaj ponudu";

  return (
    <section className="border-b border-line bg-surface">
      <Container>
        <div className="grid items-center gap-10 py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div className="text-center lg:text-left">
            <span className="text-[11px] font-semibold tracking-[0.2em] text-brand uppercase">
              Dobrodošli
            </span>

            <h1 className="mt-5 text-4xl leading-[1.08] font-semibold text-ink sm:text-5xl lg:text-[3.5rem]">
              {title}
            </h1>

            {subtitle ? (
              <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-ink-2 lg:mx-0">
                {subtitle}
              </p>
            ) : null}

            <div className="mt-9 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link href={href} className="btn-dark">
                {cta}
                <ArrowRight />
              </Link>
              <Link href="/shop" className="btn-outline">
                Sve kategorije
              </Link>
            </div>
          </div>

          <div className="relative aspect-[4/3] w-full overflow-hidden bg-ground lg:aspect-[5/4]">
            {banner?.image_url ? (
              <Image
                src={banner.image_url}
                alt={title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-[11px] tracking-[0.2em] text-ink-3 uppercase">
                  Slika banera se postavlja u CMS-u
                </span>
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
