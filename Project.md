# Personal Finance App

## Purpose and status

Build a personal finance app for daily use: record financial activity, see account balances, understand spending, and track budgets.

This is also a full-stack project with authentication, backend validation, relational data, automated tests, and deployment.

- Planning budget: 25 days at roughly 4 hours per day (100 hours). This is a target, not a delivery guarantee.
- Current state: Laravel 13/Sanctum backend and React/Vite/MUI frontend scaffolded with SQLite and API foundation checks. Authentication flows and financial features are not implemented yet. See README.md for setup.
- Each registered user manages their own finances. Shared accounts and households are outside the initial scope.
- This document is the project brief. Keep it updated when scope or architecture decisions change.
- Technical defaults below are proposed starting points, not decisions already confirmed by the user or implemented in code.

## Scope and priorities

Complete and verify each tier before adding the next. Testing, authorization, and usable error states are part of each feature.

| Tier | Features |
| --- | --- |
| MVP: required foundation | Registration, login/logout, accounts, categories, income/expenses, transfers, dashboard, transaction search/filtering/sorting, server-side pagination, core tests, deployment and setup documentation |
| Extended version: original full-project target | Monthly budgets, recurring income/expenses, savings goals, monthly reports |
| Optional: only after the extended version works | CSV export/import, notifications, advanced charts, dark mode |
| Deferred beyond the initial project | Multiple currencies with conversion, bank integrations |

The MVP can be completed independently. The original full-project target includes both the MVP and extended version. If time runs short, reduce feature scope explicitly rather than dropping correctness, testing, or deployment.

## Proposed architecture

Preserve the original preferred technologies while choosing one communication approach:

- Frontend: React, JavaScript, MUI, Vite, React Router, Axios.
- Backend: Laravel/PHP exposing a REST API.
- Authentication: Laravel Sanctum with session cookies for the first-party frontend; configure CSRF protection and deployment origins accordingly.
- Database: SQLite for local development; PostgreSQL for production. Verify migrations and important database behavior against PostgreSQL before release.
- Tests: Vitest with React Testing Library; PHPUnit for backend behavior.
- Tooling: Git and GitHub.
- Add Laravel Scheduler when recurring transactions are implemented. Add queues only when a concrete workload needs them.

Inertia remains an alternative if the architecture is reconsidered before implementation; do not combine both approaches without a clear need. Choose supported package versions at setup time and document them in the repository.

## Financial rules

These rules are the source of truth for backend calculations and tests.

### Money and currency

- Start with one currency per user, shared by all their accounts. Do not perform currency conversion.
- Store monetary values as integer minor units and convert only at input/display boundaries. Do not use floating-point arithmetic for money.
- Income, expense, transfer, and budget amounts must be positive. Opening balances may be zero or negative.
- Allow negative account balances; the app records activity and does not authorize actual payments.
- Do not allow changing a user's currency after financial records exist without an explicit migration design.

### Dates and balances

- Store the financial activity date as a calendar date. Use the user's timezone to determine today and monthly boundaries.
- MVP entries represent activity that has already happened; reject future-dated transactions and transfers. Future activity belongs in recurring schedules.
- An account's opening balance is its balance at the start of its opening date, before entries on that date. Reject activity before that date.
- Derive current balances from stored activity instead of maintaining a separate editable or cached balance:

```text
account balance = opening balance
                + income - expenses
                + incoming transfers - outgoing transfers

total balance = sum of all account balances
monthly net cash flow = monthly income - monthly expenses
```

- Include archived accounts in historical reports and total balance. Archiving must not make money disappear.
- Opening balances and transfers do not count as income, expenses, or budget spending.
- Editing or deleting an entry must immediately be reflected in every affected balance and report.

### Transfers

Proposed default: use a separate transfers table. Transactions represent only income or expenses.

- One transfer record contains the source account, destination account, amount, and date.
- Both accounts must belong to the current user and must be different.
- Reflect each transfer in both account histories, but only once in a combined activity list.
- Creating, editing, or deleting a transfer must update its financial effect as one atomic operation. Use database transactions whenever an operation writes multiple related records.
- Transfers change individual account balances but leave total balance and net cash flow unchanged.

