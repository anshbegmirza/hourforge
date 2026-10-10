# Hourforge

Private job time tracking: Ionic/Angular frontend + Express/MySQL backend.

Each account owns its own customers, employees, and jobs. Auth: email or username + password (bcrypt).

## Stack

| Layer | Choice |
|--------|--------|
| Frontend | Ionic + Angular (PWA) |
| Backend | Node.js + Express (`/api/v1`) |
| Database | MySQL (`hourforge`) |
| i18n | EN / DE / FR (`@ngx-translate`) |

## Prerequisites

- Node.js 20.19+
- MySQL Server running locally

## Setup

```bash
cd backend
copy .env.example .env
npm install
npm run db:setup
```

```bash
cd frontend
npm install
```

Demo login after `db:setup`: `demo@hourforge.app` / `demo1234` (or username `demo`)

Superuser (sample data): `superuser` / `test123` (or `superuser@hourforge.app`)

Login accepts email **or** username.

## Run

```bash
cd backend && npm run dev
```

```bash
cd frontend && npm start
```

- API: `http://localhost:3000/api/v1`
- App: `http://localhost:4200`

## Notes

- No roles in v1 — every user is owner of their own data.
- Client branding from the source UI can be stripped later.
