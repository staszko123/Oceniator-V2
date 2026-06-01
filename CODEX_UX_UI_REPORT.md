# CODEX UX/UI Report

Date: 2026-06-01
Automation: UX/UI quality loop

## Repository scan

- Checked `git status` first and confirmed the branch already contains unrelated in-progress changes outside this UX/UI loop.
- Confirmed the package manager is `npm` at the repo root, with UI linting delegated to the `app` workspace.
- Reviewed the main shell and route wiring in `app/src/App.tsx`, `app/src/config/navigation.ts`, and `app/src/features/shell/AppShell.tsx`.
- Reviewed the current reports surface and shared styles in `app/src/features/reports/ReportsView.tsx` and `app/src/index.css`.
- Reused this report as the handoff log for the current run.

## Safe P3 candidates

1. The expandable `Narzędzia raportu` section does not clearly expose whether the helper content is currently expanded or collapsed.
2. The topbar theme toggle relies on a generic title string and could expose a more explicit accessible label for the current action.
3. The notifications entry point could expose richer state context beyond the unread badge alone, especially for assistive-technology users.

## Selected change

- Chose candidate `#2` as the lowest-risk follow-up P3 improvement because it stays inside one shared shell control and does not affect routing, state, or data rendering.
- Updated the theme toggle in `app/src/features/shell/AppShell.tsx` to expose an explicit action-oriented accessible label for the next state change.
- Added localized theme-toggle action strings in `app/src/i18n/messages.ts`.

## Result

- The topbar theme toggle now announces the next action instead of the generic control category.
- Keyboard and screen-reader users get a clearer cue about whether activating the button will switch to light or dark mode.
- The change remains local to the shared shell and does not affect navigation, persisted data, or report workflows.

## Verification

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run smoke`

## Next safe step

- Add richer accessible state text to the notifications entry point so unread status is announced beyond the numeric badge alone.

## Latest run

Date: 2026-06-01

### Repository scan

- Re-checked `git status` and kept the UX/UI loop scoped away from unrelated in-progress backend and shell changes.
- Confirmed the package manager remains `npm`, with linting delegated to the `app` workspace from the repo root.
- Re-read the current shell and reports surfaces in `app/src/App.tsx`, `app/src/config/navigation.ts`, `app/src/features/shell/AppShell.tsx`, and `app/src/features/reports/ReportsView.tsx`.

### Safe P3 candidates

1. The reports disclosure summary did not expose an action-oriented cue for assistive technology beyond its visible section title and state text.
2. The notifications button still relies on a generic open label and does not announce unread state in the control label itself.
3. The language switcher exposes only a generic control title and could announce the target language more explicitly.

### Selected change

- Chose candidate `#1` as the lowest-risk improvement because it stays inside one feature view and does not affect data, navigation, or shared provider state.
- Updated the reports disclosure in `app/src/features/reports/ReportsView.tsx` to expose a hidden action label and `aria-controls` link to the expandable tools panel.
- Added localized action strings in `app/src/i18n/messages.ts` for expanding and collapsing the reports tools section.

### Result

- Screen-reader users now get a clearer action cue for the `Narzędzia raportu` disclosure while still hearing the current expanded or collapsed state.
- The disclosure summary is now explicitly associated with the tools container it toggles.
- The change remains visual-safe and behavior-safe for the existing reports workflow.

### Verification

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run smoke`

### Next safe step

- Add unread-count context to the notifications trigger label so the topbar control announces whether new items are waiting before the popover is opened.

## Latest run

Date: 2026-06-01

### Repository scan

- Re-checked `git status` and kept this loop scoped away from unrelated in-progress changes already present in backend, tests, and shared UI files.
- Confirmed the package manager remains `npm` at the repository root with the app UI living in the `app` workspace.
- Re-read the route shell and navigation path in `app/src/App.tsx`, `app/src/config/navigation.ts`, and `app/src/features/shell/AppShell.tsx`.
- Reused this report and the current shell/i18n surfaces to avoid repeating earlier accessibility fixes.

### Safe P3 candidates

1. The notifications trigger did not announce unread state in its accessible label, so assistive-technology users had to infer status from the badge alone.
2. The language switcher still uses a generic label and could announce the target language more explicitly.
3. Collapsed sidebar navigation buttons still rely on `title` tooltips instead of exposing a stronger current-location cue.

### Selected change

- Chose candidate `#1` as the lowest-risk improvement because it stays inside one existing shell button and does not change routing, data loading, or popover behavior.
- Updated `app/src/features/shell/AppShell.tsx` so the notifications button label now reflects both the open/closed action and unread count when present.
- Added matching localized strings in `app/src/i18n/messages.ts` for the new notification-label variants.

