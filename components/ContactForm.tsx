"use client";

import { useActionState } from "react";
import { sendContactMessage, type FormState } from "@/app/actions/public";

export default function ContactForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    sendContactMessage,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="label">
            Ime i prezime *
          </label>
          <input id="name" name="name" required className="field" />
        </div>

        <div>
          <label htmlFor="phone" className="label">
            Telefon
          </label>
          <input id="phone" name="phone" className="field" placeholder="06x xxx xxx" />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input id="email" name="email" type="email" className="field" />
      </div>

      <div>
        <label htmlFor="subject" className="label">
          Naslov
        </label>
        <input id="subject" name="subject" className="field" />
      </div>

      <div>
        <label htmlFor="message" className="label">
          Poruka *
        </label>
        <textarea id="message" name="message" required rows={6} className="field" />
      </div>

      <p className="text-xs text-ink-3">
        Ostavite email ili broj telefona kako bismo mogli odgovoriti.
      </p>

      <button type="submit" disabled={pending} className="btn-dark w-full sm:w-auto">
        {pending ? "Šaljem..." : "Pošalji poruku"}
      </button>

      {state ? (
        <p className={`text-sm ${state.ok ? "text-ok" : "text-sale"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
