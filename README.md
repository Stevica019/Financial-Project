# Personal Finance

Initial Laravel API and React frontend foundation. See [Project.md](Project.md) for scope and financial rules.

Implemented: Laravel/Sanctum API scaffolding, SQLite migrations, a public API health endpoint, a protected current-user endpoint, and a React/MUI landing page. Registration, login, and financial features are not implemented yet.

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
Copy-Item .env.example .env
php artisan key:generate
New-Item -ItemType File -Path database/database.sqlite -Force
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

Sanctum is installed; the session-based registration/login/logout flow and stateful SPA middleware still need implementation. No frontend environment variables are needed at this stage.

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
npm.cmd run build
```

The API tests verify health routing and rejection of unauthenticated access. Generated Laravel example tests remain. Financial behavior tests and frontend test tooling will be added with the relevant features.

## Structure and next work

- backend/: Laravel REST API, database migrations, PHPUnit tests.
- frontend/: React/JavaScript, MUI, Axios, React Router, Vite.
- Project.md: requirements, priorities, roadmap.

Next: implement session authentication end to end, then user settings, accounts, categories, and ownership tests. Local Git is initialized; no remote repository or commits are created automatically.

Production deployment is not configured. It needs PostgreSQL verification, production secrets and cookie settings, frontend hosting with API routing, and a deployment smoke test. The Vite development proxy is not a production reverse proxy.