# Personal Finance

Laravel API and React frontend for personal finance. See [Project.md](Project.md) for scope and financial rules.

Implemented: registration, login/logout, cookie-based session restoration, protected workspace, backend validation and authentication rate limits, SQLite migrations, and API health checks. Financial features are not implemented yet.

## Environment

Verified on this Windows machine:

- PHP 8.4.0 through Herd Lite, with SQLite/PDO, mbstring, OpenSSL, curl, XML, and zip.
- Composer 2.8.12; Laravel Installer 5.27.0.
- Node.js 24.19.0 and npm 11.17.0.
- Git 2.53.0.
- Laravel 13, Sanctum 4, React 19, MUI 9, Vite 8. Exact installed versions are in lockfiles.

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

Authentication follows [Sanctum's SPA cookie flow](https://laravel.com/framework/docs/sanctum): fetch /sanctum/csrf-cookie, then POST /api/register or /api/login. POST /api/logout invalidates the session. Authentication endpoints use Laravel's web middleware for sessions and CSRF; other protected API routes use stateful Sanctum middleware. No authentication tokens are stored in browser storage.

Local frontend hosts on port 5173 are included in config/sanctum.php. If you change the frontend origin, set SANCTUM_STATEFUL_DOMAINS in backend/.env to the exact host and port. No frontend environment variables are required for normal development. API_PROXY_TARGET is an optional Vite server setting used by isolated browser tests.

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

Browser tests use installed Microsoft Edge by default and require PHP on PATH (or PHP_BINARY set to its executable). They start separate servers on ports 8011 and 5174 and use a fresh temporary SQLite database, leaving development data untouched. CSRF remains enabled. The test database is left in the operating system's temporary folder for diagnosis; test reports are ignored by Git. To use installed Chrome instead, set PLAYWRIGHT_CHANNEL=chrome. Both test ports must be free.

## Structure and next work

- backend/: Laravel REST API, database migrations, PHPUnit tests.
- frontend/: React/JavaScript, MUI, Axios, React Router, Vite.
- Project.md: requirements, priorities, roadmap.

Next: user currency/timezone settings, accounts, categories (including registration defaults), and ownership tests. The signed-in workspace is an empty state until financial features are built. Commit each verified milestone separately; commits are not created automatically.

Production deployment is not configured. It needs PostgreSQL verification, production secrets and cookie settings, frontend hosting with API routing, and a deployment smoke test. The Vite development proxy is not a production reverse proxy.
