# Deploy na OctaDeploy

## Podešavanja u panelu

| Polje             | Vrijednost                                                                            |
| ----------------- | ------------------------------------------------------------------------------------- |
| Repository        | `nerminIT/marketplace-ba`                                                              |
| Build Command     | `npm run build`                                                                         |
| **Start Command** | `node scripts/migrate.js && node scripts/seed.js && ./node_modules/.bin/next start -p $PORT` |
| Database          | PostgreSQL (uključiti)                                                                  |

### Zašto baš takav Start Command

OctaDeploy **nikad ne pokreće migracije sam** — provisionira praznu bazu i to je
sve. Migracija zato mora biti ulančana ispred pokretanja servera, u samom Start
Command polju. Ako se polje ostavi prazno, OctaDeploy pokreće
`./node_modules/.bin/next start -p $PORT` direktno i migracija se nikad ne
izvrši — aplikacija se digne, a tabele ne postoje.

`scripts/migrate.js` je idempotentan i neinteraktivan, pa je bezbjedno da se
vrti na svakom restartu kontejnera.

`scripts/seed.js` smije stajati u istom lancu trajno: pri prvom pokretanju
upiše `seeded_at` u tabelu `settings` i od tada preskače početni sadržaj. Zato
kategorija koju obrišeš u CMS-u **neće** biti vraćena sljedećim deployom.

## Port

**Nikad ne hardkodirati port** — ni u `package.json`, ni u kodu. OctaDeploy
dodjeljuje port kroz `$PORT` i mapira ga na Nginx vhost. Hardkodiran port daje
502 Bad Gateway.

## Varijable okruženja

| Varijabla           | Obavezna | Napomena                                                    |
| ------------------- | -------- | ----------------------------------------------------------- |
| `DATABASE_URL`      | da       | OctaDeploy je ubacuje automatski — ne postavljati ručno      |
| `AUTH_SECRET`       | da       | min. 32 znaka; bez nje prijava u CMS baca grešku             |
| `ANTHROPIC_API_KEY` | ne       | bez nje uvoz radi, samo bez automatskog prevoda              |
| `SITE_URL`          | ne       | puna adresa sajta, za meta tagove                            |

Generisanje `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Prvi deploy

1. Uključiti PostgreSQL u panelu.
2. Postaviti varijable: `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
   Ako `ADMIN_PASSWORD` izostaviš, seed generiše nasumičnu lozinku i ispiše je
   u deploy logu — lakše je postaviti je sam.
3. Deploy. U logu se vidi `[migrate] gotovo` pa `[seed] gotovo`.
4. Otvoriti sajt.

## Šta se vidi nakon prvog deploya

Baza je prazna osim početnih kategorija i stranica, pa početna prikazuje hero,
traku povjerenja, kategorije i newsletter — **bez proizvoda**, jer uvoz od
dobavljača još nije podešen (faza 2).

Da bi se vidio pun izgled sa proizvodima, jednom pokrenuti demo artikle:

```bash
node scripts/seed-demo.js
```

Lokalno je to `npm run db:demo`. Na OctaDeployu se pokreće tako što se
privremeno doda u Start Command, ili lokalno uz `DATABASE_URL` postavljen na
produkcijski connection string. Demo proizvodi imaju SKU koji počinje sa
`DEMO-` i brišu se sa `node scripts/seed-demo.js --clear`.

## Napomene

- `npm install` na OctaDeployu uvijek dobija `--legacy-peer-deps` automatski.
- Slike dobavljača se učitavaju sa vanjskih domena; `next.config.ts` zato
  dozvoljava bilo koji `https` host u `images.remotePatterns`.
