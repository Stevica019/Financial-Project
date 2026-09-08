# Personal Finance App

## Purpose and status

Build a personal finance app for daily use: record financial activity, see account balances, understand spending, and track budgets.

This is also a full-stack project with authentication, backend validation, relational data, automated tests, and deployment.

- Planning budget: 25 days at roughly 4 hours per day (100 hours). This is a target, not a delivery guarantee.
- Progress, verification results, and the next task are tracked in [ROADMAP.md](ROADMAP.md). See [README.md](README.md) for setup.
- Each registered user manages their own finances. Shared accounts and households are outside the initial scope.
- This document is the project brief. Keep it updated when scope or architecture decisions change.
- The React/REST/Laravel stack and cookie authentication below are implemented. Financial design rules remain the implementation brief for the next stages.

## Scope and priorities

The extended features are implemented. On 2026-09-08 the user authorized the optional features in order: CSV export, CSV import, advanced charts, and dark mode. Notifications are skipped. Deployment remains deferred. Testing, authorization, and usable error states are part of each feature.

| Tier | Features |
| --- | --- |
| MVP: required foundation | Registration, login/logout, accounts, categories, income/expenses, transfers, dashboard, transaction search/filtering/sorting, server-side pagination, core tests, deployment and setup documentation |
| Extended version: original full-project target | Monthly budgets, recurring income/expenses, savings goals, monthly reports |
| Optional: only after the extended version works | CSV export/import, advanced charts, dark mode; notifications skipped |
| Deferred beyond the initial project | Multiple currencies with conversion, bank integrations |

The MVP can be completed independently. The original full-project target includes both the MVP and extended version. If time runs short, reduce feature scope explicitly rather than dropping correctness, testing, or deployment.

## Architecture

The implemented foundation uses:

- Frontend: React, JavaScript, MUI, Vite, React Router, Axios.
- Backend: Laravel/PHP exposing a REST API.
- Authentication: Laravel Sanctum with session cookies for the first-party frontend; configure CSRF protection and deployment origins accordingly.
- Database: SQLite for local development; PostgreSQL for production. Verify migrations and important database behavior against PostgreSQL before release.
- Tests: Vitest with React Testing Library; PHPUnit for backend behavior; Playwright for the browser authentication flow.
- Tooling: Git and GitHub.
- Add Laravel Scheduler when recurring transactions are implemented. Add queues only when a concrete workload needs them.

Keep the existing REST architecture. Exact package versions are recorded in lockfiles. Scheduler processing is implemented; operating commands are in README.md. PostgreSQL and queues are not configured yet.

## Financial rules

These rules are the source of truth for backend calculations and tests.

### Money and currency

- Start with one currency per user, shared by all their accounts. Do not perform currency conversion.
- Initial supported currencies: EUR, RSD, USD, GBP, CHF, CAD, AUD (two decimal places each). Users explicitly choose currency; a browser timezone is only a suggestion to confirm. Existing users complete settings before creating accounts.
- Store monetary values as integer minor units and convert only at input/display boundaries. Do not use floating-point arithmetic for money.
- Income, expense, transfer, and budget amounts must be positive. Opening balances may be zero or negative.
- Allow negative account balances; the app records activity and does not authorize actual payments.
- Currency locks permanently when the first account is created, including accounts with a zero opening balance. Archiving or deleting accounts does not unlock it. Changing it afterward requires an explicit migration design.
- Money input/output uses decimal strings with a dot and at most two fractional digits; storage uses integer minor units. Opening-balance input allows up to 12 whole-number digits. Never silently round extra precision.
- Income/expense amounts use the same 12 whole-number digit limit. Each entry requires a description (up to 255 characters) and allows optional notes (up to 5000 characters).

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

Transfers use a separate table. Transactions represent only income or expenses.

- One transfer record contains the source account, destination account, amount, and date.
- Both accounts must belong to the current user and must be different.
- Reflect each transfer in both account histories, but only once in a combined activity list.
- Creating, editing, or deleting a transfer must update its financial effect as one atomic operation. Use database transactions whenever an operation writes multiple related records.
- Transfers change individual account balances but leave total balance and net cash flow unchanged.
- Transfer amounts use the same 12 whole-number digit limit as entries; descriptions are optional and limited to 255 characters. During edits, an archived account may remain in its existing source/destination role; a changed endpoint must be active.