### Result

- Screen-reader users now hear whether the button will open or close notifications and whether unread items are waiting.
- The visible badge behavior is unchanged, so the improvement stays minimal and visual-safe.
- The edit remains isolated to shared shell accessibility text and does not affect state persistence or provider logic.

### Verification

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run smoke`

### Next safe step

- Update the language switcher label to announce the next language target instead of the generic `Language` control name.

## Latest run

Date: 2026-06-01

### Repository scan

- Re-checked `git status` and kept this UX/UI loop scoped away from unrelated in-progress backend, test, and shell changes already present in the worktree.
- Confirmed the package manager remains `npm` at the repository root, with UI linting routed through the `app` workspace.
- Re-read the current shell controls in `app/src/features/shell/AppShell.tsx` and localized copy in `app/src/i18n/messages.ts` before choosing the smallest safe patch.

### Safe P3 candidates

1. The language switcher still used a generic `Language` label instead of announcing the target language action.
2. Active sidebar navigation items do not expose an explicit `aria-current` cue, especially when the sidebar is collapsed.
3. Collapsed sidebar navigation still leans on tooltip text instead of stronger non-visual context for the active location.

### Selected change

- Chose candidate `#1` as the lowest-risk improvement because it stays inside one existing topbar button and does not affect routing, data, or persisted UI state.
- Updated `app/src/features/shell/AppShell.tsx` so the language switcher now uses an action-oriented label for the next language and exposes that label through both `title` and `aria-label`.
- Added localized target-language strings in `app/src/i18n/messages.ts` for Polish and English.

### Result

- Screen-reader and tooltip users now hear whether the control will switch the app to English or Polish before activating it.
- The visible `PL` / `EN` pill stays unchanged, so the patch remains visually minimal and behavior-safe.
- The edit remains isolated to one shared shell control and matching i18n copy.

### Verification

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run smoke`

### Next safe step

- Add `aria-current` to the active sidebar navigation item so the current location remains explicit even when the sidebar is collapsed.

## Latest run

Date: 2026-06-01

### Repository scan

- Re-checked `git status` and kept this loop isolated from unrelated in-progress backend, test, and shell edits already present in the worktree.
- Confirmed the package manager remains `npm` at the repository root with lint/build/test/smoke driven from root scripts.
- Re-read the active shell and navigation path in `app/src/App.tsx`, `app/src/config/navigation.ts`, `app/src/features/shell/AppShell.tsx`, and this existing report before choosing the next minimal fix.

### Safe P3 candidates

1. The active sidebar navigation item still lacked an explicit `aria-current` cue, so current location depended on visual styling and optional tooltip text.
2. The collapsed sidebar still exposes provider status only in the footer chip, which is hidden on narrow layouts and could use a stronger non-visual summary later.
3. The logout button still relies on visible text plus `title`, and could expose a matching explicit `aria-label` for consistency with the other topbar controls.

### Selected change

- Chose candidate `#1` as the lowest-risk improvement because it stays inside one existing navigation control and does not affect routing, state, or persisted preferences.
- Updated `app/src/features/shell/AppShell.tsx` so the active sidebar button now exposes `aria-current="page"`.
- Added a focused regression test in `app/src/features/shell/AppShell.test.tsx` to verify only the current nav item carries that state.

### Result

- Assistive-technology users now get an explicit current-location cue in the sidebar even when labels are visually collapsed.
- The visible navigation styling and click behavior are unchanged, so the patch remains behavior-safe and visually neutral.
- The change stays local to the shared shell and does not affect data loading, providers, or route transitions.

### Verification

- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

### Next safe step

- Add an explicit `aria-label` to the logout button so the topbar actions follow the same accessible-label pattern as notifications, language, and theme controls.

## Latest run

Date: 2026-06-01

### Repository scan

- Re-checked `git status` and kept this loop scoped to a minimal shell accessibility tweak without disturbing unrelated in-progress work already present in the branch.
- Confirmed the package manager remains `npm` at the repository root, with lint delegated through the `app` workspace.
- Re-read `app/src/features/shell/AppShell.tsx`, `app/src/features/shell/AppShell.test.tsx`, and this report to avoid repeating prior shell accessibility changes.

