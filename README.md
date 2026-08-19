# IsoGuard

IsoGuard is a diploma-project application for managing financial transactions
and flagging unusual completed transactions with an Isolation Forest model.
A suspicious result is a review signal, not a fraud verdict.

## Data and model evaluation

The project uses a synthetic financial-transaction dataset because real banking
data is private and was not available for this diploma project. The generator
simulates routine deposits, salary-like deposits into low-balance accounts,
withdrawals, transfers, transaction velocity, and deliberately unusual cases.

Isolation Forest is trained on the synthetic normal population and evaluates
each completed transaction as a review signal. It uses transaction amount,
time, type, recent account activity, a confirmed-normal account baseline, and
balance-consumption features for withdrawals and transfers. Absolute account
balances are not used as an anomaly signal, so a high-balance account is not
automatically suspicious.

Reported metrics measure performance on held-out synthetic scenarios only.
They must not be interpreted as real-world fraud-detection accuracy. In a
production system, the model would need evaluation and periodic retraining on
approved, privacy-compliant transaction data.

## Architecture

```text
frontend (React + TypeScript)
  ├─ Supabase Auth (identity, sessions, passwords, invitations, MFA)
  └─ backend (ASP.NET Core REST API)
       ├─ local PostgreSQL through Entity Framework Core / Npgsql
       └─ ml-service (private FastAPI Isolation Forest API)
```

Supabase stores only authentication users and authentication-owned security
data. The local PostgreSQL instance stores application profiles, invitation
history, accounts, transactions, anomaly results, and audit logs. A local
profile links to its Supabase identity through `profiles.auth_user_id`.

The browser never calls the ML service or PostgreSQL directly. The Supabase
service-role key belongs only in backend configuration.

Supabase generates signed authentication action links, while the backend sends
invitation, resend, and password-recovery messages through Resend. This avoids
Supabase's built-in authentication email quota. A verified Resend domain is
required before sending to arbitrary recipients; `onboarding@resend.dev` is
intended only for initial delivery tests.

When `SeedAdmin__Enabled=true`, backend startup idempotently synchronizes the
configured initial administrator. It looks up the email in Supabase Auth,
sends a Supabase invitation if the identity does not exist, and upserts the
linked local profile as `ACTIVE / ADMIN`. It never creates or stores a
password.

## Repository

- `frontend/` – existing UI, cleaned and configured as a standard TanStack app
- `backend/` – ASP.NET Core API, EF Core entities, `IsoGuardDbContext`, services
- `ml-service/` – FastAPI prediction service and model scripts
- `backend/Migrations/` – EF Core-managed PostgreSQL schema history

## Local setup

1. Create each service's local environment file:
   `cp backend/.env.example backend/.env`,
   `cp frontend/.env.example frontend/.env`, and
   `cp ml-service/.env.example ml-service/.env`.
   Set server secrets only in `backend/.env`; values prefixed with `VITE_` are
   exposed to the browser and belong only in `frontend/.env`. Never commit any
   `.env` file, service-role key, SMTP password, or real personal email address.
2. Train a model:
   `cd ml-service && python -m venv .venv && . .venv/bin/activate &&
   pip install -r requirements.txt && python scripts/generate_data.py &&
   python scripts/train_model.py`
3. Create a local PostgreSQL database and user:
   `sudo -u postgres psql -c "CREATE USER isoguard WITH PASSWORD 'change-me';"`
   and `sudo -u postgres psql -c "CREATE DATABASE isoguard OWNER isoguard;"`.
4. Restore the local EF tool and apply the schema:
   `dotnet tool restore && cd backend && set -a && source .env && set +a &&
   dotnet ef database update`.
5. Configure Supabase Auth and transactional email using
   `backend/.env.example`, and add the public Supabase URL and publishable key
   using `frontend/.env.example`. Do not apply the application schema to Supabase.
   For Gmail SMTP, enable two-step verification, create a Google App Password,
   and put that password only in `backend/.env`.
6. Start the ML service without Docker:
   `cd ml-service && . .venv/bin/activate && uvicorn app.main:app --reload --port 8000`.
7. Start the API:
   `cd backend && set -a && source .env && set +a && dotnet run`.
8. Start the frontend:
   `cd frontend && npm install && npm run dev`.

After the one-time setup is complete, start the ML service, backend, and
frontend together from the repository root:

```bash
./start.sh
```

Press `Ctrl+C` once to stop all three services cleanly.

Use Node.js 22.12 or newer for the frontend toolchain and .NET 8 for the API.

Create and apply future database migrations from `backend/` with the local
.NET tool manifest.
