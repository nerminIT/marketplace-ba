"use server";

import { execute } from "@/lib/db";

/** Rezultat koji forme na javnom dijelu vracaju nazad u UI. */
export type FormState = {
  ok: boolean;
  message: string;
} | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function subscribeNewsletter(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: "Unesite ispravnu email adresu." };
  }

  try {
    await execute(
      `INSERT INTO newsletter_subscribers (email)
            VALUES ($1)
       ON CONFLICT (email) DO NOTHING`,
      [email],
    );
    return { ok: true, message: "Hvala! Prijava je zabilježena." };
  } catch (err) {
    console.error("[newsletter]", (err as Error).message);
    return { ok: false, message: "Trenutno nije moguće izvršiti prijavu." };
  }
}

export async function sendContactMessage(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const message = String(formData.get("message") || "").trim();

  if (name.length < 2) return { ok: false, message: "Unesite vaše ime." };
  if (message.length < 5) return { ok: false, message: "Unesite poruku." };
  if (email && !EMAIL_RE.test(email)) {
    return { ok: false, message: "Email adresa nije ispravna." };
  }
  if (!email && !phone) {
    return { ok: false, message: "Ostavite email ili broj telefona." };
  }

  try {
    await execute(
      `INSERT INTO contact_messages (name, email, phone, subject, message)
            VALUES ($1, $2, $3, $4, $5)`,
      [name, email || null, phone || null, subject || null, message],
    );
    return { ok: true, message: "Poruka je poslana. Javit ćemo se uskoro." };
  } catch (err) {
    console.error("[kontakt]", (err as Error).message);
    return { ok: false, message: "Poruku trenutno nije moguće poslati." };
  }
}
