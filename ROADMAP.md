# Progress and roadmap

Last updated: 2026-09-06.

Read this file first when resuming work, then [Project.md](Project.md) for requirements and financial rules, and [README.md](README.md) for setup and test commands. Inspect the current code and Git status before making changes.

## Current handoff

- Latest committed checkpoint: `d612952` (income/expenses, balances and history). Earlier foundation milestones are recorded in Git.
- Implemented since that checkpoint (uncommitted): transaction search, filters, stable sorting and pagination; transfer creation/editing/deletion; combined account history with transfer direction; transfer-aware balances and account reference guards. The local transfers migration is applied.
- Archived accounts retain history and balances. Existing transfer endpoints can remain archived during corrections; changing an endpoint requires an active owned account. Both endpoint opening dates are enforced. Financial writes use the existing per-owner transaction lock and each transfer is one record.
- The overview remains a placeholder for financial summaries. Next milestone: financial dashboard with account/total balances, monthly income/expenses/net cash flow, and recent activity.
- Last verified on 2026-09-06: 38 backend tests (496 assertions), 10 frontend tests, 6 browser tests, frontend lint/build, and PHP formatting passed. Browser coverage includes combined filters, paging, final-page deletion, filter error recovery, preserved filters after edits, and transfer corrections from archived-account history. The build reports the existing bundle-size warning; PostgreSQL is not yet verified.
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
- [ ] **Financial dashboard:** actual account/total balances, monthly income/expenses/net cash flow, and recent activity. Replace the current placeholder.
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

## Next session: financial dashboard

1. Inspect AccountBalance, ActivityBrowser, account resources, Overview and the financial tests.
2. Add user-owned dashboard data: actual account balances and total balance including archived accounts, selected-month income and expenses, and net cash flow.
3. Use the user's timezone for the default month and calendar boundaries. Exclude opening balances and transfers from income/expense totals.
4. Add a bounded recent-activity list that includes transfers once. Reuse the combined-history query where appropriate.
5. Replace Overview with usable summaries and month controls, including loading, empty and error states. Keep financial calculations centralized.
6. Test month boundaries, archived accounts, ownership, and immediate effects of edits/deletions; extend the browser workflow.
7. Update this handoff after verification. Leave the implementation for user review and commit. PostgreSQL verification and deployment belong to the following MVP release milestone.

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
