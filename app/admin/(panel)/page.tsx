import Image from "next/image";
import Link from "next/link";
import PeriodFilter from "@/components/admin/PeriodFilter";
import StatCard from "@/components/admin/charts/StatCard";
import TrendChart from "@/components/admin/charts/TrendChart";
import StatusBar from "@/components/admin/charts/StatusBar";
import CategoryBars from "@/components/admin/charts/CategoryBars";
import {
  AlertIcon,
  BoxIcon,
  CancelIcon,
  CartIcon,
  ChartIcon,
  LayersIcon,
  MoneyIcon,
  TrendIcon,
} from "@/components/admin/AdminIcons";
import { requireUser } from "@/lib/auth";
import {
  getCategoryRevenue,
  getDailySeries,
  getKpis,
  getProductSales,
  getStatusBreakdown,
  getStockAlerts,
  getStockSummary,
  periodLabel,
  PERIODS,
  type Period,
} from "@/lib/analytics";
import { getDashboardStats, getRecentImports } from "@/lib/admin-queries";
import { formatKM } from "@/lib/money";
import { KOMAD, PROIZVOD, pluralize } from "@/lib/plural";
import { danMjesec } from "@/lib/datum";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>
          ) : null}
        </div>

        {action ? (
          <Link
            href={action.href}
            className="shrink-0 text-xs text-brand hover:underline"
          >
            {action.label}
          </Link>
        ) : null}
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

