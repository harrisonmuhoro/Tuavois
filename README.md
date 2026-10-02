# TuaVois ERP

TuaVois is a travel-agency ERP for client management, quotations, invoicing, payments, trips, vouchers, reporting, and administration. It contains a React/Vite client and an Express/Prisma API backed by MySQL 8.

## Requirements

- Node.js 20 or newer
- MySQL 8
- npm 10 or newer

## Setup

Install dependencies from the repository root:

```bash
npm install
```

Create `server/.env` (or use the root environment file when running from this repository) from `.env.example`. Set `DATABASE_URL` to a MySQL user with a nonblank password and set a random `JWT_SECRET`. The production application refuses to start with a blank database password, the development JWT secret, or a JWT secret shorter than 32 characters.

Create the database, apply the schema, generate Prisma Client, and seed development data:

```bash
cd server
npx prisma generate
npx prisma migrate deploy
npm run db:seed
```

For local schema iteration only, use `npm run db:migrate` instead of `prisma migrate deploy`.

## Development

Start both applications from the root:

```bash
npm run dev
```

The API is available at `http://localhost:5000` and the client at `http://localhost:5173`. The API health endpoint is `GET /api/v1/health`.

Development accounts (seed data only):

| Email | Password |
| --- | --- |
| admin@tuavois.co.ke | password123 |
| jane@tuavois.co.ke | password123 |
| peter@tuavois.co.ke | password123 |
| grace@tuavois.co.ke | password123 |

Never deploy the seed accounts or their passwords.

## Build and deployment

Build both workspaces with:

```bash
npm run build
```

Start the compiled API with `npm run start --workspace=server`. Serve `client/dist` through your static web server, proxy `/api` to the API, configure HTTPS, and limit database access to the API host.

Required production variables are documented in `.env.example`:

- `NODE_ENV=production`
- `PORT`
- `DATABASE_URL` — MySQL URL with a dedicated, password-protected account
- `JWT_SECRET` — random value of at least 32 characters
- `JWT_EXPIRES_IN`
- `CLIENT_URL` — full public client URL
- `UPLOAD_DIR`

Before a release, run the production build, apply migrations, review `npm audit`, back up MySQL, and replace every development secret and account.

The document-number sequence migration must be deployed before running this version:

```bash
npx prisma migrate deploy --schema server/prisma/schema.prisma
```

## Database and Prisma

The Prisma schema is at `server/prisma/schema.prisma`; migrations are at `server/prisma/migrations`. Useful commands:

```bash
npm run db:generate --workspace=server
npm run db:studio --workspace=server
npm run db:seed --workspace=server
```

## Document exports

Financial, sales, and trip reports support Excel export. The invoice, quotation, and receipt tables provide authenticated PDF downloads. PDF generation uses PDFKit because this Windows development environment may block browser child-process launches.
