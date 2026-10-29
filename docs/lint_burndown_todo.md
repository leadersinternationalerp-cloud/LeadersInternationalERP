# ESLint Technical Debt & Warning Burndown Plan

As required by the ERP Baseline Remediation specification, `npm run lint` now exits cleanly with **0 errors**.
All remaining 812 warnings represent non-breaking technical debt (primarily legacy loose typing and unused parameter bindings across migrated client components).

## Rule Breakdown

| Rule | Count | Remediation Strategy |
|---|---|---|
| `@typescript-eslint/no-explicit-any` | 494 | Incrementally replace `any` with strict generated Supabase database types (`Database['public']['Tables'][T]['Row']`) and explicit interface definitions in `src/types/`. Priority order: `src/lib/`, `src/utils/`, followed by dashboard views. |
| `@typescript-eslint/no-unused-vars` | 101 | Prefix intentionally unused callback parameters with `_` or eliminate redundant assignments from destructuring. |
| `react/no-unescaped-entities` | 91 | Replace raw single/double quotes in JSX copy with HTML entities (`&apos;`, `&quot;`). |
| `react-hooks/static-components` | 79 | Move pure subcomponents declared inside render bodies outside the parent component scope or wrap in `useCallback` / memoized renderers. |
| `@typescript-eslint/no-require-imports` | 21 | Migrate remaining server-side CommonJS `require()` statements (e.g. JSON asset loading and dynamic PDF service helpers) to standard ES `import` declarations. |
| `react-hooks/set-state-in-effect` | 11 | Refactor state synchronization patterns in client filters and data tables to derive state during render or use event handlers instead of `useEffect`. |
| `@next/next/no-img-element` | 7 | Replace native `<img>` tags with Next.js `<Image />` for optimized asset caching and layout shifts. |
| `react-hooks/exhaustive-deps` | 6 | Audit dependency arrays in critical query hooks and stabilize external references via `useCallback` / `useMemo`. |
| `react-hooks/purity` / `react-hooks/immutability` | 6 | Eliminate mutable in-place array/object transformations inside render branches. |

## Milestones

1. **Phase 1 (Complete)**: Zero blocking ESLint errors. Automated CI enforcement with `npm run lint`.
2. **Phase 2**: Complete removal of `any` across `src/lib/` (mailer, PDF generators, accounting service, auth session helpers).
3. **Phase 3**: Component hygiene pass across high-frequency interfaces (`DashboardLayoutClient`, `PaymentsClient`, `SettingsClient`).
