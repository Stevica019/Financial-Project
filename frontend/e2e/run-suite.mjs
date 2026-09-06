import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'

// Each file gets fresh servers, database and rate-limit cache through Playwright's webServer setup.
// This keeps unrelated workflows from sharing registration quotas.
const files = readdirSync('e2e').filter(name => name.endsWith('.spec.js')).sort()
for (const file of files) {
  const result = spawnSync(process.execPath, [resolve('node_modules/@playwright/test/cli.js'), 'test', `e2e/${file}`, ...process.argv.slice(2)], { stdio: 'inherit', windowsHide: true })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