### Safe P3 candidates

1. The logout button still relied on visible text plus `title` and did not expose the same explicit `aria-label` pattern used by the other topbar actions.
2. The collapsed sidebar still hides provider-mode context in layouts where the footer chip is not visible, so a later run could add a stronger non-visual summary.
3. The notifications popover trigger still does not announce whether the popover is currently expanded beyond the raw control state, so a later pass could refine that cue.

### Selected change

- Chose candidate `#1` as the lowest-risk P3 improvement because it stays inside one existing shell button and does not affect routing, persisted state, or data behavior.
- Updated `app/src/features/shell/AppShell.tsx` so the logout action now exposes `aria-label={t('action.logout')}` alongside its existing visible label and tooltip.
- Added a focused regression test in `app/src/features/shell/AppShell.test.tsx` to verify the logout control exposes the expected accessible label.

### Result

- The logout action now follows the same accessible-label pattern as the notifications, language, and theme controls.
- Screen-reader users get an explicit control name even if the visible button text is not the primary announcement source in a given browser or assistive-technology stack.
- The change is visual-safe and behavior-safe because it only adds accessibility metadata to an existing button.

### Verification

- `npm run test -- AppShell`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

### Next safe step

- Add a concise accessible summary for provider mode when the sidebar is collapsed so environment context remains available beyond the hidden footer chip.

## Latest run

Date: 2026-06-01

### Repository scan

- Re-checked `git status` and kept this UX/UI loop isolated from unrelated in-progress backend, test, and shared-shell edits already present in the worktree.
- Confirmed the package manager remains `npm` at the repository root, with lint/build/test/smoke available from root scripts.
- Re-read the current routing and shell path in `app/src/App.tsx`, `app/src/config/navigation.ts`, `app/src/features/shell/AppShell.tsx`, and this report before choosing the next minimal change.

### Safe P3 candidates

1. The collapsed sidebar provider chip hides its visible text, so provider mode context is less obvious without the separate topbar chip.
2. The sidebar collapse toggle does not expose an explicit expanded/collapsed state beyond its action label.
3. The notifications trigger still relies on `aria-expanded` alone and could later include a stronger state phrase in its accessible name.

### Selected change

- Chose candidate `#1` as the lowest-risk P3 improvement because it stays inside one existing shell element and does not affect routing, data loading, or persisted preferences.
- Updated `app/src/features/shell/AppShell.tsx` so the sidebar provider chip now exposes a localized provider-mode summary through `aria-label` and `title`.
- Added localized provider summary strings in `app/src/i18n/messages.ts` and a focused regression test in `app/src/features/shell/AppShell.test.tsx`.

### Result

- The provider mode remains available to assistive-technology users even when the sidebar is collapsed and the visible chip text is hidden.
- Hover users also get the same concise provider summary through the tooltip without changing the existing layout.
- The patch stays behavior-safe and visual-safe because it only adds accessibility metadata to the existing shell footer chip.

### Verification

- `npm run test -- AppShell`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

### Next safe step

- Add `aria-expanded` and `aria-controls` semantics to the sidebar collapse toggle so the navigation container state is explicit alongside the existing action label.

## Latest run

Date: 2026-06-01

### Repository scan

- Re-checked `git status` and kept this loop scoped away from unrelated in-progress changes already present in `CODEX_TESTS_RELIABILITY_REPORT.md` and `app/src/lib/theme.test.tsx`.
- Confirmed the package manager remains `npm` at the repository root with lint, build, test, and smoke scripts available there.
- Re-read the shell route/layout path in `app/src/App.tsx`, `app/src/config/navigation.ts`, `app/src/features/shell/AppShell.tsx`, and this report before choosing the next smallest safe control-level patch.

### Safe P3 candidates

1. The sidebar collapse toggle still lacked explicit `aria-expanded` and `aria-controls` semantics, so the navigation container state was not exposed beyond the action label.
2. The notifications trigger could later announce expanded or collapsed state more explicitly in its accessible name instead of relying on `aria-expanded` alone.
3. The collapsed sidebar still depends on per-button tooltips for full label context, which could later be reinforced with an off-screen current-section summary.

### Selected change

