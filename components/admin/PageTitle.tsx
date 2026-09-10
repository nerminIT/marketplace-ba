import Link from "next/link";

/**
 * Zaglavlje stranice u CMS-u.
 *
 * Za razliku od javnog dijela sajta, ovdje je naslov lijevo poravnat -
 * u alatu se cita brzo i skenira, centriranje bi samo usporavalo.
 */
export default function PageTitle({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-ink-2">{description}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {children}
        {actionHref && actionLabel ? (
          <Link href={actionHref} className="btn-primary btn-sm">
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