### Budgets and goals

- A budget is a monthly limit for one expense category.
- Allow one budget per user, category, and calendar month.
- Budget usage is the sum of that month's matching expenses; remaining budget may be negative. No rollover in the initial version.
- Savings goals initially track manually entered progress. Updating progress does not create a transaction, reserve money, or change account balances. Make this clear in the UI.
- If account-linked goals are added later, define allocation rules before changing this behavior.

## Data model

This is a logical schema, not a complete migration specification. Entities have an ID and timestamps. Every financial resource has a user owner.

| Entity | Main fields and constraints |
| --- | --- |
| User | name, unique email, hashed password, currency, timezone |
| Account | user_id, name, type, opening_balance, opening_date, optional description, is_active |
| Category | user_id, name, type: income or expense; optional icon |
| Transaction | user_id, account_id, category_id, type: income or expense, amount, date, description, optional notes; optional recurring rule and scheduled occurrence date |
| Transfer | user_id, source_account_id, destination_account_id, amount, date, optional description |
| Budget | user_id, category_id, amount, month represented by its first calendar date; unique user/category/month |
| Recurring transaction | user_id, account_id, category_id, type, amount, description, frequency, start_date, next_execution_date, optional end_date, is_active |
| Savings goal | user_id, name, target_amount, current_amount, optional target_date/description, status: active, completed, cancelled |

Account types may include cash, checking, savings, credit, digital wallet, and other. Credit accounts use signed balances; debt is negative. Credit limits, statements, and investment valuation are outside the initial scope.

Seed a small set of user-owned income and expense categories at registration. Users can manage their own categories.

Use foreign keys, appropriate uniqueness constraints, and indexes based on actual query patterns. Validate ownership of related IDs as well as ownership of the main resource.

## Screens and behavior

| Screen | Required behavior |
| --- | --- |
| Authentication | Register, log in, log out; protect authenticated routes. Password recovery is an optional follow-up. |
| Dashboard | Total balance, balance per account, selected month's income/expenses/net cash flow, recent activity. Add budget and goal progress when those features exist. |
| Accounts | List, create, edit, archive, and view history. Prevent deletion of accounts referenced by financial records or recurring rules. |
| Categories | List, create, edit, delete unused categories. Prevent deletion or type changes that would invalidate existing references. |
| Transactions | Create, read, edit, delete income/expenses; search description/notes; filter by date range, account, category, type, and amount range; sort and paginate on the backend. |
| Transfers | Create, view, edit, delete transfers between owned accounts. Show their direction clearly in each account's history. |
| Budgets | Select month; create, edit, delete category budgets; show spent, remaining, and percentage used. |
| Recurring transactions | Create, edit, pause, resume, delete rules; show next execution. |
| Savings goals | Create/edit goals, update progress, complete or cancel. |
| Reports | Select month; show income, expenses, net cash flow, spending by category, and comparison with the previous month. |

Keep charts limited to useful summaries. Every asynchronous screen needs loading, empty, validation, and error states. Forms and navigation should be usable on smaller screens and with a keyboard.

Archiving an account prevents new activity and pauses its recurring rules. Preserve its history and allow corrections to existing records without moving them into another archived account. Unarchiving does not automatically resume recurring rules.

## Recurring transactions: extended version

- Support income and expenses; recurring transfers are deferred.
- Initial frequencies: daily, weekly, monthly, yearly.
- Generate normal transactions only when due. Do not pre-create unlimited future entries.
- Process due dates according to the user's timezone and within any end date.
- Enforce a unique rule/occurrence-date pair so retries or concurrent runs cannot create duplicates.
- Create the transaction and advance the schedule atomically.
- After scheduler downtime, process missed due occurrences in bounded batches.
- For monthly/yearly schedules, clamp invalid dates to the last day of the month while preserving the original anchor for later occurrences.
- Editing a rule affects future occurrences only. Deleting a rule preserves generated transactions.
- Proposed pause behavior: skip occurrences during a pause; resume at the next scheduled date on or after today.

