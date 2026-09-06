# Personal Finance

Laravel API and React frontend for personal finance. See [Project.md](Project.md) for scope and financial rules, and [ROADMAP.md](ROADMAP.md) for completed work and the next milestone.

## Environment

Verified on this Windows machine:

- PHP 8.4.0 through Herd Lite, with SQLite/PDO, mbstring, OpenSSL, curl, XML, and zip.
- Composer 2.8.12; Laravel Installer 5.27.0.
- Node.js 24.19.0 and npm 11.17.0.
- Git 2.53.0.
- Laravel 13, Sanctum 4, React 19, MUI 9, Vite 8. Exact installed versions are in lockfiles.
- ESLint 10 and React Hooks rules provide frontend linting. This replaces Oxlint, whose native module was blocked by Windows application control.

PHP meets dependency requirements, but update its patch release before production use. PostgreSQL and its PHP driver have not been configured or verified.

Restart your terminal after Node installation if Node/npm are not found. In PowerShell use npm.cmd if execution policy blocks npm.ps1.

## Local setup

From the project folder:

```powershell
cd backend
composer install
if (!(Test-Path .env)) {
    Copy-Item .env.example .env
    php artisan key:generate
}
if (!(Test-Path database/database.sqlite)) {
    New-Item -ItemType File -Path database/database.sqlite
}
php artisan migrate
```

The environment file, app key, SQLite file, and migrations have already been initialized on the original development machine. Skip the copy/key/database creation steps there; do not overwrite an existing environment or database.

Use SQLite for local development. Laravel's default environment includes APP_KEY, APP_URL, DB_CONNECTION=sqlite, and database-backed session/cache/queue drivers. Do not commit .env or real financial data.

In one terminal:

```powershell
cd backend
php artisan serve --host=127.0.0.1 --port=8000
```

In a second terminal, from the project folder:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open http://127.0.0.1:5173. Vite proxies /api and /sanctum to Laravel on port 8000. Use the same hostname consistently. GET /api/health returns {"status":"ok"}; GET /api/user requires authentication.

Open the registration link to create your own local user. Passwords require at least 12 characters and at most 72 UTF-8 bytes. Email addresses are normalized to lowercase. Password recovery and email verification are not implemented yet.

After signing in, complete Settings to choose currency and timezone. Existing users are prompted too. All accounts share the selected currency; creating the first account locks that choice permanently. Timezone can still be changed. Supported currencies: EUR, RSD, USD, GBP, CHF, CAD, AUD.

Overview shows current total and per-account balances (including archived accounts), monthly income/expenses/net cash flow, and the latest 10 entries/transfers across all dates. Choose Summary month to change the monthly figures; its default is the current month in your timezone. Opening balances and transfers do not count as income or expenses. Current balances and recent activity are independent of the selected month. Returning to Overview or using Refresh reloads the financial data. Budget progress for the selected month is also shown; apply the extended-feature migration below.

Accounts supports opening balances/dates, calculated current balances, editing, archiving/unarchiving, deletion of unused accounts, and View history. Categories includes editable defaults and custom income/expense categories. Referenced accounts/categories cannot be deleted, and categories used by entries cannot change type.

Transactions supports creating, editing and deleting income/expenses with positive decimal amounts, an owned account, a matching category, an activity date, a required description and optional notes. Dates must fall between the account opening date and today in your timezone. Balances immediately reflect corrections and deletions. Archived accounts retain their history and allow corrections, but cannot receive new activity.

Use Apply filters to search descriptions/notes and combine account, category, type, inclusive date and amount ranges. Sort by date, amount or description in either direction, choose a page size, and use Previous/Next page. Reset filters restores defaults. Account history uses the same browsing controls and includes transfers with their incoming/outgoing direction; its displayed balance always covers all activity.

Transfers supports creating, editing and deleting a single transfer between two distinct owned accounts. Amounts are positive decimal strings; the date must be on/after both opening dates and no later than today in your timezone. Description is optional. New endpoints must be active; an existing archived endpoint can remain in place during a correction. Transfers affect both balances but do not count as income or expenses, and accounts referenced by transfers cannot be deleted or have their opening date moved past the transfer. The Transfers list also supports description search, either-account filtering, date/amount ranges, sorting and pagination.

For an existing checkout, run `composer install`, `php artisan migrate` in backend, and `npm.cmd ci` in frontend after pulling these changes. The extended-feature migration adds budgets, recurring rules, durable occurrence receipts and nullable scheduling references on transactions. Existing users and financial records are preserved.

