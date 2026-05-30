# Smoke Test Results

## Date: 2026-05-29

### Automated Checks
- `npm run build` - OK
- `npm run lint` - OK
- `npm run smoke` - OK
- `npm run test` - OK

### Actual Repository State
- The app builds from the root `package.json` and outputs production files to `dist/`.
- `app/src/App.tsx` is now an orchestration layer of about 394 lines, not the previous 2000+ line monolith.
- Main screens are split into feature modules: start, evaluation, team, registry, dashboard, reports, admin, and shell.
- Excel export uses `xlsx` and produces a real `.xlsx` file.
- Role guards live in `app/src/lib/security.ts`.
- Theme tokens and light/dark mode are active, but the styling layer is still concentrated in `app/src/index.css`.
- The shell now includes a persisted collapsed sidebar, richer topbar context, and a narrow-screen guard for widths below 960 px.

### Notes Against Older Documentation
- Old notes claiming `features/*` are still "to implement" are no longer true.
- Old notes claiming `App.tsx` is the main refactor hotspot are outdated in scale.
- `features/auth/LoginScreen.tsx` does not exist anymore; the login screen currently lives in `App.tsx`.
- Current maintainability hotspots are `RegistryView.tsx`, `AdminView.tsx`, `DashboardView.tsx`, and `index.css`.

### Risks And Gaps
- No end-to-end coverage yet, and only the first unit-test layer is being added now.
- There is no current manual smoke report covering all roles and critical flows.
- GitHub Pages workflows had drifted away from the real root build and needed correction.
- Some files and UI strings still show encoding issues with Polish characters, so text cleanup is still needed.

### Recommended Next Batch
1. Finish the first test layer and keep it green in CI.
2. Run a full manual smoke across roles and save the results here.
3. Align README and deployment docs with the actual root build and current hosting target.
4. Reduce complexity in registry, admin, and CSS before the next larger UX pass.
