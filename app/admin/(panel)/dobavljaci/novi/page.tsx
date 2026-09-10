import PageTitle from "@/components/admin/PageTitle";
import SupplierForm from "@/components/admin/SupplierForm";
import { requireUser } from "@/lib/auth";
import { listCategoriesFlat } from "@/lib/admin-queries";
import { listExchangeRates } from "@/lib/suppliers";

export const dynamic = "force-dynamic";

export const metadata = { title: "Novi dobavljač" };

export default async function NewSupplierPage() {
  await requireUser("suppliers");

  const [categories, rates] = await Promise.all([
    listCategoriesFlat(),
    listExchangeRates(),
  ]);

  return (
    <div className="p-6 lg:p-10">
      <PageTitle
        title="Novi dobavljač"
        description="Nakon snimanja moći ćete pokrenuti probni pregled uvoza."
      />

      <SupplierForm
        categories={categories}
        currencies={rates.map((r) => ({
          currency: r.currency,
          rate_to_bam: Number(r.rate_to_bam),
        }))}
        values={{
          name: "",
          active: true,
          contact_email: "",
          website: "",
          note: "",
          currency: "EUR",
          feed_type: "csv",
          feed_url: "",
          feed_delimiter: ",",
          feed_encoding: "utf-8",
          feed_headers: "",
          field_map: {},
          margin_percent: 35,
          margin_fixed_bam: 0,
          inbound_ship_bam: 0,
          vat_percent: 0,
          round_mode: "psych_90",
          auto_translate: true,
          auto_publish: false,
          deactivate_missing: true,
          default_category_id: null,
        }}
      />
    </div>
  );
}
