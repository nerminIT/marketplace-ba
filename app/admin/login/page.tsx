import type { Metadata } from "next";
import LoginForm from "@/components/admin/LoginForm";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prijava",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : undefined;

  const { site } = await getSettings();

  return (
    <div className="flex min-h-screen items-center justify-center bg-ground px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="block text-lg font-semibold tracking-tight text-ink">
            {site.name}
          </span>
          <span className="mt-1 block text-[10px] tracking-[0.2em] text-ink-3 uppercase">
            Administracija
          </span>
        </div>

        <div className="card p-6">
          <LoginForm next={next} />
        </div>

        <p className="mt-6 text-center text-xs text-ink-3">
          Pristup je dozvoljen samo ovlaštenim korisnicima.
        </p>
      </div>
    </div>
  );
}
