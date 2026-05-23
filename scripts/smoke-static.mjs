import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const requiredFiles = [
  'index.html',
  'package.json',
  'vite.config.ts',
  'app/src/App.tsx',
  'app/src/main.tsx',
  'app/src/data/localProvider.ts',
  'app/src/data/supabaseProvider.ts',
  'app/src/domain/types.ts',
  'legacy/index.html',
]

const failures = []

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) failures.push(`Missing required file: ${file}`)
}

const rootHtml = existsSync(join(root, 'index.html')) ? read('index.html') : ''
if (!rootHtml.includes('/app/src/main.tsx')) {
  failures.push('Root index.html must load the React v2 entrypoint /app/src/main.tsx')
}
if (rootHtml.includes('js/main.js') || rootHtml.includes('css/style.css')) {
  failures.push('Root index.html must not load legacy js/css assets')
}

const legacyHtml = existsSync(join(root, 'legacy/index.html')) ? read('legacy/index.html') : ''
if (!legacyHtml.includes('js/main.js')) {
  failures.push('legacy/index.html should preserve the old static app shell')
}

const app = existsSync(join(root, 'app/src/App.tsx')) ? read('app/src/App.tsx') : ''
for (const account of ['admin/admin123', 'lider01/lider123', 'lider02/lider123', 'podglad/podglad123']) {
  if (!app.includes(account)) failures.push(`Login screen is missing demo account hint: ${account}`)
}
for (const guard of ['availableNavItems', 'canCreate(user)', 'canAdmin(user)', 'readableError']) {
  if (!app.includes(guard)) failures.push(`App.tsx is missing guard/helper: ${guard}`)
}
for (const feature of ['TeamView', "'team'", 'Wszystkie statusy', 'Wszystkie okresy', 'DashboardWidget', 'oc_v2_dashboard_prefs', 'Trend okresowy', 'Ranking liderow', 'exportDashboardCsv', 'dashboardDiagnostics']) {
  if (!app.includes(feature)) failures.push(`App.tsx is missing feature marker: ${feature}`)
}

const localProvider = existsSync(join(root, 'app/src/data/localProvider.ts')) ? read('app/src/data/localProvider.ts') : ''
for (const login of ['lider01', 'lider02']) {
  if (!localProvider.includes(`login: '${login}'`)) failures.push(`Local provider is missing demo user ${login}`)
}
if (!localProvider.includes('defaultManagedUsers') || !localProvider.includes('merged.length !== existing.length')) {
  failures.push('Local provider should merge newly added default users into existing oc_v2_users')
}

const supabaseProvider = existsSync(join(root, 'app/src/data/supabaseProvider.ts')) ? read('app/src/data/supabaseProvider.ts') : ''
for (const table of ['profiles', 'assessments', 'goals', 'specialists', 'departments', 'positions', 'periods']) {
  if (!supabaseProvider.includes(`'${table}'`)) failures.push(`Supabase provider does not reference table ${table}`)
}

const packageJson = existsSync(join(root, 'package.json')) ? JSON.parse(read('package.json')) : {}
for (const script of ['dev', 'build', 'lint', 'smoke']) {
  if (!packageJson.scripts?.[script]) failures.push(`Missing package script: ${script}`)
}

const scanFiles = requiredFiles.concat(['README.md', 'SMOKE_CHECKS.md'])
for (const file of scanFiles) {
  if (!existsSync(join(root, file))) continue
  const content = read(file)
  if (content.includes('<<<<<<<') || content.includes('=======') || content.includes('>>>>>>>')) {
    failures.push(`Conflict marker found in ${file}`)
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log('Static smoke passed.')
