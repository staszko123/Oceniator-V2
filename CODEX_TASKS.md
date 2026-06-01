# CODEX Tasks

1. Done: add unit tests for `app/src/utils/storage.ts` fallback behavior.
2. Done: add unit tests for `app/src/lib/locationHash.ts` parse/build round-trips.
3. Done: normalize mojibake fallback strings in `app/src/App.tsx` and `README.md`.
4. Done: add a small test for `app/src/services/settingsService.ts` theme/language persistence.
5. Done: add a smoke test for `app/src/config/navigation.ts` viewer-visible items.
6. Done: extract duplicated export helpers into shared `app/src/lib/fileExport.ts`.
7. Done: add coverage for `app/src/features/analytics/filters.ts` empty-filter cases.
8. Done: verify `app/src/components/actions/ContextMenu.tsx` keyboard dismissal behavior with tests.
9. Done: remove dormant `app/src/styles/theme.css` after confirming it is no longer referenced by the active bundle.
10. Done: document the hash-based routing model in `README.md`.
11. Done: add a focused regression test for `app/src/lib/theme.ts` root-class and persistence sync.
12. Done: add an accessibility-focused render test for `app/src/components/ui/ThemeToggle.tsx`.
13. Done: detach unused `app/src/styles/theme.css` import after confirming its utility layer is not referenced by active screens.
14. Done: add regression coverage for `app/src/lib/display.ts` and normalize access-denied copy in `app/src/lib/security.ts`.
15. Done: add focused regression coverage for `app/src/config/status.ts` notification and assessment mappings.
16. Done: add a small normalization test for `app/src/config/userPreferences.ts` exported keys.
17. Pending: add helper-level coverage for `app/src/lib/format.ts` percentage/date formatting fallbacks.
18. Pending: add a tiny unit test for `app/src/features/viewer/viewerMetrics.ts` empty-assessment summaries.
19. Pending: add config-only coverage for `app/src/config/tableActionsConfig.tsx` visible action ids.
20. Pending: add config-only coverage for `app/src/config/tableColumnsConfig.tsx` stable column ordering.
21. Pending: add a small regression test for `app/src/services/notificationsService.ts` unread count helpers.
22. Pending: audit `app/public/` assets against current JSX/CSS references and remove anything fully unused.
23. Pending: add a tiny test for `app/src/features/dashboard/utils.ts` threshold labeling on empty inputs.
24. Pending: add a small test for `app/src/data/demoExport.ts` sample payload shape stability.
