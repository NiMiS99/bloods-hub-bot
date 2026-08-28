# CONTRIBUTING — Bloods Hub Bot

Linee guida per contribuire allo sviluppo del progetto.

---

## Prerequisiti

- Node.js >= 18 (consigliato 20 LTS, vedi `.nvmrc`)
- MySQL 8
- Account Discord Developer Portal (per token bot)
- Git

## Setup locale

```bash
git clone https://github.com/NiMiS99/bloods-hub-bot.git
cd bloods-hub-bot
npm install
cd dashboard && npm install && cd ..
cp .env.example .env          # compila con i tuoi valori
npm run db:migrate
npm run seed
npm run deploy:commands
npm run dev
```

## Flusso di lavoro

1. **Crea un branch** dalla `main`: `git checkout -b feature/nome-feature`
2. **Sviluppa** seguendo le convenzioni (vedi sotto)
3. **Testa**: `npm run test:all` — tutte le 293 assertions devono passare
4. **Linta**: `npm run lint` — niente errori
5. **Committa** con messaggi descrittivi in italiano o inglese
6. **Pusha** e apri una Pull Request

## Convenzioni

### Codice
- **CommonJS** ovunque (`require`/`module.exports`) — niente ESM
- **Indentazione**: 2 spazi (vedi `.editorconfig`)
- **Encoding**: UTF-8, LF line endings
- **Nessun trailing whitespace** (tranne in `.md`)

### Comandi slash
```js
const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('foo').setDescription('…'),
  async execute(interaction, client) { /* … */ },
};
```
- Auto-discovery: `src/commands/**/`. File in sottocartelle (`admin/`, `mod/`) per categorizzazione
- Tutti i testi utente in **italiano**

### Database
- Un modello Sequelize per tabella in `src/db/models/`
- Mai SQL raw tranne aggregazioni critiche
- Migrazioni in `src/db/migrations/` con timestamp

### API
- Route in `src/server/routes/`
- Tutte protette con `requireAuth` + `requireGuildMember` + `requireAdmin` (tranne `public.js`)
- Input validation con middleware `requireBodyFields`, `validateString`

### Frontend
- Next.js 14 static export
- Tailwind CSS per styling
- Componenti in `dashboard/src/components/`
- Pagine in `dashboard/src/app/`

### Sicurezza
- Mai committare secret (token, password, API key)
- Mai modificare `.env` — solo `.env.example`
- Body sanitizer attivo su tutti i POST/PUT
- Audit log su ogni azione admin

## Test

```bash
npm run test:all      # 293 assertions totali
npm run test:pipeline # 217 — logica servizi
npm run test:unit     # 37 — XP, BP, RaidService
npm run test:api      # 16 — API integration
npm run test:e2e      # 23 — E2E smoke (richiede sito live)
npm run lint          # ESLint
```

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`):
- Lint + smoke + pipeline + unit + API su ogni PR
- E2E + build dashboard su push su `main`
- Deploy automatico via SSH (secrets configurati)

## Struttura commit

```
tipo: descrizione breve

- Dettaglio 1
- Dettaglio 2
```

Tipi: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `security`

## Pull Request

- Una feature/fix per PR
- Descrizione chiara del cambiamento
- Link a issue correlate
- Screenshot se UI
- `npm run test:all` deve passare
