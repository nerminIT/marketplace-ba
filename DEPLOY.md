# Deploy na OctaDeploy

## Podešavanja u panelu

| Polje              | Vrijednost                                                        |
| ------------------ | ----------------------------------------------------------------- |
| Repository         | `nerminIT/marketplace-ba`                                          |
| Build Command      | `npm run build`                                                    |
| **Start Command**  | `node scripts/migrate.js && ./node_modules/.bin/next start -p $PORT` |
| Database           | PostgreSQL (uključiti)                                             |

### Zašto baš takav Start Command

OctaDeploy **nikad ne pokreće migracije sam** — provisionira praznu bazu i to je
sve. Migracija zato mora biti ulančana ispred pokretanja servera, u samom Start
Command polju. Ako se polje ostavi prazno, OctaDeploy pokreće
`./node_modules/.bin/next start -p $PORT` direktno i migracija se nikad ne
izvrši — aplikacija se digne, a tabele ne postoje.

`scripts/migrate.js` je idempotentan i neinteraktivan, pa je bezbjedno da se
vrti na svakom restartu kontejnera.

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
2. Postaviti `AUTH_SECRET`.
3. Deploy — `migrate.js` kreira tabele.
4. Jednokratno pokrenuti seed da se napravi prvi admin. Dvije opcije:
   - privremeno promijeniti Start Command u
     `node scripts/migrate.js && node scripts/seed.js && ./node_modules/.bin/next start -p $PORT`,
     deployati, pročitati lozinku iz log-a, pa vratiti Start Command nazad; ili
   - pokrenuti seed lokalno protiv produkcijske baze, sa `DATABASE_URL`
     postavljenim na produkcijski connection string.
5. Prijaviti se na `/admin` i **odmah promijeniti lozinku**.

## Napomene

- `npm install` na OctaDeployu uvijek dobija `--legacy-peer-deps` automatski.
- Slike dobavljača se učitavaju sa vanjskih domena; `next.config.ts` zato
  dozvoljava bilo koji `https` host u `images.remotePatterns`.