### Budgets and goals

- A budget is a monthly limit for one expense category.
- Allow one budget per user, category, and calendar month.
- Budget usage is the sum of that month's matching expenses; remaining budget may be negative. No rollover in the initial version.
- Savings goals initially track manually entered progress. Updating progress does not create a transaction, reserve money, or change account balances. Make this clear in the UI.
- Goals have a required name (up to 100 characters), positive target, nonnegative manually entered saved total, optional target date and description (up to 1000 characters). Money uses the existing 12 whole-number digit limit. Overfunding is allowed; remaining is floored at zero and percentage may exceed 100%.
- Goal status is explicitly chosen: active, completed or cancelled. Reaching the target does not automatically change status, and users may reopen goals or correct progress in any status. Past target dates are allowed so overdue goals remain editable. Goal deletion requires UI confirmation.
- Currency cannot change while any savings goals exist, including completed/cancelled goals. Before the first account, deleting all goals removes this temporary restriction; the existing permanent first-account currency lock remains unchanged.
- If account-linked goals are added later, define allocation rules before changing this behavior.

## Data model

This is a logical schema, not a complete migration specification. Entities have an ID and timestamps. Every financial resource has a user owner.

| Entity | Main fields and constraints |
| --- | --- |
| User | name, unique email, hashed password, initially nullable currency/timezone, currency_locked |
| Account | user_id, name, type, opening_balance, opening_date, optional description, is_active |
| Category | user_id, name, type: income or expense; optional icon |
| Transaction | user_id, account_id, category_id, type: income or expense, amount, date, description, optional notes; optional recurring rule and scheduled occurrence date |
| Transfer | user_id, source_account_id, destination_account_id, amount, date, optional description |
| Budget | user_id, category_id, amount, month represented by its first calendar date; unique user/category/month |
| Recurring transaction | user_id, account_id, category_id, type, amount, description, frequency, start_date, next_execution_date, optional end_date, is_active |
| Savings goal | user_id, name, target_amount, current_amount, optional target_date/description, status: active, completed, cancelled |

Account types may include cash, checking, savings, credit, digital wallet, and other. Credit accounts use signed balances; debt is negative. Credit limits, statements, and investment valuation are outside the initial scope.

Seed a small set of user-owned income and expense categories at registration. The existing-user migration also adds these defaults. Users can rename/delete them; they are not automatically re-created on login. Category names are unique per user and type ignoring case, enforced using a normalized name_key column and a database constraint. Icons are not implemented.

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

Browsing APIs use `search`, `account_id`, `category_id`, `type`, `date_from`, `date_to`, `amount_min`, `amount_max`, `sort`, `direction`, `page`, and `per_page`. Date/amount ranges are inclusive; amount bounds are nonnegative decimal strings. Sort fields are date, amount and description with ascending/descending direction and deterministic kind/ID tie breakers. Pages default to 20 records and are limited to 100. Search treats `%` and `_` literally. Transfers can be filtered by either endpoint and searched by description. Account history combines entries and transfers before filtering/pagination; category filters select only entries. Filters apply explicitly and reset the page; corrections refresh results without clearing the active filters.

`GET /api/dashboard` accepts an optional `month=YYYY-MM`, defaulting to the current month in the user's timezone. It returns current total/account balances, selected-month income/expenses/net cash flow, and the latest 10 entries/transfers across all dates. Month selection affects monthly totals and category budget progress. Archived accounts remain included; each transfer appears once in recent activity. The dashboard reuses centralized balance and activity queries and refreshes when reopened or explicitly refreshed.

