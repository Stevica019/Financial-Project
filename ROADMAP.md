# Progress and roadmap

Last updated: 2026-09-06.

Read this file first when resuming work, then [Project.md](Project.md) for requirements and financial rules, and [README.md](README.md) for setup and test commands. Inspect the current code and Git status before making changes.

## Current handoff

- Latest committed checkpoint: `75a631f` (transaction browsing and transfers). Earlier foundation milestones are recorded in Git.
- Implemented since that checkpoint (uncommitted): financial dashboard API and Overview page with current account/total balances, month selection, monthly income/expenses/net cash flow, and latest 10 entries/transfers. No new migration is required.
- Balances include archived accounts and all dates. Monthly summaries exclude transfers and opening balances. The default month uses the user's timezone; recent activity covers all dates and shows each transfer once. Dashboard reads share the financial writers' per-owner lock for a consistent summary.
- Next milestone: MVP release verification, PostgreSQL checks, production configuration/deployment and demo. Required MVP feature milestones are implemented; the release milestone remains open.
- Last verified on 2026-09-06: 43 backend tests (567 assertions), 12 frontend tests, 7 browser tests, frontend lint/build, and PHP formatting passed. Dashboard coverage includes leap/year/month boundaries, timezone defaults, ownership, archived balances, exact arithmetic, corrections/deletions, month selection, error recovery and mobile layout. The existing bundle-size warning remains; PostgreSQL is not yet verified.
- Browser test files now run with separate backends/databases so unrelated registration workflows do not share rate-limit quotas. Production rate limits are unchanged.
- Tooling change: ESLint 10 with React Hooks checks replaces Oxlint because Windows blocked Oxlint's native module. No Windows security policy was changed.

## Milestones

Complete each feature with its backend, usable UI, validation, ownership checks, and relevant tests. A scaffold or placeholder does not count as a completed feature. Detailed behavior belongs in Project.md.

### MVP

- [x] **Foundation:** Laravel/Sanctum, React/MUI/Vite, local SQLite, API health checks, Git, setup documentation.
- [x] **Authentication:** registration, login/logout, session restoration, protected workspace, CSRF protection, rate limits, and behavior tests.
- [x] **User settings:** persist currency/timezone, require an explicit currency choice, suggest a timezone, handle existing users, and permanently lock currency after the first account.
- [x] **Account management:** create/edit/list/archive/unarchive/delete accounts, exact opening balance/date, validation, and owned-account access. Transaction-dependent functionality is tracked in the next milestone.
- [x] **Category management:** user-owned defaults and custom income/expense categories; new-user seeding, existing-user backfill, editing/deletion, and case-insensitive duplicate protection within a type. Reference guards are tracked below.
- [x] **Income and expenses:** create/edit/delete entries, money/date validation, related-resource ownership, centralized balances, and account history. Prevent deleting referenced accounts/categories or changing categories to an incompatible type; prevent opening-date edits that invalidate existing activity and new activity on archived accounts.
- [x] **Transaction browsing:** backend search, filters, sorting, pagination, and frontend controls.
- [x] **Transfers:** one logical transfer with create/edit/delete flows, both account histories, atomic writes where needed, and correct effects on balances.
- [x] **Financial dashboard:** actual account/total balances, monthly income/expenses/net cash flow, and recent activity. Replaces the placeholder.
- [ ] **MVP release:** PostgreSQL migration/behavior checks, full financial-flow verification, responsive/keyboard review, production configuration/deployment, setup notes, and demo.

### Extended version

Begin after the MVP functionality is stable. Preserve time for deployment and verification.

- [ ] Monthly category budgets and progress.
- [ ] Recurring income/expenses, scheduler, retry safety, and scheduling tests.
- [ ] Savings goals with manually tracked progress.
- [ ] Monthly reports and previous-month comparisons.
- [ ] Verify and deploy the extended version; document scheduler operation.

### Optional and deferred

Only pursue these after required work, with scope confirmed in Project.md.

- [ ] Optional: CSV export, then CSV import.
- [ ] Optional: notifications, advanced charts, dark mode.
- Deferred beyond the initial project: currency conversion and bank integrations.
- Optional follow-ups not yet implemented: password recovery and email verification.

## Next session: MVP release

1. Inspect the release checklist in Project.md, current environment and deployment requirements in README.md.
2. Configure an isolated PostgreSQL database and PHP driver; verify migrations, financial behavior, filtering/history queries and concurrent financial writes without touching local financial data.
3. Review the complete financial workflow, keyboard access and responsive layouts, and address any remaining issues. Review query performance and the existing bundle-size warning for production readiness.
4. Prepare production hosting, API routing, secrets, cookie/session settings and deployment instructions. Confirm the deployment destination with the user when needed.
5. Verify deployed registration/login/logout, CSRF, ownership isolation and financial flows; complete setup documentation and demo.
6. Mark MVP release complete only after those checks and deployment are actually done. Keep extended features in their separate tier.

## Time budget

Original planning target: 25 days at roughly 4 hours per day (100 hours). These are estimates, not elapsed time or evidence of completion. Milestone checkboxes above track actual progress.

| Planned days | Focus |
| --- | --- |
| 1-5 | Environment, architecture, schema foundations, authentication, base frontend |
| 6-10 | Settings, accounts, categories, income/expense workflows, transaction browsing |
| 11-15 | Transfers, financial calculations, dashboard; budgets if core functionality is stable |
| 16-20 | Budgets, recurring transactions, savings goals, reports |
| 21-25 | Verification, fixes, deployment, documentation, demo; optional CSV only if time remains |

## Keeping this useful

- Update this file at the end of each implementation session. Replace stale handoff details rather than appending a chat transcript.
- Mark a milestone in progress when work begins. Check it off only when its acceptance scope works and relevant checks pass; record partial work explicitly.
- Record the latest verification date/results, remaining failures or blockers, and the next concrete task. Tests should match the changes; documentation-only edits do not require rerunning application tests.
- Keep requirements/decisions in Project.md and operating instructions in README.md. Link instead of duplicating them here.
- Use Git for detailed change history. Record a commit checkpoint only after it exists; never assume a commit or deployment happened.
