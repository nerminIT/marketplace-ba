# Marketplace BA

Web prodavnica sa vlastitim CMS-om, koja povlači proizvode od više vanjskih
dobavljača, preračunava njihove cijene u konvertibilne marke po marži koju mi
određujemo, i prikazuje sve na bosanskom jeziku.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
PostgreSQL (`pg`, bez ORM-a) · Claude API za prevod.

---

## Kako radi uvoz proizvoda

```
CSV feed dobavljača
        │
        ├─ mapiranje kolona  (podesivo po dobavljaču u CMS-u)
        ├─ preračun valute   (kursna lista → KM)
        ├─ + ulazna dostava  (fiksno po komadu)
        ├─ + marža           (% i/ili fiksni iznos, može po kategoriji)
        ├─ zaokruživanje     (na ,90 / ,99 / punu marku)
        └─ prevod na bosanski (Claude API, uz mogućnost ručne izmjene)
                │
                ▼
        naš proizvod u shopu
```

Ključno pravilo: **ručno uređen proizvod se ne pregazi.** Ako u CMS-u
zaključate cijenu (`price_locked`) ili tekst (`content_locked`), sljedeći uvoz
ta polja preskače i osvježava samo zalihu.

---

## Pokretanje lokalno

Potrebno: Node.js 20+ i PostgreSQL 14+.

```bash
npm install
cp .env.example .env.local     # popunite DATABASE_URL i AUTH_SECRET
npm run db:migrate             # kreira tabele (sigurno je pokrenuti više puta)
npm run db:seed                # prvi admin + osnovne kategorije i stranice
npm run dev
```

Shop: `http://localhost:3000` · CMS: `http://localhost:3000/admin`

`db:seed` ispiše lozinku prvog admina u konzoli — zapišite je.

---

## Struktura

```
app/
  page.tsx              početna stranica
  actions/              server akcije (forme)
  admin/                CMS  (u izradi — faza 2)
components/             UI komponente
lib/
  db.ts                 PostgreSQL pool + query helperi
  money.ts              valute, marže, zaokruživanje, format KM
  auth.ts               prijava u CMS (JWT u httpOnly kolačiću)
  settings.ts           postavke sajta
  queries.ts            upiti javnog dijela sajta
  slug.ts               slugovi sa našim slovima
scripts/
  migrate.js            idempotentna migracija sheme
  seed.js               početni podaci (pokreće se jednom)
```

## Baza

Migracija je namjerno obična SQL skripta, bez ORM-a i bez koraka koji generiše
kod. Svaka naredba je `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`
— nikad `DROP`, nikad `DELETE`. Zato je sigurno pokrenuti je na svakom deployu.

Nove kolone se dodaju **na kraj** liste u `scripts/migrate.js`, kao
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`. Postojeće naredbe se ne mijenjaju.

## Deploy

Vidi [DEPLOY.md](DEPLOY.md).
