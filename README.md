# TuaVois ERP

TuaVois is a full-stack travel-agency ERP built for Kenyan travel companies. It covers the full business lifecycle — CRM, sales, finance, operations, documents, and reporting — under a single, role-controlled application with logical multi-tenancy.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Roles and Permissions](#roles-and-permissions)
- [Features](#features)
- [API Reference](#api-reference)
- [Requirements](#requirements)
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Testing](#testing)
- [Build and Deployment](#build-and-deployment)
- [Database and Prisma](#database-and-prisma)
- [File Uploads and Documents](#file-uploads-and-documents)
- [PDF and Excel Exports](#pdf-and-excel-exports)
- [Notifications and Audit Log](#notifications-and-audit-log)
- [Security Notes](#security-notes)
- [Known Technical Notes](#known-technical-notes)
- [Roadmap](#roadmap)

---

## Overview

TuaVois is a monorepo containing two workspaces:

| Workspace | Technology | Dev Port |
|---|---|---|
| `client` | React 19, TypeScript, Vite, Tailwind CSS | `5173` |
| `server` | Node.js, Express 5, TypeScript, Prisma ORM | `5000` |

The backend uses MySQL 8 via Prisma and issues JWT access tokens for session management. All business data is company-scoped (logical multi-tenancy). A `SUPERADMIN` role provides platform-level cross-company access through a separate `/api/v1/system/*` namespace.

---

## Tech Stack

### Client (`client/`)

| Category | Package |
|---|---|
| Framework | React 19, React Router DOM 7 |
| State / Data fetching | TanStack Query 5 |
| Forms | React Hook Form 7 + Zod |
| HTTP | Axios |
| Charts | Recharts 3 |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Toasts | React Hot Toast |
| Date utilities | date-fns |
| Build tool | Vite 8 |
| Linter | OxLint |

### Server (`server/`)

| Category | Package |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express 5 |
| ORM | Prisma 6 + `@prisma/client` |
| Database | MySQL 8 |
| Auth | `jsonwebtoken`, `bcryptjs` |
| Validation | Zod |
| File uploads | Multer |
| PDF generation | PDFKit |
| Excel exports | ExcelJS |
| Security | Helmet, express-rate-limit |
| TypeScript | `ts-node`, `typescript` 5 |

---

## Architecture

```
TuaVois/
├── client/            # React/Vite SPA
│   └── src/
│       ├── api/       # Axios API client modules
│       ├── components/# Shared UI components
│       ├── contexts/  # React contexts (Auth, etc.)
│       ├── layouts/   # App shell and route guards
│       ├── pages/     # One file per route/screen
│       ├── types/     # Shared TypeScript types
│       └── utils/     # Formatters, helpers
│
├── server/            # Express API
│   ├── prisma/
│   │   ├── schema.prisma   # Data model
│   │   ├── migrations/     # Prisma migration history
│   │   └── seed.ts         # Development seed data
│   └── src/
│       ├── app.ts          # Express app factory
│       ├── server.ts       # HTTP server entry point
│       ├── config/         # Config helpers
│       ├── controllers/    # Route handlers (business logic)
│       ├── middleware/      # Auth, authorization, error handling
│       ├── routes/         # Route definitions
│       ├── utils/          # Shared utilities (PDF, Excel, etc.)
│       └── validators/     # Zod request schemas
│
├── docs/
│   └── openapi.yaml        # OpenAPI 3 specification
│
└── uploads/               # Runtime file upload storage
```

### Multi-tenancy model

Every business record (clients, quotations, invoices, trips, documents, audit logs, notifications) carries a `companyId` foreign key. All controller reads and writes apply a `tenantScope(req)` filter so users can only access their own company's data. A `SUPERADMIN` may explicitly target any company through the `/api/v1/system/*` namespace.

---

## Roles and Permissions

| Role | Scope | Description |
|---|---|---|
| `SUPERADMIN` | Platform | Platform-level access. Manages companies, global users, global audit logs. Uses `/system/*` routes. |
| `ADMIN` | Company | Full access within their own company. Cannot cross tenant boundaries. |
| `SALES_CONSULTANT` | Company | CRM, prospects, quotations, invoices, payments, trips, letters, reports. |
| `OPERATIONS_STAFF` | Company | Clients, trips, vouchers, itineraries, reports. |
| `ACCOUNTANT` | Company | Invoices, payments, financial reports, receipts, credit notes. |
| `STAFF` | Company | Dashboard, search, read-only CRM and sales views. |

> **`ADMIN` is a company admin, not a platform admin.** A separate `SUPERADMIN` role handles cross-company platform work and uses the `/api/v1/system/*` API namespace with explicit company context when needed.

---

## Features

### CRM
- **Clients** — full CRUD, search, pagination, Excel export, profile pages with related quotations, invoices, payments, trips, documents, and activity timeline.
- **Prospects** — creation, filtering, conversion to clients, Excel export.

### Sales
- **Quotations** — creation, editing, PDF download, conversion to invoice, Excel export.
- **Invoices** — creation, editing, filtering by status, balance tracking, PDF download, Excel export.
- **Credit Notes** — creation, partial/full application to invoices, voiding, audit logging.
- **Letters** — letter creation for clients or trips.

### Finance
- **Payments** — transaction processing with InnoDB serializable transactions, invoice balance updates, receipt generation, audit entries, Excel export.
- **Receipts** — listing with PDF download.

### Operations
- **Trips** — full trip lifecycle with participant management, expense tracking (add/edit/delete), status transitions, Excel export.
- **Itineraries** — day/activity builder with operational sections, template support.
- **Vouchers** — hotel, transfer, and service vouchers with status transitions.

### Documents
- File upload with type and size validation.
- Attachments linked to clients, trips, invoices, or quotations.
- Authenticated listing, download, and deletion.

### Reporting
- Financial, sales, and trips reports with date filtering.
- Currency-aware aggregation with explicit mixed-currency warnings.
- Excel export for all major reports and tables.
- PDF export for invoices, quotations, and receipts.
- Backend-generated report PDFs (no `window.print()`).

### Administration
- **Staff management** — create, edit, deactivate staff within a company.
- **Company settings** — company profile, branding, and configuration.
- **System admin** — `SUPERADMIN`-only screens for platform company and user management.

### Other
- **Dashboard** — Recharts trend/status charts, month-over-month collection comparison, KPI cards.
- **Notifications** — in-app notifications for overdue invoices, payment receipts, trip assignments, trip milestones, and 7-day reminders. Idempotent generation; 15-minute scheduler.
- **Audit log** — material create/update/delete events recorded across CRM, sales, finance, operations, staff, and settings.
- **Global search** — cross-entity keyword search.
- **OpenAPI docs** — served at `/api/v1/docs`; downloadable spec at `/api/v1/openapi.yaml`.

---

## API Reference

The OpenAPI 3 specification is at `docs/openapi.yaml` and is served locally at `http://localhost:5000/api/v1/docs`.

### Route groups

| Prefix | Auth required | Scope |
|---|---|---|
| `POST /api/v1/auth/login` | No | — |
| `GET  /api/v1/auth/me` | Yes | Company |
| `/api/v1/clients/*` | Yes | Company |
| `/api/v1/prospects/*` | Yes | Company |
| `/api/v1/quotations/*` | Yes | Company |
| `/api/v1/invoices/*` | Yes | Company |
| `/api/v1/payments/*` | Yes | Company |
| `/api/v1/trips/*` | Yes | Company |
| `/api/v1/itineraries/*` | Yes | Company |
| `/api/v1/vouchers/*` | Yes | Company |
| `/api/v1/credit-notes/*` | Yes | Company |
| `/api/v1/letters/*` | Yes | Company |
| `/api/v1/documents/*` | Yes | Company |
| `/api/v1/reports/*` | Yes | Company |
| `/api/v1/notifications/*` | Yes | Company |
| `/api/v1/audit-log` | Yes | Company |
| `/api/v1/search` | Yes | Company |
| `/api/v1/admin/*` | Yes | Company (`ADMIN`) |
| `/api/v1/system/*` | Yes | Platform (`SUPERADMIN`) |

Health check: `GET /api/v1/health`

---

## Requirements

- Node.js **20** or newer
- npm **10** or newer
- MySQL **8**

---

## Setup

### 1. Install dependencies

From the repository root (installs both workspaces):

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` at the repository root (or to `server/.env`):

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

- `DATABASE_URL` — MySQL connection string with a dedicated user and a **non-blank password**.
- `JWT_SECRET` — a random string of **at least 32 characters**.

### 3. Prepare the database

```bash
cd server
npx prisma generate          # generate Prisma Client
npx prisma migrate deploy    # apply all migrations
npm run db:seed              # load development seed data
```

> For local schema iteration only, use `npm run db:migrate` (`prisma migrate dev`) instead of `prisma migrate deploy`.

---

## Environment Variables

All required variables are documented in `.env.example`.

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | `development` or `production` |
| `PORT` | Yes | API server port (default `5000`) |
| `DATABASE_URL` | Yes | MySQL connection string |
| `DATABASE_URL_TEST` | Dev | Isolated MySQL database for the test suite |
| `JWT_SECRET` | Yes | Random string ≥ 32 characters. **Never commit a real value.** |
| `JWT_EXPIRES_IN` | Yes | Token lifetime (e.g. `15m`) |
| `CLIENT_URL` | Yes | Full public client URL for CORS |
| `UPLOAD_DIR` | Yes | Absolute or relative path for file uploads |
| `ALLOW_PUBLIC_COMPANY_PROVISIONING` | No | Set `false` in production |
| `SUPERADMIN_EMAIL` | Bootstrap | One-time seed value for the platform superadmin account |
| `SUPERADMIN_PASSWORD` | Bootstrap | One-time seed value. Change immediately after first login. |

> **Production guards** — the server refuses to start if `DATABASE_URL` contains a blank password, `JWT_SECRET` is the development placeholder, or `JWT_SECRET` is shorter than 32 characters.

---

## Development

Start both the API and the client from the repository root:

```bash
npm run dev
```

| Service | URL |
|---|---|
| API | `http://localhost:5000` |
| Client | `http://localhost:5173` |
| API health | `http://localhost:5000/api/v1/health` |
| API docs | `http://localhost:5000/api/v1/docs` |

### Development seed accounts

> **Never deploy seed accounts or their passwords.**

| Email | Password | Role |
|---|---|---|
| `admin@tuavois.co.ke` | `password123` | `ADMIN` |
| `jane@tuavois.co.ke` | `password123` | `SALES_CONSULTANT` |
| `peter@tuavois.co.ke` | `password123` | `OPERATIONS_STAFF` |
| `grace@tuavois.co.ke` | `password123` | `ACCOUNTANT` |

---

## Testing

The server includes an integration test suite that runs against an isolated MySQL database (`DATABASE_URL_TEST`).

```bash
cd server
npm test
```

The suite covers:

- Input validation for all mutation endpoints
- JWT authentication (valid, invalid, expired, missing)
- Role-based authorization (allow/deny by role and permission)
- Invoice total calculations
- Payment processing and invoice balance updates
- Credit note application and voiding
- Production configuration guards (blank password, weak JWT secret)
- Error response normalization
- InnoDB transaction rollback behavior
- Concurrent document-number sequence reservations (serializable isolation)

All 14 test cases pass against the isolated database.

---

## Build and Deployment

### Build

```bash
npm run build
```

This builds both workspaces: `server/dist/` (compiled TypeScript) and `client/dist/` (static bundle).

### Run production API

```bash
npm run start --workspace=server
```

### Serve the client

Serve `client/dist/` through a static web server (e.g. Nginx). Proxy all `/api` requests to the API process and configure HTTPS.

### Pre-release checklist

- [ ] Run `npm audit --omit=dev --workspace=server --audit-level=high` and resolve any findings.
- [ ] Apply all pending migrations: `npx prisma migrate deploy --schema server/prisma/schema.prisma`
- [ ] Back up MySQL before applying migrations to production.
- [ ] Rotate every development secret and remove all seed accounts.
- [ ] Set `NODE_ENV=production` and `ALLOW_PUBLIC_COMPANY_PROVISIONING=false`.
- [ ] Configure HTTPS and database access restricted to the API host only.

---

## Database and Prisma

| Item | Path |
|---|---|
| Prisma schema | `server/prisma/schema.prisma` |
| Migrations | `server/prisma/migrations/` |
| Seed script | `server/prisma/seed.ts` |

### Useful commands

```bash
# Regenerate Prisma Client after schema changes
npm run db:generate --workspace=server

# Create a new migration (development only)
npm run db:migrate --workspace=server

# Apply migrations (CI / production)
npx prisma migrate deploy --schema server/prisma/schema.prisma

# Seed development data
npm run db:seed --workspace=server

# Open Prisma Studio
npm run db:studio --workspace=server
```

---

## File Uploads and Documents

Uploaded files are stored in the directory set by `UPLOAD_DIR` (default `./uploads`). Each upload is recorded in the `Document` table and linked to a `clientId`, `tripId`, `invoiceId`, or `quotationId`.

- **Allowed types** — enforced by Multer MIME-type validation server-side.
- **Size limits** — enforced per-upload by Multer.
- **Authorization** — every download and deletion endpoint verifies the requesting user's company matches the document's company.

---

## PDF and Excel Exports

### PDF

PDF generation uses **PDFKit** because the Windows development environment blocks browser child-process launches (`spawn EPERM`). PDF endpoints are authenticated and streamed directly.

| Endpoint | Document |
|---|---|
| `GET /api/v1/invoices/:id/pdf` | Invoice |
| `GET /api/v1/quotations/:id/pdf` | Quotation |
| `GET /api/v1/payments/:id/receipt/pdf` | Receipt |
| `GET /api/v1/reports/financial/pdf` | Financial report |
| `GET /api/v1/reports/sales/pdf` | Sales report |
| `GET /api/v1/reports/trips/pdf` | Trips report |

### Excel

All major list views expose authenticated `.xlsx` download endpoints via **ExcelJS**:

Clients, Prospects, Quotations, Invoices, Payments, Receipts, Trips, Vouchers, Credit Notes, Financial Report, Sales Report, Trips Report.

---

## Notifications and Audit Log

### Notifications

Notifications are generated automatically for:

- **Overdue invoices** — idempotent, checked on a 15-minute server schedule.
- **Payment receipts** — on payment creation.
- **Trip assignment** — when a user is added to a trip.
- **Trip status changes** — on status transition.
- **Trip start / end reminders** — 7 days before the trip starts and 7 days before it ends.

Users can mark individual or all notifications as read via the in-app notification centre.

### Audit Log

Material create, update, and delete events are recorded across every domain:

CRM, sales, finance (invoices, payments, credit notes), operations (trips, vouchers, itineraries), staff management, company settings, and document actions.

The audit log screen is accessible to `ADMIN` and `SUPERADMIN` users.

---

## Security Notes

- Secrets are enforced at startup — the server will not start in production with weak or default values.
- JWT tokens are short-lived (`JWT_EXPIRES_IN`). Consider adding refresh-token rotation for high-security deployments.
- Bearer tokens are stored in `localStorage` in the current implementation. For higher security, migrate to `HttpOnly` / `SameSite=Strict` cookies.
- The `POST /api/v1/companies` endpoint is controlled by `ALLOW_PUBLIC_COMPANY_PROVISIONING`. Set it to `false` in production.
- All file downloads are authorized against the requesting user's company before streaming.
- Rate limiting is applied globally via `express-rate-limit`.
- Security headers are set by `helmet`.
- `SUPERADMIN` actions are separately audited and require explicit company context for company-specific operations — they do not silently inherit a company scope from a null `companyId`.

---

## Known Technical Notes

- The PDF engine is **PDFKit** (not Puppeteer) because the local Windows development environment blocks child-process launches with `spawn EPERM`.
- The client production build may require elevated Windows process permissions if Vite fails with `spawn EPERM`.
- The Prisma schema enforces InnoDB storage engine for atomicity. Serializable transactions are used for concurrent payment/credit updates and document-number sequence reservations.
- Raw SQL in the dashboard and reports controllers explicitly includes company conditions — they are not automatically scoped by Prisma.

---

## Roadmap

The following are out of scope for the current release but planned for future iterations:

- [ ] Vendor portal
- [ ] Mobile application (iOS / Android)
- [ ] M-Pesa and payment gateway integrations
- [ ] Email / SMS / WhatsApp integrations
- [ ] Calendar integrations
- [ ] Advanced analytics and revenue forecasting
- [ ] Full platform-level multi-company tenancy with `SUPERADMIN` UI
- [ ] Automated scheduled report delivery
- [ ] MFA for superadmin accounts
