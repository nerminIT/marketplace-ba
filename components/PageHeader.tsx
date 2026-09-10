import Link from "next/link";
import Container from "./Container";

export type Crumb = { label: string; href?: string };

/**
 * Zaglavlje stranice - isti centrirani ritam kao naslovi sekcija,
 * samo na svijetloj traci i sa putanjom iznad.
 */
export default function PageHeader({
  title,
  subtitle,
  crumbs = [],
  meta,
}: {
  title: string;
  subtitle?: string | null;
  crumbs?: Crumb[];
  meta?: string;
}) {
  return (
    <section className="border-b border-line bg-surface">
      <Container>
        <div className="flex flex-col items-center py-12 text-center sm:py-16">
          {crumbs.length > 0 ? (
            <nav
              aria-label="Putanja"
              className="mb-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] tracking-wide text-ink-3 uppercase"
            >
              {crumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 ? <span aria-hidden>/</span> : null}
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-brand">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-ink-2">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          ) : null}

          <h1 className="text-3xl font-semibold text-ink sm:text-4xl">{title}</h1>

          <span aria-hidden className="mt-5 h-px w-12 bg-line-strong" />

          {subtitle ? (
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-2">
              {subtitle}
            </p>
          ) : null}

          {meta ? (
            <p className="mt-4 text-xs tracking-wide text-ink-3 uppercase">
              {meta}
            </p>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
