"use server";

import { redirect } from "next/navigation";
import { authenticate, createSession, destroySession } from "@/lib/auth";

export type LoginState = { error: string } | null;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/admin");

  if (!email || !password) {
    return { error: "Unesite email i lozinku." };
  }

  let user;
  try {
    user = await authenticate(email, password);
  } catch (err) {
    console.error("[login]", (err as Error).message);
    return {
      error:
        "Prijava trenutno nije moguća. Provjerite je li baza dostupna i je li AUTH_SECRET postavljen.",
    };
  }

  if (!user) {
    // Namjerno ista poruka za pogrešan email i pogrešnu lozinku -
    // da se ne moze provjeravati koji nalozi postoje.
    return { error: "Pogrešan email ili lozinka." };
  }

  await createSession(user);

  // Prihvatamo samo interne putanje, da `?next=` ne postane otvoreni redirect.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/admin");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}
