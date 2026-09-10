/**
 * Ime sesijskog kolacica, izdvojeno u zaseban fajl bez zavisnosti.
 *
 * `proxy.ts` ga treba, a ne smije povuci cijeli `lib/auth.ts` - taj uvozi
 * `pg` i `bcryptjs`, sto bi na svaki zahtjev prema /admin ucitavalo
 * PostgreSQL drajver bez ikakve potrebe.
 */
export const SESSION_COOKIE = "mb_session";

/** Koliko dana traje prijava. */
export const SESSION_DAYS = 7;