- Chose candidate `#1` as the lowest-risk P3 improvement because it stays inside one existing shell control and does not affect routing, persisted preferences, or data behavior.
- Updated `app/src/features/shell/AppShell.tsx` so the sidebar toggle now exposes `aria-expanded={!collapsed}` and `aria-controls="sidebar-navigation"`.
- Added a focused regression test in `app/src/features/shell/AppShell.test.tsx` to verify the toggle remains linked to the sidebar nav region and reports the collapsed state.

### Result

- Assistive-technology users now get an explicit expanded/collapsed signal from the sidebar toggle in addition to the existing action label.
- The toggle is now programmatically associated with the navigation region it affects, which improves control-to-region context.
- The patch stays visual-safe and behavior-safe because it only adds accessibility metadata to the existing shell layout.

### Verification

- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

### Next safe step

- Add a concise non-visual summary for the currently active section when the sidebar is collapsed so route context remains available beyond per-button tooltips.

## Latest run

Date: 2026-06-01

### Repository scan

- Re-checked `git status` and kept this loop scoped away from unrelated in-progress report, test, and shell edits already present in the worktree.
- Confirmed the package manager remains `npm` at the repository root with lint, build, test, and smoke available from root scripts.
- Re-read the current shell/routing path in `app/src/App.tsx`, `app/src/config/navigation.ts`, `app/src/features/shell/AppShell.tsx`, and this report before choosing the next minimal change.

### Safe P3 candidates

1. The collapsed sidebar still lacked a concise non-visual summary of the active section, so current route context depended on per-button labels and tooltips.
2. The notifications trigger could later include a stronger expanded or collapsed phrase in its accessible name instead of relying on `aria-expanded` alone.
3. The signed-in user summary in the topbar could later expose a clearer combined accessible label for name, email, and role context.

### Selected change

- Chose candidate `#1` as the lowest-risk P3 improvement because it stays inside one existing shell surface and does not affect routing, persisted preferences, or data behavior.
- Updated `app/src/features/shell/AppShell.tsx` so the collapsed sidebar now includes a localized screen-reader-only summary of the active section.
- Added localized summary strings in `app/src/i18n/messages.ts` and a focused regression test in `app/src/features/shell/AppShell.test.tsx`.

### Result

- Assistive-technology users now keep explicit route context even when the sidebar is collapsed and visible labels are hidden.
- The patch is visual-safe because it reuses the existing `.sr-only` pattern and does not alter the rendered layout.
- The change stays local to shared shell accessibility text and does not affect navigation, state persistence, or data loading.

### Verification

- `npm run test -- AppShell`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

### Next safe step

- Refine the notifications trigger label so expanded or collapsed state is expressed directly in the accessible name as well as through `aria-expanded`.

## Latest run

Date: 2026-06-01

### Repository scan

- Re-checked `git status` and kept this loop scoped away from unrelated in-progress report, backend, test, and shared-shell edits already present in the worktree.
- Confirmed the package manager remains `npm` at the repository root with `lint`, `build`, `test`, and `smoke` available from root scripts.
- Re-read the current shell, route layout, and existing UX/UI report in `app/src/App.tsx`, `app/src/config/navigation.ts`, `app/src/features/shell/AppShell.tsx`, and `CODEX_UX_UI_REPORT.md` before selecting the next smallest patch.

### Safe P3 candidates

1. The in-app system notice did not expose live-status semantics, so partial workspace warnings could be visually present without a clear assistive-technology announcement pattern.
2. The notifications popover still lacks a stronger labeled-region association for its header and content area.
3. The signed-in user summary in the topbar could later expose a combined accessible label for name, email, and role context.

### Selected change

- Chose candidate `#1` as the lowest-risk P3 improvement because it stays inside one existing shell element and does not affect routing, data loading, persisted preferences, or copy.
- Updated `app/src/features/shell/AppShell.tsx` so the existing `.system-notice` now exposes `role="status"`, `aria-live="polite"`, and `aria-atomic="true"`.
- Added a focused regression test in `app/src/features/shell/AppShell.test.tsx` to verify the live-status semantics.

### Result

- Partial workspace notices now announce through a polite live region instead of relying only on visible placement in the shell.
- The patch remains visual-safe because it does not change layout, spacing, or styling of the notice surface.
- The change stays local to one shared shell element and does not affect navigation, provider behavior, or notification state.

### Verification

- `npm run test -- AppShell`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

### Next safe step

