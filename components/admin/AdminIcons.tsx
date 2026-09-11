/** Ikone CMS-a. Sve nasljeduju currentColor i imaju istu debljinu poteza. */

type IconProps = { className?: string };

const base = "h-4 w-4";

function wrap(path: React.ReactNode, className: string) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {path}
    </svg>
  );
}

export function MoneyIcon({ className = base }: IconProps) {
  return wrap(
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 9.5v5M18 9.5v5" />
    </>,
    className,
  );
}

export function CartIcon({ className = base }: IconProps) {
  return wrap(
    <>
      <path d="M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h7.9a1.5 1.5 0 0 0 1.5-1.2L20 7H6" />
      <circle cx="9.5" cy="19" r="1.3" />
      <circle cx="17" cy="19" r="1.3" />
    </>,
    className,
  );
}

export function BoxIcon({ className = base }: IconProps) {
  return wrap(
    <>
      <path d="M21 8.5 12 3.5 3 8.5v7L12 20.5l9-5z" />
      <path d="M3 8.5 12 13.5l9-5M12 13.5v7" />
    </>,
    className,
  );
}

export function ChartIcon({ className = base }: IconProps) {
  return wrap(
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>,
    className,
  );
}

export function TrendIcon({ className = base }: IconProps) {
  return wrap(
    <>
      <path d="M3 16.5 9 10l4 4 7.5-8" />
      <path d="M15 6h5.5v5.5" />
    </>,
    className,
  );
}

export function CancelIcon({ className = base }: IconProps) {
  return wrap(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </>,
    className,
  );
}

export function LayersIcon({ className = base }: IconProps) {
  return wrap(
    <>
      <path d="m12 3 8.5 4.5L12 12 3.5 7.5z" />
      <path d="m3.5 12.5 8.5 4.5 8.5-4.5" />
    </>,
    className,
  );
}

export function AlertIcon({ className = base }: IconProps) {
  return wrap(
    <>
      <path d="M12 4.5 21 19.5H3z" />
      <path d="M12 10v4M12 17h.01" />
    </>,
    className,
  );
}

export function RefreshIcon({ className = base }: IconProps) {
  return wrap(
    <>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 3v5h-5" />
    </>,
    className,
  );
}
