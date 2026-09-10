"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loadFeedHeaders, saveSupplier, type ActionState } from "@/app/actions/suppliers";
import { FIELD_DEFS, type FieldMap } from "@/lib/import/types";
import { calculatePrice, formatKM, ROUND_MODES, type RoundMode } from "@/lib/money";

export type SupplierFormValues = {
  id?: number;
  name: string;
  active: boolean;
  contact_email: string;
  website: string;
  note: string;
  currency: string;
  feed_type: string;
  feed_url: string;
  feed_delimiter: string;
  feed_encoding: string;
  feed_headers: string;
  field_map: FieldMap;
  margin_percent: number;
  margin_fixed_bam: number;
  inbound_ship_bam: number;
  vat_percent: number;
  round_mode: RoundMode;
  auto_translate: boolean;
  auto_publish: boolean;
  deactivate_missing: boolean;
  default_category_id: number | null;
};

type Option = { id: number; name: string };

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card mb-6 p-6">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {description ? (
        <p className="mt-1 mb-5 text-sm text-ink-2">{description}</p>
      ) : (
        <div className="mb-5" />
      )}
      {children}
    </section>
  );
}

function Check({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-2">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand)]"
      />
      <span>
        <span className="block text-sm text-ink">{label}</span>
        {hint ? <span className="block text-xs text-ink-3">{hint}</span> : null}
      </span>
    </label>
  );
}

