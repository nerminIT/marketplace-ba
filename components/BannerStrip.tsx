import Image from "next/image";
import Link from "next/link";
import Container from "./Container";
import { ArrowRight } from "./Icons";
import type { Banner } from "@/lib/queries";

/** Siroki baner izmedju sekcija. Ako nema banera, ne renderuje nista. */
export default function BannerStrip({ banner }: { banner?: Banner }) {
  if (!banner) return null;

  const content = (
    <div className="relative flex min-h-[260px] items-center overflow-hidden bg-ink sm:min-h-[320px]">
      {banner.image_url ? (
        <>
          <Image
            src={banner.image_url}
            alt={banner.title}
            fill
            sizes="100vw"
            className="object-cover"
          />
          <span className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/50 to-transparent" />
        </>
      ) : null}

      <div className="relative px-8 py-12 sm:px-14">
        <h2 className="max-w-md text-2xl font-semibold text-white sm:text-3xl">
          {banner.title}
        </h2>

        {banner.subtitle ? (
          <p className="mt-3 max-w-md text-sm text-white/80">{banner.subtitle}</p>
        ) : null}

        {banner.link_url ? (
          <span className="mt-6 inline-flex items-center gap-2 border-b border-white/40 pb-1 text-sm font-medium text-white">
            {banner.button_text || "Pogledaj ponudu"}
            <ArrowRight />
          </span>
        ) : null}
      </div>
    </div>
  );

  return (
    <Container>
      {banner.link_url ? (
        <Link href={banner.link_url} className="block">
          {content}
        </Link>
      ) : (
        content
      )}
    </Container>
  );
}
