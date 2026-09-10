import Link from "next/link";

/**
 * Naslov sekcije - uvijek centriran, sa malim nadnaslovom iznad i
 * tankom linijom ispod. Ovo je vizuelni potpis cijelog sajta.
 *
 * Opcioni "vidi sve" link stoji ispod naslova, ne sa strane, da bi
 * centriranje ostalo cisto i na mobitelu.
 */
export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  href,
  hrefLabel = "Pogledaj sve",
  className = "",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
  className?: string;
}) {
  return (
    <div className={`mb-10 flex flex-col items-center text-center ${className}`}>
      {eyebrow ? (
        <span className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
          {eyebrow}
        </span>
      ) : null}

      <h2 className="text-2xl font-semibold text-ink sm:text-3xl">{title}</h2>

      <span aria-hidden className="mt-4 h-px w-12 bg-line-strong" />

      {subtitle ? (
        <p className="mt-4 max-w-xl text-sm text-ink-2">{subtitle}</p>
      ) : null}

      {href ? (
        <Link
          href={href}
          className="mt-5 border-b border-line-strong pb-0.5 text-sm font-medium text-ink transition-colors hover:border-brand hover:text-brand"
        >
          {hrefLabel}
        </Link>
      ) : null}
    </div>
  );
}
