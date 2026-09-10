import Link from "next/link";

/** Prazno stanje - uvijek sa jednim jasnim sljedećim korakom. */
export default function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center border border-line bg-surface px-6 py-20 text-center">
      <h3 className="text-base font-medium text-ink">{title}</h3>

      {description ? (
        <p className="mt-2 max-w-sm text-sm text-ink-2">{description}</p>
      ) : null}

      {actionHref && actionLabel ? (
        <Link href={actionHref} className="btn-outline mt-6">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
