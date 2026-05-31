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
  'app/src/config/userPreferences.ts',
  'app/src/services/settingsService.ts',
  'legacy/index.html',
  'BACKEND_SCOPE.md',
  'LAUNCH_CHECKLIST.md',
  'SUPABASE_INTEGRATION.md',
  'PILOT_RUNBOOK.md',
  'vercel.json',
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
const dashboardView = existsSync(join(root, 'app/src/features/dashboard/DashboardView.tsx')) ? read('app/src/features/dashboard/DashboardView.tsx') : ''
const dashboardUtils = existsSync(join(root, 'app/src/features/dashboard/utils.ts')) ? read('app/src/features/dashboard/utils.ts') : ''
const dashboardConfig = existsSync(join(root, 'app/src/config/dashboard.ts')) ? read('app/src/config/dashboard.ts') : ''
const registryView = existsSync(join(root, 'app/src/features/registry/RegistryView.tsx')) ? read('app/src/features/registry/RegistryView.tsx') : ''
for (const guard of ['availableNavItems', 'canCreateRole(user.role)', 'canAdminRole(user.role)', 'canViewTeamRole(user.role)', 'getErrorMessage']) {
  if (!app.includes(guard)) failures.push(`App.tsx is missing guard/helper: ${guard}`)
}
const featureMarkers = [
  ['App.tsx', app, ['TeamView', "'team'"]],
  ['RegistryView.tsx', registryView, ['registry.allPeriods', 'registry.allStatuses', 'registry.queueTitle', 'registry.clearFilters']],
  ['DashboardView.tsx', dashboardView, ['DashboardWidget', 'Trend okresowy', 'Ranking liderów', 'exportDashboardCsv', 'dashboardDiagnostics']],
  ['dashboard/utils.ts', dashboardUtils, ['dashboardPanelConfig']],
  ['config/dashboard.ts', dashboardConfig, ['normalizeDashboardPrefs', 'defaultDashboardPrefs']],
  ['App.tsx', app, ['saveDashboardPreferences', 'userPreferenceKeys.dashboardPrefs', 'userPreferenceKeys.shellCollapsed']],
  ['config/userPreferences.ts', existsSync(join(root, 'app/src/config/userPreferences.ts')) ? read('app/src/config/userPreferences.ts') : '', ['dashboardPrefs', 'shellCollapsed']],
]
for (const [label, content, markers] of featureMarkers) {
  for (const feature of markers) {
    if (!content.includes(feature)) failures.push(`${label} is missing feature marker: ${feature}`)
  }
}

const localProvider = existsSync(join(root, 'app/src/data/localProvider.ts')) ? read('app/src/data/localProvider.ts') : ''
for (const login of ['admin', 'lider01', 'lider02', 'podglad']) {
  if (!localProvider.includes(`login: '${login}'`)) failures.push(`Local provider is missing demo user ${login}`)
}
if (!localProvider.includes('defaultManagedUsers') || !localProvider.includes('merged.length !== existing.length')) {
  failures.push('Local provider should merge newly added default users into existing oc_v2_users')
}

const supabaseProvider = existsSync(join(root, 'app/src/data/supabaseProvider.ts')) ? read('app/src/data/supabaseProvider.ts') : ''
for (const table of ['profiles', 'assessments', 'goals', 'specialists', 'departments', 'positions', 'periods']) {
  if (!supabaseProvider.includes(`'${table}'`)) failures.push(`Supabase provider does not reference table ${table}`)
}
if (!supabaseProvider.includes('signInWithOAuth')) {
  failures.push('Supabase provider should use Google OAuth sign-in.')
}

const settingsService = existsSync(join(root, 'app/src/services/settingsService.ts')) ? read('app/src/services/settingsService.ts') : ''
for (const marker of ['VITE_APP_ENV', 'getOAuthRedirectUrl', 'isLocalDemoEnabled']) {
  if (!settingsService.includes(marker)) failures.push(`settingsService is missing runtime marker: ${marker}`)
}

const packageJson = existsSync(join(root, 'package.json')) ? JSON.parse(read('package.json')) : {}
for (const script of ['dev', 'build', 'lint', 'smoke']) {
  if (!packageJson.scripts?.[script]) failures.push(`Missing package script: ${script}`)
}
if (!packageJson.scripts?.['test:integration']) {
  failures.push('Missing package script: test:integration')
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