export default function SupplierForm({
  values,
  categories,
  currencies,
}: {
  values: SupplierFormValues;
  categories: Option[];
  currencies: { currency: string; rate_to_bam: number }[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveSupplier,
    null,
  );

  // Kolone iz feeda; dok se ne učitaju, mapiranje se upisuje ručno.
  const [headers, setHeaders] = useState<string[]>([]);
  const [headerMsg, setHeaderMsg] = useState<string | null>(null);
  const [headerOk, setHeaderOk] = useState(true);
  const [loadingHeaders, startLoad] = useTransition();

  // Vrijednosti koje utiču na živi obračun cijene.
  const [currency, setCurrency] = useState(values.currency);
  const [marginPercent, setMarginPercent] = useState(values.margin_percent);
  const [marginFixed, setMarginFixed] = useState(values.margin_fixed_bam);
  const [inboundShip, setInboundShip] = useState(values.inbound_ship_bam);
  const [vat, setVat] = useState(values.vat_percent);
  const [roundMode, setRoundMode] = useState<RoundMode>(values.round_mode);
  const [sampleCost, setSampleCost] = useState(20);

  const [feedUrl, setFeedUrl] = useState(values.feed_url);
  const [delimiter, setDelimiter] = useState(values.feed_delimiter);
  const [encoding, setEncoding] = useState(values.feed_encoding);

  const rate = useMemo(() => {
    const hit = currencies.find((c) => c.currency === currency);
    return hit ? Number(hit.rate_to_bam) : 1;
  }, [currencies, currency]);

  const preview = useMemo(
    () =>
      calculatePrice({
        costAmount: sampleCost,
        costCurrency: currency,
        rateToBam: rate,
        inboundShipBam: inboundShip,
        marginPercent,
        marginFixedBam: marginFixed,
        vatPercent: vat,
        roundMode,
      }),
    [sampleCost, currency, rate, inboundShip, marginPercent, marginFixed, vat, roundMode],
  );

  function fetchHeaders() {
    if (!feedUrl) {
      setHeaderOk(false);
      setHeaderMsg("Prvo upišite adresu feeda.");
      return;
    }

    startLoad(async () => {
      const result = await loadFeedHeaders(feedUrl, {
        delimiter: delimiter || undefined,
        encoding: encoding || undefined,
      });
      setHeaders(result.headers);
      setHeaderOk(result.ok);
      setHeaderMsg(result.message);
    });
  }

  // Poslije uspješnog snimanja novog dobavljača idemo na njegovu stranicu.
  const [redirected, setRedirected] = useState(false);
  if (state?.ok && state.id && !values.id && !redirected) {
    setRedirected(true);
    router.push(`/admin/dobavljaci/${state.id}`);
  }

  return (
    <form action={action}>
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      {/* ------------------------------------------------------------ osnovno */}
      <Section title="Osnovni podaci">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="label">
              Naziv dobavljača *
            </label>
            <input
              id="name"
              name="name"
              required
              defaultValue={values.name}
              className="field"
              placeholder="npr. BigBuy"
            />
          </div>

          <div>
            <label htmlFor="currency" className="label">
              Valuta nabavnih cijena
            </label>
            <select
              id="currency"
              name="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="field"
            >
              {currencies.map((c) => (
                <option key={c.currency} value={c.currency}>
                  {c.currency} — 1 {c.currency} = {Number(c.rate_to_bam).toFixed(4)} KM
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="contact_email" className="label">
              Kontakt email
            </label>
            <input
              id="contact_email"
              name="contact_email"
              type="email"
              defaultValue={values.contact_email}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="website" className="label">
              Web stranica
            </label>
            <input
              id="website"
              name="website"
              defaultValue={values.website}
              className="field"
            />
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="note" className="label">
            Interna bilješka
          </label>
          <textarea
            id="note"
            name="note"
            rows={2}
            defaultValue={values.note}
            className="field"
            placeholder="Uslovi saradnje, rokovi isporuke, kontakt osoba..."
          />
        </div>

        <div className="mt-2 border-t border-line pt-2">
          <Check
            name="active"
            label="Dobavljač je aktivan"
            hint="Neaktivni dobavljači se ne uvoze automatski."
            defaultChecked={values.active}
          />
        </div>
      </Section>

      {/* ---------------------------------------------------------------- feed */}
      <Section
        title="Feed proizvoda"
        description="Adresa CSV fajla koji dobavljač redovno osvježava."
      >
        <input type="hidden" name="feed_type" value="csv" />

        <div>
          <label htmlFor="feed_url" className="label">
            Adresa CSV feeda
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="feed_url"
              name="feed_url"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              className="field flex-1"
              placeholder="https://dobavljac.com/feed/proizvodi.csv"
            />
            <button
              type="button"
              onClick={fetchHeaders}
              disabled={loadingHeaders}
              className="btn-outline whitespace-nowrap"
            >
              {loadingHeaders ? "Učitavam..." : "Učitaj kolone"}
            </button>
          </div>

          {headerMsg ? (
            <p className={`mt-2 text-xs ${headerOk ? "text-ok" : "text-sale"}`}>
              {headerMsg}
            </p>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="feed_delimiter" className="label">
              Razdvajač
            </label>
            <select
              id="feed_delimiter"
              name="feed_delimiter"
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value)}
              className="field"
            >
              <option value=",">Zarez ( , )</option>
              <option value=";">Tačka-zarez ( ; )</option>
              <option value={"\t"}>Tab</option>
              <option value="|">Uspravna crta ( | )</option>
            </select>
          </div>

          <div>
            <label htmlFor="feed_encoding" className="label">
              Kodiranje
            </label>
            <select
              id="feed_encoding"
              name="feed_encoding"
              value={encoding}
              onChange={(e) => setEncoding(e.target.value)}
              className="field"
            >
              <option value="utf-8">UTF-8</option>
              <option value="windows-1250">Windows-1250 (srednja Evropa)</option>
              <option value="windows-1252">Windows-1252 (zapadna Evropa)</option>
              <option value="iso-8859-2">ISO-8859-2</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="feed_headers" className="label">
            Dodatna zaglavlja zahtjeva
          </label>
          <textarea
            id="feed_headers"
            name="feed_headers"
            rows={2}
            defaultValue={values.feed_headers}
            className="field font-mono text-xs"
            placeholder={"Authorization: Bearer xyz\nX-Api-Key: 12345"}
          />
          <p className="mt-1 text-xs text-ink-3">
            Po jedno zaglavlje u redu, u obliku <code>Kljuc: vrijednost</code>.
            Koristi se samo ako feed traži autentikaciju.
          </p>
        </div>
      </Section>

      {/* ----------------------------------------------------------- mapiranje */}
      <Section
        title="Mapiranje kolona"
        description="Povežite kolone iz feeda sa našim poljima. Bez ID-a, naziva i cijene uvoz ne može raditi."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELD_DEFS.map((field) => (
            <div key={field.key}>
              <label htmlFor={`map_${field.key}`} className="label">
                {field.label}
                {field.required ? " *" : ""}
              </label>

              {headers.length > 0 ? (
                <select
                  id={`map_${field.key}`}
                  name={`map_${field.key}`}
                  defaultValue={values.field_map[field.key] ?? ""}
                  className="field"
                >
                  <option value="">— ne koristi se —</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`map_${field.key}`}
                  name={`map_${field.key}`}
                  defaultValue={values.field_map[field.key] ?? ""}
                  className="field"
                  placeholder="naziv kolone u CSV-u"
                />
              )}

              {field.hint ? (
                <p className="mt-1 text-xs text-ink-3">{field.hint}</p>
              ) : null}
            </div>
          ))}
        </div>

        {headers.length === 0 ? (
          <p className="mt-4 border border-line bg-ground px-3 py-2 text-xs text-ink-2">
            Kliknite <strong>Učitaj kolone</strong> iznad da se nazivi kolona
            povuku iz feeda i biraju iz liste umjesto da se upisuju napamet.
          </p>
        ) : null}
      </Section>

      {/* -------------------------------------------------------------- cijena */}
      <Section
        title="Formiranje cijene"
        description="Nabavna cijena se preračunava u KM, pa se dodaje marža i zaokružuje."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="margin_percent" className="label">
              Marža (%)
            </label>
            <input
              id="margin_percent"
              name="margin_percent"
              type="number"
              step="0.01"
              value={marginPercent}
              onChange={(e) => setMarginPercent(parseFloat(e.target.value) || 0)}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="margin_fixed_bam" className="label">
              Fiksni dodatak (KM)
            </label>
            <input
              id="margin_fixed_bam"
              name="margin_fixed_bam"
              type="number"
              step="0.01"
              value={marginFixed}
              onChange={(e) => setMarginFixed(parseFloat(e.target.value) || 0)}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="inbound_ship_bam" className="label">
              Ulazna dostava (KM)
            </label>
            <input
              id="inbound_ship_bam"
              name="inbound_ship_bam"
              type="number"
              step="0.01"
              value={inboundShip}
              onChange={(e) => setInboundShip(parseFloat(e.target.value) || 0)}
              className="field"
            />
            <p className="mt-1 text-xs text-ink-3">Po komadu, ulazi u nabavnu cijenu.</p>
          </div>

          <div>
            <label htmlFor="vat_percent" className="label">
              PDV (%)
            </label>
            <input
              id="vat_percent"
              name="vat_percent"
              type="number"
              step="0.01"
              value={vat}
              onChange={(e) => setVat(parseFloat(e.target.value) || 0)}
              className="field"
            />
            <p className="mt-1 text-xs text-ink-3">0 ako je već uračunat.</p>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="round_mode" className="label">
            Zaokruživanje
          </label>
          <select
            id="round_mode"
            name="round_mode"
            value={roundMode}
            onChange={(e) => setRoundMode(e.target.value as RoundMode)}
            className="field sm:max-w-sm"
          >
            {ROUND_MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink-3">
            Zaokruživanje uvijek ide naviše, nikad ispod izračunate cijene.
          </p>
        </div>

        {/* ------------------------------------------------- živi obračun */}
        <div className="mt-6 border border-line bg-ground p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium tracking-wide text-ink-2 uppercase">
              Provjera obračuna
            </span>
            <span className="text-xs text-ink-3">nabavna cijena</span>
            <input
              type="number"
              step="0.01"
              value={sampleCost}
              onChange={(e) => setSampleCost(parseFloat(e.target.value) || 0)}
              className="field w-24 py-1 text-sm"
            />
            <span className="text-xs text-ink-3">{currency}</span>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <span className="block text-xs text-ink-3">Nabavno u KM</span>
              <span className="font-medium text-ink">{formatKM(preview.costBam)}</span>
            </div>
            <div>
              <span className="block text-xs text-ink-3">Prije zaokruživanja</span>
              <span className="text-ink-2">{formatKM(preview.rawPriceBam)}</span>
            </div>
            <div>
              <span className="block text-xs text-ink-3">Prodajna cijena</span>
              <span className="text-base font-semibold text-brand">
                {formatKM(preview.priceBam)}
              </span>
            </div>
            <div>
              <span className="block text-xs text-ink-3">Zarada</span>
              <span className="font-medium text-ok">
                {formatKM(preview.profitBam)}{" "}
                <span className="text-xs font-normal text-ink-3">
                  ({preview.profitPercent}%)
                </span>
              </span>
            </div>
          </div>
        </div>
      </Section>

      {/* ----------------------------------------------------------- ponašanje */}
      <Section title="Ponašanje uvoza">
        <div>
          <label htmlFor="default_category_id" className="label">
            Zadana kategorija
          </label>
          <select
            id="default_category_id"
            name="default_category_id"
            defaultValue={values.default_category_id ?? ""}
            className="field sm:max-w-sm"
          >
            <option value="">— bez kategorije —</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink-3">
            Koristi se kad kategorija iz feeda nije mapirana na našu.
          </p>
        </div>

        <div className="mt-4 divide-y divide-line border-t border-line">
          <Check
            name="auto_translate"
            label="Automatski prevedi naziv i opis na bosanski"
            hint="Traži ANTHROPIC_API_KEY. Bez njega se proizvodi uvoze na originalnom jeziku."
            defaultChecked={values.auto_translate}
          />
          <Check
            name="auto_publish"
            label="Odmah objavi nove proizvode"
            hint="Ako je isključeno, novi proizvodi čekaju kao skice dok ih ne pregledate."
            defaultChecked={values.auto_publish}
          />
          <Check
            name="deactivate_missing"
            label="Arhiviraj proizvode kojih više nema u feedu"
            hint="Zaliha se postavlja na 0 i proizvod se sklanja sa shopa, ali se ne briše."
            defaultChecked={values.deactivate_missing}
          />
        </div>
      </Section>

      {/* -------------------------------------------------------------- snimanje */}
      <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t border-line bg-surface px-6 py-4">
        {state ? (
          <p className={`text-sm ${state.ok ? "text-ok" : "text-sale"}`}>
            {state.message}
          </p>
        ) : (
          <span />
        )}

        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Snimam..." : values.id ? "Sačuvaj izmjene" : "Dodaj dobavljača"}
        </button>
      </div>
    </form>
  );
}
