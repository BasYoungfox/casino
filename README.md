# ♠ Casino Royale

Casino met iDEAL/Tikkie stortingen en een admin-goedkeuringsflow.

## Flow

1. Gebruiker maakt een account en stort via Tikkie (iDEAL).
2. Gebruiker uploadt het betalingsbewijs (screenshot/PDF).
3. De storting staat op "In afwachting".
4. Admin opent het admin-panel, bekijkt het bewijs en keurt goed of af.
5. Bij goedkeuring wordt het saldo direct op het gebruikersaccount bijgeschreven.

## Aan de slag

```bash
npm install
npm run db:push      # database aanmaken (SQLite)
npm run db:seed       # admin + demo gebruiker aanmaken
npm run dev           # start dev server op http://localhost:3000
```

## Login gegevens (seed)

- **Admin:**  gebruikersnaam `admin`, wachtwoord `admin123`
- **User:**   gebruikersnaam `demo`,  wachtwoord `user123`

## Configuratie (.env)

- `DATABASE_URL` — SQLite pad (standaard `file:./dev.db`)
- `JWT_SECRET` — wachtwoord voor JWT-ondertekening (verander dit!)
- `TIKKIE_LINK` — jouw publieke Tikkie-betaallink

## Belangrijk

Dit is een lokaal prototype. Voordat je dit in productie gebruikt:
- Verander `JWT_SECRET` naar een lange willekeurige string.
- Gebruik een echte database (PostgreSQL) i.p.v. SQLite.
- Bekijk de Tikkie API voor automatische verificatie in plaats van handmatige controle.
