"use client";

import { useActionState } from "react";
import Container from "./Container";
import SectionHeading from "./SectionHeading";
import { subscribeNewsletter, type FormState } from "@/app/actions/public";

export default function Newsletter() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    subscribeNewsletter,
    null,
  );

  return (
    <section className="border-y border-line bg-surface py-16">
      <Container size="narrow">
        <SectionHeading
          eyebrow="Ostanite u toku"
          title="Novosti i akcije na email"
          subtitle="Bez spama - samo nove kolekcije i sniženja, nekoliko puta mjesečno."
          className="mb-8"
        />

        <form
          action={action}
          className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
        >
          <input
            type="email"
            name="email"
            required
            placeholder="vasa@email.com"
            className="field flex-1"
            aria-label="Email adresa"
          />
          <button type="submit" disabled={pending} className="btn-dark">
            {pending ? "Šaljem..." : "Prijavi se"}
          </button>
        </form>

        {state ? (
          <p
            className={`mt-4 text-center text-sm ${
              state.ok ? "text-ok" : "text-sale"
            }`}
          >
            {state.message}
          </p>
        ) : null}
      </Container>
    </section>
  );
}
