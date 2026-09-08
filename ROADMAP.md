# Progress and roadmap

Last updated: 2026-09-08.

Read this file first when resuming work, then [Project.md](Project.md) for requirements and financial rules, and [README.md](README.md) for setup and test commands. Inspect the current code and Git status before making changes.

## Current handoff

- Latest committed checkpoint: `32bc67c` (savings goals and monthly reports). This session's optional features are uncommitted.
- The user authorized CSV export, then CSV import, advanced charts and dark mode on 2026-09-08. All four are implemented. Notifications are skipped and deployment remains deferred.
- CSV export reuses owned browsing filters/sorting across all matching pages. Import supports income, expenses and transfers with a fixed template, preview, shared financial validation, exact duplicate skipping and durable file receipts. Confirmation uses an explicit transaction; an injected database failure verifies complete rollback and successful retry.
- Reports now include a zero-filled 12-month series, selectable 6/12-month charts and metrics, keyboard selection, exact-value tables and category spending shares. Appearance supports persistent System/Light/Dark modes throughout the app.
- Applied the additive CSV receipt migration to the local database on 2026-09-08, preserving existing financial data. No new dependencies or environment variables are required.
- Verified on 2026-09-08: 67 backend tests (922 assertions), 20 frontend tests, all 10 browser tests, frontend lint/build and PHP formatting passed. Mobile coverage includes CSV preview/validation/confirmation/retry, downloads, chart keyboard controls, system-theme changes and overflow checks. A mobile dark-theme screenshot was inspected and chart labels adjusted for readability.
- The build retains the existing bundle-size warning (about 586 kB minified / 187 kB gzip). PostgreSQL verification, production configuration and deployment remain deferred.
- Keep Vite 7.3.6, React plugin 5.2.0 and Vitest 4.1.11 on compatible majors: this stack avoids the machine's Windows Rolldown blocker. ESLint replaces blocked Oxlint. No Windows security settings were changed.
- Recurring processing remains registered every minute. Start locally with `php artisan schedule:work`; no persistent OS task is installed. SQLite uses IMMEDIATE transactions and a five-second busy timeout. See README.md for operating instructions.

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
- [ ] **MVP release:** PostgreSQL migration/behavior checks, full financial-flow verification, responsive/keyboard review, production configuration/deployment, setup notes, and demo. (Me, user wont dont want to focus on this right now, we will be doing this later in the future perhaps the whole project when its done)

### Extended version

The user requested continuing the extended features before release. Preserve the deferred release checklist below.

- [x] Monthly category budgets and progress.
- [x] Recurring income/expenses, scheduler, retry safety, and scheduling tests.
- [x] Savings goals with manually tracked progress.
- [x] Monthly reports and previous-month comparisons.
- [ ] Verify and deploy the extended version; document scheduler operation. (Skip untill app is done, deploy full version)

### Optional and deferred

Only pursue these after required work, with scope confirmed in Project.md.

- [x] Optional: CSV export and CSV import (preview, validation, duplicate protection and atomic confirmation).
- [x] Optional: advanced charts (6/12-month trends, metric selection, category shares and accessible values).
- [x] Optional: dark mode (System/Light/Dark, persistent browser preference).
- Notifications: skipped per user instruction.
- Deferred beyond the initial project: currency conversion and bank integrations.
- Optional follow-ups not yet implemented: password recovery and email verification.

## Next work

The authorized optional features are implemented and verified locally, ready for review in CSV import, Transactions/Transfers/account history, Reports, and the Appearance selector. A dedicated visual polish pass remains a possible future scope. Keep deployment, full release keyboard/responsive review and PostgreSQL checks deferred. No commit was created in this session.

## Deferred MVP release

User follow-up: the current frontend is acceptable for now but looks basic. Consider a dedicated visual polish pass in an upcoming change, covering layout, typography, spacing and overall presentation. This is a future candidate, not a request to start a redesign immediately; retain the working financial flows and responsive/keyboard behavior.

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
