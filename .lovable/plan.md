

## Plan: Organize Project Structure & Remove Unused Files

### Important Constraint

This is a **Vite + React** project. Vite and its tooling expect specific file locations:
- `src/` for frontend source code
- `supabase/functions/` for backend edge functions  
- `supabase/migrations/` for database migrations

**We cannot move files into arbitrary `Backend/`, `Frontend/`, `Database/` top-level folders** — that would break the build system, imports, and the Lovable Cloud integration. Instead, we'll organize *within* the existing structure using logical sub-folders and clean up unused files.

### Files to Remove (Unused/Redundant)

| File | Reason |
|------|--------|
| `src/pages/Index.tsx` | Default template page, not imported or routed anywhere |
| `src/App.css` | Not imported anywhere — all styling uses Tailwind via `index.css` |

### Frontend Reorganization (`src/`)

The frontend is already well-organized. We'll add a small improvement by grouping related components:

```text
src/
├── components/
│   ├── admin/          ← Move admin-specific components here
│   │   ├── AdminZoneMap.tsx
│   │   ├── CohortAnalyticsTab.tsx
│   │   ├── DemoTriggerPanel.tsx
│   │   ├── FraudNetworkGraph.tsx
│   │   └── TransparencyLedger.tsx
│   ├── worker/         ← Move worker-specific components here
│   │   ├── GpsLocationCard.tsx
│   │   ├── PayoutSimulator.tsx
│   │   ├── ShieldScoreGauge.tsx
│   │   └── WorkerReportPanel.tsx
│   ├── shared/         ← Move shared components here
│   │   ├── AppealDialog.tsx
│   │   ├── LanguageToggle.tsx
│   │   ├── NavLink.tsx
│   │   ├── NotificationBell.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── ThemeToggle.tsx
│   ├── onboarding/     ← Already organized
│   └── ui/             ← Already organized (shadcn)
├── hooks/              ← Keep as-is
├── lib/                ← Keep as-is
├── pages/              ← Keep as-is (minus Index.tsx)
└── integrations/       ← Keep as-is (auto-generated)
```

### Backend (`supabase/functions/`) — Already Organized
Each edge function is in its own folder. No changes needed.

### Database (`supabase/migrations/`) — Already Organized
Migration files are auto-managed. No changes needed.

### Summary of Changes

1. **Delete** `src/pages/Index.tsx` and `src/App.css`
2. **Create** `src/components/admin/` — move 5 admin components, update imports in `AdminDashboard.tsx`
3. **Create** `src/components/worker/` — move 4 worker components, update imports in `WorkerDashboard.tsx`, `ClaimHistoryPage.tsx`, `ProfilePage.tsx`
4. **Create** `src/components/shared/` — move 6 shared components, update imports across all pages that reference them

All import paths use `@/components/...` so updates are straightforward find-and-replace.

