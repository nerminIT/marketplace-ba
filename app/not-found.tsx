import Link from "next/link";
import Container from "@/components/Container";

export default function NotFound() {
  return (
    <Container size="narrow">
      <div className="flex flex-col items-center py-28 text-center">
        <span className="text-[11px] font-semibold tracking-[0.2em] text-brand uppercase">
          Greška 404
        </span>

        <h1 className="mt-5 text-3xl font-semibold text-ink sm:text-4xl">
          Stranica nije pronađena
        </h1>

        <span aria-hidden className="mt-6 h-px w-12 bg-line-strong" />

        <p className="mt-6 max-w-md text-sm leading-relaxed text-ink-2">
          Adresa koju ste otvorili ne postoji ili je premještena. Vratite se na
          početnu i nastavite pregled ponude.
        </p>

        <Link href="/" className="btn-dark mt-8">
          Nazad na početnu
        </Link>
      </div>
    </Container>
  );
}