- Add a labeled-region relationship to the notifications popover header and container so the panel announces its purpose more explicitly when opened.

## Latest run

Date: 2026-06-01

### Repository scan

- Re-checked `git status` and kept this loop scoped away from unrelated in-progress report, backend, test, and shared-shell edits already present in the worktree.
- Confirmed the package manager remains `npm` at the repository root with `lint`, `build`, `test`, and `smoke` available from root scripts.
- Re-read the current route/layout/component path in `app/src/App.tsx`, `app/src/config/navigation.ts`, `app/src/features/shell/AppShell.tsx`, `app/src/features/shell/AppShell.test.tsx`, and this report before selecting the next smallest safe patch.

### Safe P3 candidates

1. The notifications popover lacked a labeled-region association for its header and container, so the opened panel did not announce its purpose as clearly as it could.
2. The signed-in user summary in the topbar still does not expose a combined accessible label for name, email, and role context.
3. The notifications trigger could later express expanded or collapsed state more explicitly in its accessible name instead of relying on `aria-expanded` alone.

### Selected change

- Chose candidate `#1` as the lowest-risk P3 improvement because it stays inside one existing shell surface and does not affect routing, persisted preferences, or notification behavior.
- Updated `app/src/features/shell/AppShell.tsx` so the notifications popover now exposes `role="region"` and is programmatically named through `aria-labelledby` on its existing title.
- Added a focused regression test in `app/src/features/shell/AppShell.test.tsx` to verify the popover opens as a named region.

### Result

- Assistive-technology users now get a clearer purpose announcement when the notifications panel opens.
- The patch is visual-safe because it reuses the existing popover markup and adds semantics only.
- The change stays local to the shared shell and does not affect notification state, data loading, or navigation.

### Verification

- `npm run test -- AppShell`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

### Next safe step

- Add a combined accessible label to the signed-in user summary so the topbar profile context is announced in one place.

## Latest run

Date: 2026-06-01

### Repository scan

- Re-checked `git status` and kept this UX/UI loop isolated from unrelated in-progress backend, report, test, and shared-shell edits already present in the worktree.
- Confirmed the package manager remains `npm` at the repository root, with lint/build/test/smoke available from root scripts.
- Re-read the current shell route/layout path in `app/src/App.tsx`, `app/src/features/shell/AppShell.tsx`, `app/src/features/shell/AppShell.test.tsx`, and this report before choosing the next minimal change.

### Safe P3 candidates

1. The signed-in user summary in the topbar still did not expose one combined accessible label for name, email, and role context.
2. The notifications trigger could later express expanded or collapsed state more explicitly in its accessible name instead of relying on `aria-expanded` alone.
3. The collapsed sidebar still depends on per-button tooltips for some non-visual context, so a later pass could add a stronger section summary pattern there.

### Selected change

- Chose candidate `#1` as the lowest-risk P3 improvement because it stays inside one existing shell summary block and does not affect routing, persisted preferences, or data behavior.
- Updated `app/src/features/shell/AppShell.tsx` so the signed-in user summary now exposes a localized combined `aria-label` with the current name, email, and role.
- Added localized summary strings in `app/src/i18n/messages.ts` and a focused regression test in `app/src/features/shell/AppShell.test.tsx`.

### Result

- Assistive-technology users now get the full topbar profile context announced in one place instead of inferring it from separate visible fragments.
- The patch is visual-safe because it adds accessibility metadata only and does not alter the rendered layout.
- The change stays local to the shared shell and does not affect navigation, notifications, provider logic, or persisted state.

### Verification

- `npm run test -- AppShell`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

### Next safe step

- Refine the notifications trigger label so the expanded or collapsed state is expressed directly in the accessible name alongside the unread-count context.

## Latest run

Date: 2026-06-01

### Repository scan

- Re-checked `git status` and kept this UX/UI loop isolated from unrelated in-progress backend, report, test, and shell edits already present in the worktree.
- Confirmed the package manager remains `npm` at the repository root, with `lint`, `build`, `test`, and `smoke` available from root scripts and UI code under `app/`.
- Re-read the current route/layout/component path in `app/src/App.tsx`, `app/src/features/shell/AppShell.tsx`, `app/src/features/reports/ReportsView.tsx`, and this report before selecting the next smallest safe reports-area patch.

### Safe P3 candidates

