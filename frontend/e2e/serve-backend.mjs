import { spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

// A fresh database and key for every run; never migrate or seed the developer's database.
const directory = mkdtempSync(join(tmpdir(), 'personal-finance-e2e-'))
const database = join(directory, 'database.sqlite')
writeFileSync(database, '')
const env = {
  ...process.env,
  APP_ENV: 'e2e', // Keep CSRF middleware active (Laravel skips it in "testing").
  APP_KEY: `base64:${randomBytes(32).toString('base64')}`,
  APP_DEBUG: 'false',
  APP_URL: 'http://127.0.0.1:8011',
  APP_CONFIG_CACHE: join(directory, 'config.php'),
  DB_CONNECTION: 'sqlite', DB_DATABASE: database, DB_URL: '',
  CACHE_STORE: 'database', SESSION_DRIVER: 'database',
  SESSION_DOMAIN: '', SESSION_SECURE_COOKIE: 'false',
  SANCTUM_STATEFUL_DOMAINS: '127.0.0.1:5174',
  BCRYPT_ROUNDS: '4', MAIL_MAILER: 'array', QUEUE_CONNECTION: 'sync',
}
const php = process.env.PHP_BINARY || 'php'
const cwd = resolve('../backend')
const migration = spawnSync(php, ['artisan', 'migrate', '--force', '--no-interaction'], { cwd, env, stdio: 'inherit', windowsHide: true })
if (migration.error) throw migration.error
if (migration.status !== 0) process.exit(migration.status ?? 1)

// Launch PHP directly so the test runner can stop it without an artisan child process.
const server = spawn(php, ['-S', '127.0.0.1:8011', '-t', '.', join(cwd, 'vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php')], { cwd: join(cwd, 'public'), env, stdio: 'inherit', windowsHide: true })
server.on('error', error => { console.error(error.message); process.exit(1) })
server.on('exit', code => process.exit(code ?? 0))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill())
