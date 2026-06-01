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
