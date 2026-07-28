# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

SIWarga is an RT (neighborhood association) administration system: residents, houses, monthly dues (iuran), bills, payments, expenses, and financial reports. It is **API-first / decoupled**: a Laravel API backend and a React SPA frontend, developed and deployed independently.

```
src/
├── backend/    # Laravel 13 API (routes/api.php only — no Blade/Inertia pages are used for the app)
├── frontend/   # React 19 + TS SPA (shadcn-admin based), consumes the API
└── template/   # Unmodified upstream shadcn-admin template — reference only, not part of the app
```

Root-level docs: `docs/PRD.md` (product requirements), `docs/ERD.dbml` (schema).

## Backend (`src/backend/`)

### Commands

```bash
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate --seed        # seeds roles/permissions + demo data
php artisan storage:link          # required for uploaded KTP photos
php artisan serve                 # http://localhost:8000

php artisan test --compact                                   # all tests
php artisan test --compact tests/Feature/Api/BillTest.php    # one file
php artisan test --compact --filter=testName                  # by name

vendor/bin/pint --dirty --format agent   # format PHP files just changed (run before finishing PHP work)
phpstan analyse                           # static analysis (larastan)
composer test        # config:clear + pint --test + phpstan + phpunit (full CI-equivalent check)
```

### Architecture

- **Bootstrapped from `laravel/react-starter-kit`**, so it still contains unused Inertia/Fortify scaffolding (`app/Actions/Fortify/`, `app/Http/Controllers/Settings/`, `resources/`, Fortify/Inertia auth feature tests). None of this is used by the actual application — `routes/web.php` is intentionally empty ("API-only application"). Don't extend the Inertia/Fortify pieces for SIWarga features; all app functionality lives under `routes/api.php` and `app/Http/Controllers/Api/`.
- **Auth**: `AuthController` issues Laravel Sanctum tokens (24h expiry) via `POST /api/auth/login`; all other endpoints require `auth:sanctum`.
- **Authorization (custom RBAC, not Spatie)**: three tables — `roles`, `permissions`, plus pivots `role_permissions` and `user_roles` (models: `Role`, `Permission`, `User::hasPermission()`). Every permission is registered as a `Gate::define()` in `AppServiceProvider::boot()`, mapped to a Policy method (e.g. `Gate::define('houses.edit', [HousePolicy::class, 'update'])`). Routes enforce this with `->middleware('can:houses.edit')` etc. — to add a new permission: create/extend the Policy, register the gate in `AppServiceProvider`, add the permission row via `PermissionSeeder`/`RoleSeeder`, then gate the route.
- **Controllers → Policies → Services**: business logic that's more than a CRUD op lives in `app/Services` (e.g. `BillGenerationService` for idempotent monthly bill generation, `ReportService` for summary/monthly reports), not in controllers.
- **API Resources** (`app/Http/Resources`) shape all JSON responses.
- Feature tests live in `tests/Feature/Api/*Test.php`, one per resource, plus `RbacTest.php` for permission checks. Unit tests cover services (`tests/Unit/BillGenerationServiceTest.php`).

## Frontend (`src/frontend/`)

### Commands

```bash
npm install
cp .env.example .env      # set VITE_API_URL, VITE_USE_MOCK=false for real API
npm run dev                # http://localhost:5173

npm run lint
npm run format              # prettier --write
npm run build                # tsc -b && vite build

npm run test                 # vitest run (browser mode, headless)
npm run test:watch
npm run test:coverage

npx playwright install       # once
npx playwright test                              # full e2e suite (backend + frontend must be running)
npx playwright test e2e/siwarga/auth.spec.ts     # single e2e spec
```

### Architecture

- Based on the **shadcn-admin** template (`src/template/` holds the unmodified upstream for reference/diffing — don't add app code there).
- **Routing**: TanStack Router, file-based under `src/routes/`. Authenticated app pages live under `src/routes/_authenticated/`; `(auth)` and `(errors)` are route groups for sign-in/OTP and error pages. `routeTree.gen.ts` is generated — don't hand-edit.
- **Feature modules** (`src/features/siwarga-*`): one directory per domain (bills, due-types, expenses, houses, payments, reports, residents) plus `auth` and `users`. Each typically has `*-columns.tsx` (table columns), `*-table.tsx`, `*-provider.tsx` (dialog/selection state), and `index.tsx` (page composition) — follow this pattern for new features/resources.
- **Data layer**: `src/services/*.ts` are thin API clients (axios, via `src/services/api.ts`); `src/hooks/use-*.ts` wrap them in TanStack Query hooks. Add a service function + a query/mutation hook per new endpoint rather than calling axios directly from components.
- **Data tables**: shared table primitives in `src/components/data-table/` (bulk actions, view options, etc.) are reused across all `siwarga-*` features — prefer extending these over building bespoke table UI. Tables use server-side pagination/filtering (see `use-table-url-state.ts`, which syncs table state to the URL).
- **State**: Zustand (`src/stores/`) for auth/session; TanStack Query for all server data — don't duplicate server state into Zustand.
- **Mocking**: MSW handlers in `src/mocks/` let the frontend run against fake data when the backend isn't available (`VITE_USE_MOCK=true npm run dev`). When adding/changing an API endpoint, keep the corresponding mock handler in sync if it exists.

## RBAC roles (seeded)

Three roles seeded by `RoleSeeder`/`UserSeeder`: **Admin** (full access), **Bendahara** (payments, expenses, reports), **Warga** (own bills/payments only). Demo logins: `admin@siwarga.test` / `bendahara@siwarga.test` / `warga@siwarga.test`, password `password`.