1. The reports hero secondary action cluster still showed helper copy visually, but the hint was not programmatically associated with the related control group.
2. The reports preview row-count summary is still mostly a visual text cue and could later expose a stronger descriptive accessible label.
3. The dashboard widget icon buttons still lean on `title` tooltips and could later gain explicit accessible labels for consistency.

### Selected change

- Chose candidate `#1` as the lowest-risk P3 improvement because it stays inside one existing reports surface, does not affect routing, filtering, exports, or persisted state, and avoids stacking more edits onto the already-busy shell files.
- Updated `app/src/features/reports/ReportsView.tsx` so the secondary hero actions now expose `role="group"` and `aria-describedby` tied to the existing helper hint.
- Added a focused regression test in `app/src/features/reports/ReportsView.test.tsx` to verify that association.

### Result

- Assistive-technology users now get the reports helper hint announced as part of the secondary action cluster instead of encountering it as detached nearby copy.
- The patch is visual-safe because it reuses the existing hint text and changes semantics only.
- The change stays local to the reports hero and does not affect analytics filters, navigation, exports, or modal flows.

### Verification

- `npm run test -- ReportsView`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

### Next safe step

- Add a stronger descriptive accessible label for the reports preview row-count summary so filtered result size is announced with more context than the visible count alone.

## Latest run

Date: 2026-06-01

### Repository scan

- Re-checked `git status` and kept this UX/UI loop scoped away from unrelated in-progress backend, report, test, and shared-shell edits already present in the worktree.
- Confirmed the package manager remains `npm` at the repository root, with lint/build/test/smoke available from root scripts and UI code under `app/`.
- Re-read the current route/layout/component path in `app/src/App.tsx`, `app/src/components/data-table/DataTable.tsx`, `app/src/components/data-table/DataTableToolbar.tsx`, and this report before choosing the next minimal shared-component change.

### Safe P3 candidates

1. The shared table-toolbar result count still exposed only a raw `visible/total` pair, which gave assistive technology weak context for the current filtered result set.
2. The reports hero secondary hint is still only visually adjacent to its action group and could later gain a stronger programmatic association.
3. The report preview summary still relies on raw count copy and could later expose a more descriptive accessible label for the current preview size.

### Selected change

- Chose candidate `#1` as the lowest-risk P3 improvement because it stays inside one shared toolbar element, improves multiple table surfaces at once, and avoids stacking more churn on `AppShell`.
- Updated `app/src/components/data-table/DataTableToolbar.tsx` so the result-count meta now exposes a descriptive accessible label and polite live-region semantics.
- Added localized result-count summary strings in `app/src/i18n/messages.ts` and a focused regression test in `app/src/components/data-table/DataTableToolbar.test.tsx`.

### Result

- Screen-reader users now hear a descriptive summary such as `Widoczne 10 z 20 wierszy` instead of inferring meaning from the raw `10/20` text alone.
- The count can now be announced politely when filtering changes without altering the visible layout or table behavior.
- The patch stays visual-safe and behavior-safe because it only adds accessibility metadata to the existing shared toolbar.

### Verification

- `npm run test -- DataTableToolbar`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

### Next safe step

- Add a stronger programmatic association between the reports hero secondary hint and its action group so the export/navigation cluster keeps the same context non-visually.

## Latest run

Date: 2026-06-01

### Repository scan

- Re-checked `git status` and kept this UX/UI loop scoped away from unrelated in-progress backend, report, test, and shared-shell edits already present in the worktree.
- Confirmed the package manager remains `npm` at the repository root with `lint`, `build`, `test`, and `smoke` available from root scripts.
- Re-read the current route/layout/component path in `app/src/App.tsx`, `app/src/features/reports/ReportsView.tsx`, `app/src/components/data-table/DataTable.tsx`, `app/src/components/data-table/DataTableToolbar.tsx`, and this report before choosing the next minimal change.

### Safe P3 candidates

1. The shared table-toolbar search input relied on placeholder text alone and did not expose an explicit accessible label.
2. The reports hero secondary hint is visually present but not tied to the action group in a stronger programmatic way.
3. The reports preview/count summary could later expose a more descriptive screen-reader label instead of a raw `visible/total` number pair alone.

### Selected change

- Chose candidate `#1` as the lowest-risk P3 improvement because it stays inside one shared input, does not affect routing, state, or data behavior, and improves every table surface at once.
- Updated `app/src/components/data-table/DataTableToolbar.tsx` so the search input now exposes `aria-label={t('table.searchPlaceholder')}`.
- Added a focused regression test in `app/src/components/data-table/DataTableToolbar.test.tsx` to verify the search field exposes the expected accessible label.

