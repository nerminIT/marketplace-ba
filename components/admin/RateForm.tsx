"use client";

import { useActionState } from "react";
import { saveRate, type RateState } from "@/app/actions/rates";

export default function RateForm() {
  const [state, action, pending] = useActionState<RateState, FormData>(
    saveRate,
    null,
  );

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="currency" className="label">
          Valuta
        </label>
        <input
          id="currency"
          name="currency"
          maxLength={3}
          required
          placeholder="USD"
          className="field w-24 uppercase"
        />
      </div>

      <div>
        <label htmlFor="rate_to_bam" className="label">
          1 jedinica = ? KM
        </label>
        <input
          id="rate_to_bam"
          name="rate_to_bam"
          type="number"
          step="0.000001"
          required
          placeholder="1.80"
          className="field w-40"
        />
      </div>

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Snimam..." : "Sačuvaj kurs"}
      </button>

      {state ? (
        <p className={`w-full text-sm ${state.ok ? "text-ok" : "text-sale"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
