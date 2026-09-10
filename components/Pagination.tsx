import Link from "next/link";

/**
 * Straničenje koje čuva postojeće filtere u URL-u.
 * `baseParams` su svi trenutni query parametri bez `page`.
 */
export default function Pagination({
  page,
  pages,
  basePath,
  baseParams = {},
}: {
  page: number;
  pages: number;
  basePath: string;
  baseParams?: Record<string, string | undefined>;
}) {
  if (pages <= 1) return null;

  const href = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(baseParams)) {
      if (value) params.set(key, value);
    }
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  // Uvijek prva, zadnja, tekuća i po jedna susjedna - ostalo "…".
  const numbers: (number | "gap")[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) {
      numbers.push(i);
    } else if (numbers[numbers.length - 1] !== "gap") {
      numbers.push("gap");
    }
  }

  const cell =
    "inline-flex h-9 min-w-9 items-center justify-center px-2 text-sm transition-colors";

  return (
    <nav
      aria-label="Straničenje"
      className="mt-12 flex items-center justify-center gap-1"
    >
      {page > 1 ? (
        <Link href={href(page - 1)} className={`${cell} text-ink-2 hover:text-brand`}>
          Prethodna
        </Link>
      ) : (
        <span className={`${cell} text-ink-3`}>Prethodna</span>
      )}

      {numbers.map((n, i) =>
        n === "gap" ? (
          <span key={`gap-${i}`} className={`${cell} text-ink-3`}>
            …
          </span>
        ) : n === page ? (
          <span
            key={n}
            aria-current="page"
            className={`${cell} bg-ink font-medium text-white`}
          >
            {n}
          </span>
        ) : (
          <Link
            key={n}
            href={href(n)}
            className={`${cell} text-ink-2 hover:bg-brand-soft hover:text-brand`}
          >
            {n}
          </Link>
        ),
      )}

      {page < pages ? (
        <Link href={href(page + 1)} className={`${cell} text-ink-2 hover:text-brand`}>
          Sljedeća
        </Link>
      ) : (
        <span className={`${cell} text-ink-3`}>Sljedeća</span>
      )}
    </nav>
  );
}