### Result

- Screen-reader users now get an explicit name for the shared table search field instead of depending on placeholder text alone.
- The patch is visual-safe because it adds accessibility metadata only and does not change layout, spacing, or behavior.
- The improvement applies across existing table views without touching route wiring, provider state, or exports.

### Verification

- `npm run test -- DataTableToolbar`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

### Next safe step

- Add a stronger accessible summary for the shared table-toolbar result count so the current filtered/total context is announced more clearly than `visible/total` alone.

## Latest run

Date: 2026-06-01

### Repository scan

- Re-checked `git status` and kept this UX/UI loop scoped to one minimal shell interaction without disturbing unrelated in-progress report, backend, test, and shared-shell edits already present in the worktree.
- Confirmed the package manager remains `npm` at the repository root with `lint`, `build`, `test`, and `smoke` available from root scripts.
- Re-read the current route/layout/component path in `app/src/App.tsx`, `app/src/features/shell/AppShell.tsx`, `app/src/features/shell/AppShell.test.tsx`, and this report before choosing the next smallest safe improvement.

### Safe P3 candidates

1. The notifications popover still exposed a no-op `Oznacz wszystkie` action even when there were no notifications to mark as read.
2. The notifications trigger could later express expanded or collapsed state more explicitly in its accessible name instead of relying on `aria-expanded` alone.
3. The topbar profile cluster could later expose stronger role or provider context grouping for assistive-technology users.

### Selected change

- Chose candidate `#1` as the lowest-risk P3 improvement because it stays inside one existing popover action and does not affect routing, persisted preferences, data loading, or notification state shape.
- Updated `app/src/features/shell/AppShell.tsx` so the `Oznacz wszystkie` button is now disabled when the notifications list is empty.
- Added a focused regression test in `app/src/features/shell/AppShell.test.tsx` to verify the empty-state popover disables that action.

### Result

- Users no longer see an enabled dead-end action when the notifications panel is empty.
- Keyboard and screen-reader users now get the expected disabled-state cue for that empty-state action without any layout or copy changes.
- The patch stays visual-safe and behavior-safe because it only tightens an existing button state inside the current popover.

### Verification

- `npm run test -- AppShell`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

### Next safe step

- Refine the notifications trigger label so the expanded or collapsed state is expressed directly in the accessible name alongside the unread-count context.

## Latest run

Date: 2026-06-01

### Repository scan

- Re-checked `git status` and kept this UX/UI loop isolated from unrelated in-progress backend, test, report, and shared-shell edits already present in the worktree.
- Confirmed the package manager remains `npm` at the repository root, with lint/build/test/smoke available from root scripts.
- Re-read the current shell route/layout path in `app/src/App.tsx`, `app/src/features/shell/AppShell.tsx`, `app/src/features/shell/AppShell.test.tsx`, and this report before choosing the next minimal change.

### Safe P3 candidates

1. The theme toggle still lacked explicit toggle-button state semantics, so assistive technology had to infer the active theme from iconography and the next-action label alone.
2. The notifications trigger still relies on `aria-expanded` instead of expressing a clearer expanded/collapsed phrase in its accessible name.
3. The notifications popover action for marking all items as read could later disable itself when no notifications are present to reduce dead-end interactions.

### Selected change

- Chose candidate `#1` as the lowest-risk P3 improvement because it stays inside one existing shell button and does not affect routing, persisted preferences, or data loading.
- Updated `app/src/features/shell/AppShell.tsx` so the theme toggle now exposes `aria-pressed` for the active dark-theme state while keeping the existing action-oriented label.
- Added a focused regression test in `app/src/features/shell/AppShell.test.tsx` to verify the theme toggle exposes the expected pressed state.

### Result

- Assistive-technology users now get explicit toggle-button state semantics in addition to the existing next-action label on the theme control.
- The visible icon and behavior are unchanged, so the fix stays visually neutral and behavior-safe.
- The patch remains local to the shared shell and does not affect navigation, notifications, or provider behavior.

### Verification

- `npm run test -- AppShell`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

### Next safe step

- Refine the notifications trigger label so the expanded or collapsed state is expressed directly in the accessible name alongside the unread-count context.