`GET /api/reports` accepts the same optional month and timezone default. It returns selected and previous calendar-month income, expenses and net cash flow, signed monetary changes (selected minus previous), and selected-month spending grouped by expense category, ordered by spending then category ID. Empty months return zero totals and no categories. Comparisons use whole calendar months of recorded activity, so an unfinished month is not prorated. No percentage change is calculated, avoiding ambiguous zero/negative prior net cash flow. Reports and dashboard share monthly calculations; transfers, opening balances and manual goal progress are excluded. Reports refresh on reopening or Refresh. Dashboard also shows active goals independently of the selected month.

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
- Pause behavior: skip occurrences during a pause; resume at the next scheduled date on or after today. Unarchiving an account never resumes rules automatically.
- A new rule with a past start date catches up from that date. Editing a rule discards overdue ungenerated dates and applies the new values from today onward. Changing frequency/start date establishes a new anchor. Already generated entries are never rewritten by rule edits.
- The command processes at most 100 occurrences per run by default (configurable from 1 to 10000); successive runs continue the backlog. Completed rules have no next execution date and become inactive. End dates are inclusive.
- A durable occurrence receipt and a unique transaction rule/scheduled-date pair protect retries. Receipts survive entry corrections/deletions; deleting a rule removes its receipts and clears generated entries' rule reference while preserving their scheduled date and financial history.
- Each occurrence locks the owner, records the receipt, creates the entry and advances the rule in one database transaction. This shares the API write lock. SQLite uses IMMEDIATE transactions with a five-second busy timeout (PHP 8.4+); PostgreSQL uses owner row locks. The scheduler overlap lock is an additional guard, not the duplicate-prevention mechanism.

## CSV support

Export and import are implemented. The final format supports income, expenses and transfers, with account/category selection by owned IDs in each row. See [the optional-feature specification](#optional-features-authorized-on-2026-09-08) for columns, limits, validation and duplicate handling, and [README.md](README.md#csv-charts-and-appearance) for the workflow.

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

## Optional features authorized on 2026-09-08

- CSV export covers transactions, transfers, and combined account history. Export respects applied filters and sorting, includes all matching pages, preserves exact decimal amounts, and includes archived-account activity. The import page also offers an all-activity export and an empty template. Opening balances, budgets, goals and recurring definitions are outside the activity CSV format.
- CSV uses UTF-8 with a BOM, comma delimiters, standard doubled-quote escaping, and the fixed columns `type,date,amount,currency,account_id,category_id,source_account_id,destination_account_id,description,notes,account_name,category_name,source_account_name,destination_account_name`. Text beginning with formula-like characters, control characters or an apostrophe is prefixed with an apostrophe for spreadsheet safety; the app reverses its own escaping on import.
- Import uses existing owned account/category IDs; name columns are informational. Income/expense rows need an account and a matching category. Transfers need distinct source/destination accounts and leave account/category IDs and notes blank. Currency must match user settings. All normal creation rules, including active accounts, opening dates, local today and money precision, apply through shared validation. This is an app CSV format, not automatic bank-file mapping.
- Limit uploads to 2 MB and 1000 records. Validate every row before offering a preview; show up to 20 preview rows and report row/field errors (up to 50 field errors per response). Confirmation uses a user-bound cached token valid for 30 minutes and revalidates before writing. Save entries, transfers and the import receipt in one explicit database transaction. A failure saves nothing and permits retry.
- Skip exact matches on activity type, accounts, category, date, amount, description and notes, including repeated rows within a file. Blank and null optional text are equivalent. This deliberately treats identical legitimate payments as duplicates; users record those manually. Import never overwrites existing records or creates accounts/categories. Durable per-user file receipts also prevent importing the same parsed file twice, even after imported records are deleted. Modified files are checked against current records again.
- Reports include a 12-month series ending in the selected calendar month, zero-filled for empty months and derived from owned transactions including archived accounts. The chart supports income, expenses or signed net cash flow, 6/12-month selection, keyboard-selectable bars, exact-value feedback and an accessible data table. Category spending bars show amounts and shares. Floating point is used only for chart geometry/percentages; API money and displayed amounts remain exact decimal strings.
- Appearance supports system, light and dark modes across authentication and the workspace, including dialogs, inputs and charts. The system mode follows OS changes. Only the appearance preference is stored in browser local storage; session authentication remains cookie-based. Appearance is per browser, not a server-side user preference.

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

- Read [ROADMAP.md](ROADMAP.md), this brief, and the existing code before implementing changes.
- Follow the current user-authorized scope recorded in ROADMAP.md; do not add features simply because they might be useful.
- Keep financial calculations centralized and avoid duplicated financial state.
- Prefer simple, maintainable solutions. Preserve working architecture unless a concrete problem justifies a change.
- Test financial correctness and data isolation as part of implementation.
- Resolve routine details with reasonable defaults; surface decisions that materially change scope or financial behavior.
- Record confirmed architecture decisions here and actual progress/verification in ROADMAP.md. Update README.md when setup or test commands change. Verify completion against code and checks, not the planned schedule.