## Optional CSV support

Implement export before import if time allows.

- Export the complete result matching current filters, not just the visible page.
- Import into a user-selected account using a documented format such as:

```csv
date,description,amount,type,category
2026-09-01,Salary,2000.00,income,Salary
2026-09-02,Supermarket,64.50,expense,Groceries
```

- Import flow: upload, parse, validate, preview, confirm, create.
- Report invalid rows and unresolved categories explicitly.
- Define duplicate handling and whether confirmation imports valid rows or requires the entire file to pass validation before implementing it.
- Limit file sizes and handle spreadsheet formula injection in exports.

## Validation, security, and integrity

- Enforce business rules on the backend; frontend validation improves usability.
- Scope every query and mutation to the authenticated user, including reports, exports, and related resource lookups.
- Use Laravel policies or equivalent centralized authorization.
- Confirm account and category ownership, compatible category type, valid dates, and valid amounts.
- Hash passwords, protect session-based requests against CSRF, rate-limit authentication, and keep secrets out of source control.
- Return understandable errors without exposing backend exceptions.
- Prevent deletions that leave invalid references. Do not silently cascade away financial history.

## Verification

Write meaningful behavior tests as features are built.

Backend priorities:

- Authentication and cross-user access rejection, including submitted foreign account/category IDs.
- Income/expense creation, editing, and deletion produce correct balances.
- Transfers affect both accounts correctly and never affect total balance, income, expenses, or budgets.
- Monthly calculations handle date boundaries, opening balances, and archived accounts.
- Search, filtering, sorting, and pagination return the correct user's records.
- When implemented: budget totals/uniqueness and recurring schedule boundaries, retries, pauses, and downtime recovery.

Frontend priorities:

- Important form submissions and validation feedback.
- Filtering/pagination interactions and authentication flow.
- Loading, empty, and failure states where behavior warrants coverage.

Before release, verify production database migrations, the production build, deployed authentication, and an end-to-end flow from account creation through transfers and dashboard totals.

## Roadmap: approximately 100 hours

The time boxes are planning guides. Maintain a working integrated app throughout.

| Days | Focus |
| --- | --- |
| 1-5 | Confirm architecture, initialize repository and environment, schema, authentication, base frontend, accounts/categories foundations |
| 6-10 | Complete accounts/categories and income/expense workflows; search, filtering, sorting, pagination; tests alongside implementation |
| 11-15 | Transfers, financial calculations, dashboard, integration checks; begin budgets if MVP is stable |
| 16-20 | Extended features in order: budgets, recurring transactions, savings goals, monthly reports |
| 21-25 | Fix issues, complete verification, deploy, write setup/architecture notes, prepare demo; optional CSV only if time remains |

## Completion criteria

MVP is complete when a user can:

1. Register, log in, and log out.
2. Manage accounts and categories.
3. Record, correct, and delete income/expenses and transfers.
4. See accurate balances and monthly dashboard totals.
5. Search, filter, sort, and page through their transactions.
6. Use a deployed version with enforced data isolation and passing core behavior tests.

The extended version additionally requires working budgets, recurring transactions, savings goals, and monthly reports. Optional and deferred features do not block completion.

The repository must document local setup, required environment variables, database setup, test commands, and deployment. Document scheduler configuration when recurring transactions exist.

## Guidance for future agents

- Read this brief and inspect the existing code before implementing changes.
- Follow the scope tiers; do not add features simply because they might be useful.
- Keep financial calculations centralized and avoid duplicated financial state.
- Prefer simple, maintainable solutions. Preserve working architecture unless a concrete problem justifies a change.
- Test financial correctness and data isolation as part of implementation.
- Resolve routine details with reasonable defaults; surface decisions that materially change scope or financial behavior.
- Record confirmed architecture decisions and actual progress here concisely. Do not treat the roadmap as evidence that work is complete.
