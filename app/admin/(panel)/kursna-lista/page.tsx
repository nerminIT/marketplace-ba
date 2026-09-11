import PageTitle from "@/components/admin/PageTitle";
import RateForm from "@/components/admin/RateForm";
import { requireUser } from "@/lib/auth";
import { listExchangeRates } from "@/lib/suppliers";
import { DOBAVLJAC, pluralize } from "@/lib/plural";
import { datumVrijeme } from "@/lib/datum";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "Kursna lista" };

function formatDateTime(value: string): string {
  return datumVrijeme(value);
}

export default async function RatesPage() {
  await requireUser("rates");

  const [rates, usage] = await Promise.all([
    listExchangeRates(),
    query<{ currency: string; suppliers: number }>(
      `SELECT currency, COUNT(*)::int AS suppliers
         FROM suppliers GROUP BY currency`,
    ),
  ]);

  const usedBy = new Map(usage.map((u) => [u.currency, u.suppliers]));

  return (
    <div className="p-6 lg:p-10">
      <PageTitle
        title="Kursna lista"
        description="Kurs po kojem se nabavne cijene dobavljača preračunavaju u konvertibilne marke."
      />

      <div className="card mb-6 p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">Dodaj ili izmijeni kurs</h2>
        <RateForm />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] tracking-wide text-ink-3 uppercase">
              <th className="px-5 py-3 font-medium">Valuta</th>
              <th className="px-3 py-3 font-medium">1 jedinica u KM</th>
              <th className="px-3 py-3 font-medium">Izvor</th>
              <th className="px-3 py-3 font-medium">Koriste je</th>
              <th className="px-5 py-3 font-medium">Ažurirano</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((rate) => (
              <tr key={rate.currency} className="border-b border-line last:border-0">
                <td className="px-5 py-3">
                  <span className="font-medium text-ink">{rate.currency}</span>
                  {rate.is_fixed ? (
                    <span className="chip ml-2 bg-brand-soft text-brand">fiksni</span>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-ink">
                  {Number(rate.rate_to_bam).toFixed(6)}
                </td>
                <td className="px-3 py-3 text-ink-2">{rate.source ?? "—"}</td>
                <td className="px-3 py-3 text-ink-2">
                  {usedBy.get(rate.currency)
                    ? pluralize(usedBy.get(rate.currency)!, ...DOBAVLJAC)
                    : "—"}
                </td>
                <td className="px-5 py-3 text-ink-3">
                  {formatDateTime(rate.updated_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 border border-line bg-surface p-5 text-sm text-ink-2">
        <h3 className="mb-2 font-medium text-ink">Zašto su EUR i BAM zaključani</h3>
        <p>
          Kurs marke prema euru je zakonski fiksiran na{" "}
          <strong>1 EUR = 1,95583 KM</strong> i ne mijenja se. Zato ta dva reda
          nije moguće urediti — pogrešan unos bi tiho pomjerio cijene cijelog
          kataloga pri sljedećem uvozu.
        </p>
        <p className="mt-2">
          Ostale valute unosite ručno. Promjena kursa ne mijenja cijene
          postojećih proizvoda odmah — one se preračunavaju tek pri sljedećem
          uvozu od tog dobavljača.
        </p>
      </div>
    </div>
  );
}