Authentication follows [Sanctum's SPA cookie flow](https://laravel.com/framework/docs/sanctum): fetch /sanctum/csrf-cookie, then POST /api/register or /api/login. POST /api/logout invalidates the session. Authentication endpoints use Laravel's web middleware for sessions and CSRF; other protected API routes use stateful Sanctum middleware. No authentication tokens are stored in browser storage.

Local frontend hosts on port 5173 are included in config/sanctum.php. If you change the frontend origin, set SANCTUM_STATEFUL_DOMAINS in backend/.env to the exact host and port. No frontend environment variables are required for normal development. API_PROXY_TARGET is an optional Vite server setting used by isolated browser tests.

## Budgets and recurring transactions

Budgets lets you select a month and create, edit or delete a limit for each expense category. Spent, remaining and percentage used are derived from matching expenses, including archived accounts. Remaining can be negative. Transfers and opening balances are excluded, and there is no rollover. Overview shows the same progress for its selected month.

Recurring supports daily, weekly, monthly and yearly income/expense rules, optional inclusive end dates, editing, pause/resume and deletion. Monthly/yearly schedules clamp short months without losing their original anchor (January 31, February 28/29, then March 31). Dates follow the user's timezone. Creating a rule with a past start date generates its missed entries when processing runs. Edits apply from today onward and skip overdue ungenerated dates; pausing/resuming skips paused dates. Archiving an account pauses its rules; unarchiving requires an explicit resume. Deleting a rule preserves generated entries.

From backend, apply the additive schema update before using these pages:

```powershell
php artisan migrate
```

Run the scheduler in a separate local terminal:

```powershell
php artisan schedule:work
```

For a single processing run or backlog catch-up:

```powershell
php artisan finance:process-recurring --limit=100
php artisan schedule:list
```

The scheduled command runs every minute, processes up to 100 due occurrences per invocation and continues missed dates on later invocations. The manual limit accepts 1 to 10000. A successful run prints the processed occurrence count; a zero count means no eligible work was advanced. Failed runs return a nonzero exit code and Laravel logs the exception. Previously committed occurrences remain; rerun after resolving the failure. Corrections or deletions of generated entries do not get undone by retries.

For production, configure one cron entry to run `php artisan schedule:run` every minute from the deployed backend directory, or the equivalent repeating Windows Task Scheduler action with that working directory and the full PHP executable path. Capture command output and monitor nonzero exits and overdue next-execution dates. No queue worker is required. No persistent OS task has been installed by this change.

The scheduler uses a ten-minute overlap lock, plus database transactions and unique occurrence constraints. After an abrupt process termination, the overlap lock can delay processing until it expires; only clear it with `php artisan schedule:clear-cache` after confirming the previous scheduler is no longer running. SQLite's IMMEDIATE transaction mode needs PHP 8.4+ and waits up to five seconds for a competing writer. Concurrent processing is tested on SQLite/PHP 8.4; PostgreSQL verification remains deferred with release work.

If PHP is absent from PATH on the original machine, use `& "$env:USERPROFILE/.config/herd-lite/bin/php.exe" artisan test` from backend, and set `$env:PHP_BINARY="$env:USERPROFILE/.config/herd-lite/bin/php.exe"` before browser tests.

## Verification

```powershell
cd backend
composer check-platform-reqs
php artisan test
```

From a separate terminal at the project root:

```powershell
cd frontend
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

Backend tests cover registration, password validation/hashing, duplicate emails, login failures, rate limits, session renewal/logout, and protected current-user access. Frontend tests cover forms, validation feedback, session restoration, logout failures, and recovery from unavailable or malformed responses. Generated Laravel example tests remain.

Finance tests cover preferences/currency locking, exact money handling, user-local date validation, account lifecycle, cross-user access rejection, category uniqueness, and category seeding/backfill. Browser tests exercise settings persistence and account/category management at a mobile viewport. Component tests also check list retry and failed deletion recovery.

Transaction tests cover exact balances through entry creation, amount/type/account changes and deletion, negative balances, ownership of entries and related resources, local date boundaries, archive rules and reference protection. The transaction browser test verifies creation, validation feedback, archived-account corrections, deletion, persistence and balances on a small screen.

Browsing/transfer tests cover combined filters, literal wildcard search, inclusive dates and amounts, stable pagination, mixed history with overlapping transaction/transfer IDs, total-balance preservation, changing either transfer endpoint, archive/reference guards, and cross-user rejection. Browser tests cover filter controls and error recovery, deleting the last row on a page, preserved filters after editing, and the transfer lifecycle from both account histories.

Dashboard tests cover exact totals, archived accounts, month/year/leap-day boundaries, timezone defaults, ownership, bounded recent activity, and effects of edits/deletions. Frontend checks cover loading and retry behavior and month selection. The mobile browser workflow verifies summaries, transfer display, history navigation and refreshed corrections.

Extended-feature tests cover budget uniqueness, exact spending and corrections, ownership and reference guards, month-end/leap/year/timezone boundaries, bounded catch-up, edits, pause/resume/archive behavior, inclusive end dates, failure rollback, deleted-entry retry protection, and two simultaneous scheduler processes against a temporary SQLite database. The concurrency test also verifies migration rollback/reapplication preserves transactions. Frontend tests cover failed budget loads and rule status changes; the mobile browser workflow covers budget and recurring-rule CRUD, duplicate validation and dashboard progress.

Browser tests use installed Microsoft Edge by default and require PHP on PATH (or PHP_BINARY set to its executable). They start separate servers on ports 8011 and 5174 and use a fresh temporary SQLite database, leaving development data untouched. CSRF remains enabled. The test database is left in the operating system's temporary folder for diagnosis; test reports are ignored by Git. To use installed Chrome instead, set PLAYWRIGHT_CHANNEL=chrome. Both test ports must be free.

`npm.cmd run test:e2e` runs each browser test file with fresh servers/database/cache to isolate registration rate limits. Authentication rate-limit behavior remains covered by backend tests. For a single workflow, use `npx.cmd playwright test e2e/dashboard.spec.js`. The default Playwright output folder is replaced for each file; inspect a workflow's artifacts by running that file on its own.

## Structure and next work

- backend/: Laravel REST API, database migrations, PHPUnit tests.
- frontend/: React/JavaScript, MUI, Axios, React Router, Vite.
- Project.md: requirements, financial rules, and architecture.
- ROADMAP.md: milestone checklist, current handoff, and verification status.

Follow the next task in [ROADMAP.md](ROADMAP.md). Commit each verified milestone separately; commits are not created automatically.

Production deployment is not configured. It needs PostgreSQL verification, production secrets and cookie settings, frontend hosting with API routing, and a deployment smoke test. The Vite development proxy is not a production reverse proxy.