/** Lista proizvoda sa sličicom - koriste je i najbolje i najslabije prodavani. */
function ProductList({
  rows,
  emptyText,
}: {
  rows: {
    id: number | null;
    name: string;
    image_url: string | null;
    units: number;
    revenue: number;
  }[];
  emptyText: string;
}) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-3">{emptyText}</p>;
  }

  return (
    <ol className="divide-y divide-line">
      {rows.map((row, index) => (
        <li key={`${row.id}-${index}`} className="flex items-center gap-3 py-2.5">
          <span className="w-5 shrink-0 text-xs text-ink-3">{index + 1}.</span>

          <div className="relative h-9 w-9 shrink-0 overflow-hidden border border-line bg-ground">
            {row.image_url ? (
              <Image
                src={row.image_url}
                alt=""
                fill
                sizes="36px"
                className="object-contain p-0.5"
              />
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            {row.id ? (
              <Link
                href={`/admin/proizvodi/${row.id}`}
                className="block truncate text-sm text-ink hover:text-brand"
              >
                {row.name}
              </Link>
            ) : (
              <span className="block truncate text-sm text-ink">{row.name}</span>
            )}
            <span className="text-xs text-ink-3">
              {pluralize(row.units, ...KOMAD)} prodano
            </span>
          </div>

          <span className="shrink-0 text-sm font-medium text-ink">
            {formatKM(Number(row.revenue))}
          </span>
        </li>
      ))}
    </ol>
  );
}

function StockList({
  rows,
  tone,
}: {
  rows: { id: number; name: string; stock: number; category_name: string | null }[];
  tone: "low" | "out";
}) {
  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-ink-3">
        {tone === "low" ? "Nema artikala pri kraju." : "Sve je na stanju."}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line">
      {rows.map((row) => (
        <li key={row.id} className="flex items-center gap-3 py-2.5">
          <div className="min-w-0 flex-1">
            <Link
              href={`/admin/proizvodi/${row.id}`}
              className="block truncate text-sm text-ink hover:text-brand"
            >
              {row.name}
            </Link>
            {row.category_name ? (
              <span className="text-xs text-ink-3">{row.category_name}</span>
            ) : null}
          </div>

          <span
            className={`chip shrink-0 ${
              tone === "low" ? "bg-warn/10 text-warn" : "bg-sale/10 text-sale"
            }`}
          >
            {tone === "low" ? `${row.stock} kom` : "Nedostupan"}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser("dashboard");

  const sp = await searchParams;
  const raw = Array.isArray(sp.period) ? sp.period[0] : sp.period;
  const period: Period = PERIODS.some((p) => p.value === raw)
    ? (raw as Period)
    : "mjesec";

  const [
    kpis,
    series,
    statuses,
    categories,
    topProducts,
    bottomProducts,
    stockAlerts,
    stockSummary,
    catalog,
    imports,
  ] = await Promise.all([
    getKpis(period),
    getDailySeries(30),
    getStatusBreakdown(period),
    getCategoryRevenue(8),
    getProductSales("top", 8),
    getProductSales("bottom", 8),
    getStockAlerts(5),
    getStockSummary(),
    getDashboardStats(),
    getRecentImports(4),
  ]);

  const revenueSpark = series.map((d) => Number(d.revenue));
  const profitSpark = series.map((d) => Number(d.profit));
  const ordersSpark = series.map((d) => d.orders);

  const todo = [
    catalog.productsNoCategory > 0
      ? {
          label: `${pluralize(catalog.productsNoCategory, ...PROIZVOD)} bez kategorije`,
          href: "/admin/proizvodi?filter=bez-kategorije",
        }
      : null,
    catalog.productsNoImage > 0
      ? {
          label: `${pluralize(catalog.productsNoImage, ...PROIZVOD)} bez slike`,
          href: "/admin/proizvodi?filter=bez-slike",
        }
      : null,
    catalog.productsUntranslated > 0
      ? {
          label: `${pluralize(catalog.productsUntranslated, ...PROIZVOD)} čeka prevod`,
          href: "/admin/proizvodi?filter=neprevedeno",
        }
      : null,
    catalog.productsDraft > 0
      ? {
          label: `${pluralize(catalog.productsDraft, ...PROIZVOD)} u statusu skice`,
          href: "/admin/proizvodi?status=draft",
        }
      : null,
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <div className="p-6 lg:p-10">
      {/* -------------------------------------------------------- zaglavlje */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Nadzorna ploča</h1>
          <p className="mt-1 text-sm text-ink-2">
            Dobrodošli, {user.name || user.email}. Pregled prodaje i stanja
            kataloga.
          </p>
        </div>

        <PeriodFilter active={period} />
      </div>

      {/* ---------------------------------------------------------- brojke */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Prihod"
          value={formatKM(kpis.revenue)}
          change={kpis.revenueChange}
          hint="vs prethodni period"
          icon={<MoneyIcon />}
          accent={1}
          spark={revenueSpark}
        />
        <StatCard
          label="Narudžbe"
          value={String(kpis.orders)}
          change={kpis.ordersChange}
          hint="vs prethodni period"
          icon={<CartIcon />}
          accent={2}
          spark={ordersSpark}
        />
        <StatCard
          label="Prodano komada"
          value={String(kpis.units)}
          change={kpis.unitsChange}
          hint="vs prethodni period"
          icon={<BoxIcon />}
          accent={3}
        />
        <StatCard
          label="Prosječna narudžba"
          value={formatKM(kpis.aov)}
          change={kpis.aovChange}
          hint="vs prethodni period"
          icon={<ChartIcon />}
          accent={4}
        />

        <StatCard
          label="Profit"
          value={formatKM(kpis.profit)}
          change={kpis.profitChange}
          hint={`marža ${kpis.marginPercent}%`}
          icon={<TrendIcon />}
          accent={1}
          spark={profitSpark}
        />
        <StatCard
          label="Otkazane"
          value={String(kpis.cancelled)}
          hint={periodLabel(period).toLowerCase()}
          icon={<CancelIcon />}
          accent={5}
          invert
        />
        <StatCard
          label="Nema na stanju"
          value={String(stockAlerts.outCount)}
          hint={`${stockAlerts.lowCount} pri kraju`}
          icon={<AlertIcon />}
          accent={5}
          invert
        />
        <StatCard
          label="Vrijednost zaliha"
          value={formatKM(stockSummary.retail)}
          hint={`nabavno ${formatKM(stockSummary.cost)}`}
          icon={<LayersIcon />}
          accent={3}
        />
      </div>

      {/* --------------------------------------------------------- trendovi */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card
          title="Prihod i profit"
          subtitle="Posljednjih 30 dana, bez otkazanih narudžbi"
        >
          <TrendChart data={series} />
        </Card>

        <Card title="Status narudžbi" subtitle={periodLabel(period)}>
          <StatusBar data={statuses} />
        </Card>
      </div>

      {/* ------------------------------------------------------- kategorije */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card
          title="Prihod po kategorijama"
          subtitle="Sve vrijeme, bez otkazanih narudžbi"
          action={{ href: "/admin/kategorije", label: "Kategorije" }}
        >
          <CategoryBars data={categories} />
        </Card>

        <Card title="Traži pažnju" subtitle="Katalog">
          {todo.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-2">Sve je uredno.</p>
          ) : (
            <ul className="divide-y divide-line">
              {todo.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="-mx-2 block px-2 py-2.5 text-sm text-ink-2 transition-colors hover:bg-brand-soft hover:text-brand"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* -------------------------------------------------------- proizvodi */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card
          title="Najprodavaniji artikli"
          subtitle="Po broju prodatih komada"
          action={{ href: "/admin/proizvodi", label: "Svi proizvodi" }}
        >
          <ProductList rows={topProducts} emptyText="Još nema prodaje." />
        </Card>

        <Card
          title="Najslabije prodavani"
          subtitle="Kandidati za akciju ili izbacivanje"
        >
          <ProductList rows={bottomProducts} emptyText="Još nema prodaje." />
        </Card>
      </div>

      {/* ----------------------------------------------------------- zalihe */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card
          title="Niska zaliha"
          subtitle="5 komada ili manje"
          action={{ href: "/admin/proizvodi?filter=nema-zalihe", label: "Svi" }}
        >
          <StockList rows={stockAlerts.low} tone="low" />
        </Card>

        <Card title="Nema na stanju" subtitle="Aktivni artikli bez zalihe">
          <StockList rows={stockAlerts.out} tone="out" />
        </Card>
      </div>

      {/* ------------------------------------------------- sumarno + uvozi */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Sumarni pregled zaliha" subtitle="Cijeli katalog">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Artikala (SKU)", value: String(stockSummary.skus) },
              { label: "Ukupno jedinica", value: String(stockSummary.units) },
              {
                label: "Maloprodajna vrijednost",
                value: formatKM(stockSummary.retail),
                tone: "ok" as const,
              },
              {
                label: "Nabavna vrijednost",
                value: formatKM(stockSummary.cost),
                tone: "brand" as const,
              },
            ].map((box) => (
              <div key={box.label} className="bg-ground p-4">
                <span className="block text-[11px] tracking-wide text-ink-3 uppercase">
                  {box.label}
                </span>
                <span
                  className={`mt-1 block text-lg font-semibold ${
                    box.tone === "ok"
                      ? "text-ok"
                      : box.tone === "brand"
                        ? "text-brand"
                        : "text-ink"
                  }`}
                >
                  {box.value}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Posljednji uvozi"
          subtitle="Od dobavljača"
          action={{ href: "/admin/uvoz", label: "Svi uvozi" }}
        >
          {imports.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-ink-2">Još nije pokrenut nijedan uvoz.</p>
              <Link href="/admin/dobavljaci/novi" className="btn-outline btn-sm mt-4">
                Dodaj dobavljača
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {imports.map((run) => (
                <li key={run.id} className="flex items-center gap-3 py-2.5">
                  <span
                    aria-hidden
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      run.status === "success"
                        ? "bg-ok"
                        : run.status === "failed"
                          ? "bg-sale"
                          : "bg-brand"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/uvoz/${run.id}`}
                      className="block truncate text-sm text-ink hover:text-brand"
                    >
                      {run.supplier_name || "—"}
                    </Link>
                    <span className="text-xs text-ink-3">{run.message}</span>
                  </div>
                  <span className="shrink-0 text-xs text-ink-3">
                    {danMjesec(run.started_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
