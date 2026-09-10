"use server";

import { revalidatePath } from "next/cache";
import { execute, queryOne } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export type RateState = { ok: boolean; message: string } | null;

export async function saveRate(
  _prev: RateState,
  form: FormData,
): Promise<RateState> {
  try {
    await requireUser("rates");
  } catch {
    return { ok: false, message: "Nemate pravo pristupa kursnoj listi." };
  }

  const currency = String(form.get("currency") ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 3);
  const rate = parseFloat(String(form.get("rate_to_bam") ?? "").replace(",", "."));

  if (!/^[A-Z]{3}$/.test(currency)) {
    return { ok: false, message: "Oznaka valute mora imati tačno 3 slova (npr. USD)." };
  }
  if (!isFinite(rate) || rate <= 0) {
    return { ok: false, message: "Kurs mora biti broj veći od nule." };
  }

  // EUR i BAM su zakonski fiksirani - ne dozvoljavamo izmjenu, jer bi
  // pogrešan kurs tiho pomjerio cijene cijelog kataloga.
  const existing = await queryOne<{ is_fixed: boolean }>(
    `SELECT is_fixed FROM exchange_rates WHERE currency = $1`,
    [currency],
  );

  if (existing?.is_fixed) {
    return {
      ok: false,
      message: `${currency} ima fiksni kurs i ne može se mijenjati.`,
    };
  }

  try {
    await execute(
      `INSERT INTO exchange_rates (currency, rate_to_bam, is_fixed, source, updated_at)
            VALUES ($1, $2, FALSE, 'ručni unos', NOW())
       ON CONFLICT (currency) DO UPDATE
            SET rate_to_bam = EXCLUDED.rate_to_bam,
                source = 'ručni unos',
                updated_at = NOW()`,
      [currency, rate],
    );

    revalidatePath("/admin/kursna-lista");
    return { ok: true, message: `Kurs za ${currency} je sačuvan.` };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
