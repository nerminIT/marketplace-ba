import Link from "next/link";
import { notFound } from "next/navigation";
import PageTitle from "@/components/admin/PageTitle";
import { requireUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import type { ImportLogEntry } from "@/lib/import/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export const metadata = { title: "Zapis uvoza" };

type RunDetail = {
  id: number;
  supplier_id: number | null;
  supplier_name: string | null;
  status: string;
  source: string;
  rows_total: number;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  failed_count: number;
  message: string | null;
  log: ImportLogEntry[];
  started_at: string;
  finished_at: string | null;
};

const LEVEL: Record<string, string> = {
  info: "text-ink-2",
  warn: "text-warn",
  error: "text-sale",
};

export default async function ImportRunPage({ params }: { params: Params }) {
  await requireUser("suppliers");

  const { id } = await params;
  const runId = Number(id);
  if (!Number.isInteger(runId)) notFound();

  const run = await queryOne<RunDetail>(
    `SELECT r.*, s.name AS supplier_name
       FROM import_runs r
       LEFT JOIN suppliers s ON s.id = r.supplier_id
      WHERE r.id = $1`,
    [runId],
  );

  if (!run) notFound();

  const log = Array.isArray(run.log) ? run.log : [];

  return (
    <div className="p-6 lg:p-10">
      <PageTitle
        title={`Uvoz #${run.id}${run.supplier_name ? ` — ${run.supplier_name}` : ""}`}
        description={run.message ?? undefined}
      >
        <Link href="/admin/uvoz" className="btn-ghost btn-sm">
          Nazad
        </Link>
        {run.supplier_id ? (
          <Link
            href={`/admin/dobavljaci/${run.supplier_id}`}
            className="btn-outline btn-sm"
          >
            Otvori dobavljača
          </Link>
        ) : null}
      </PageTitle>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Redova u feedu", value: run.rows_total },
          { label: "Novih", value: run.created_count },
          { label: "Osvježenih", value: run.updated_count },
          { label: "Preskočenih", value: run.skipped_count },
          { label: "Grešaka", value: run.failed_count },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
            <span className="block text-[11px] tracking-[0.14em] text-ink-3 uppercase">
              {stat.label}
            </span>
            <span className="mt-1 block text-xl font-semibold text-ink">
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">Zapisnik</h2>
        </div>

        {log.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-2">
            Nema zapisa za ovaj uvoz.
          </p>
        ) : (
          <ul className="divide-y divide-line font-mono text-xs">
            {log.map((entry, i) => (
              <li key={i} className="flex gap-3 px-5 py-2">
                <span className="w-14 shrink-0 text-ink-3">
                  {entry.row ? `r${entry.row}` : "—"}
                </span>
                <span className={LEVEL[entry.level] ?? "text-ink-2"}>
                  {entry.message}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
