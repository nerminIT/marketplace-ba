import Link from "next/link";
import { notFound } from "next/navigation";
import PageTitle from "@/components/admin/PageTitle";
import SupplierForm from "@/components/admin/SupplierForm";
import ImportPanel from "@/components/admin/ImportPanel";
import { requireUser } from "@/lib/auth";
import { listCategoriesFlat } from "@/lib/admin-queries";
import { getSupplier, listExchangeRates } from "@/lib/suppliers";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const supplier = await getSupplier(Number(id));
  return { title: supplier?.name ?? "Dobavljač" };
}

export default async function EditSupplierPage({ params }: { params: Params }) {
  await requireUser("suppliers");

  const { id } = await params;
  const supplierId = Number(id);
  if (!Number.isInteger(supplierId)) notFound();

  const supplier = await getSupplier(supplierId);
  if (!supplier) notFound();

  const [categories, rates] = await Promise.all([
    listCategoriesFlat(),
    listExchangeRates(),
  ]);

  const map = supplier.field_map ?? {};
  const hasMapping = Boolean(map.external_id || map.sku) && Boolean(map.name) && Boolean(map.cost);

  // JSONB zaglavlja nazad u tekst "Kljuc: vrijednost" po redu.
  const headerText = Object.entries(supplier.feed_headers ?? {})
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  return (
    <div className="p-6 lg:p-10">
      <PageTitle title={supplier.name} description="Postavke dobavljača i uvoz.">
        <Link href="/admin/dobavljaci" className="btn-ghost btn-sm">
          Nazad na listu
        </Link>
      </PageTitle>

      <ImportPanel
        supplierId={supplier.id}
        hasFeed={Boolean(supplier.feed_url)}
        hasMapping={hasMapping}
        categories={categories}
      />

      <SupplierForm
        categories={categories}
        currencies={rates.map((r) => ({
          currency: r.currency,
          rate_to_bam: Number(r.rate_to_bam),
        }))}
        values={{
          id: supplier.id,
          name: supplier.name,
          active: supplier.active,
          contact_email: supplier.contact_email ?? "",
          website: supplier.website ?? "",
          note: supplier.note ?? "",
          currency: supplier.currency,
          feed_type: supplier.feed_type,
          feed_url: supplier.feed_url ?? "",
          feed_delimiter: supplier.feed_delimiter,
          feed_encoding: supplier.feed_encoding,
          feed_headers: headerText,
          field_map: map,
          margin_percent: Number(supplier.margin_percent),
          margin_fixed_bam: Number(supplier.margin_fixed_bam),
          inbound_ship_bam: Number(supplier.inbound_ship_bam),
          vat_percent: Number(supplier.vat_percent),
          round_mode: supplier.round_mode,
          auto_translate: supplier.auto_translate,
          auto_publish: supplier.auto_publish,
          deactivate_missing: supplier.deactivate_missing,
          default_category_id: supplier.default_category_id,
        }}
      />
    </div>
  );
}
