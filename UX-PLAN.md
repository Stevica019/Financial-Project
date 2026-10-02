# UX improvement plan

Created: 2026-10-02. Status: proposed, not started.

This plan makes the frontend faster and easier to use day to day. The visual style already works; this is about flow and structure. It comes from a review of the frontend code, not from user testing or clicking through the running app, so check each point in the browser before changing it.

Read [ROADMAP.md](ROADMAP.md) and [Project.md](Project.md) first. The financial rules there still apply. Nothing in this plan changes how money is calculated.

## The core problem

The UI is organized around database tables instead of user tasks. Almost every page is the generic [ResourceManager](frontend/src/components/ResourceManager.jsx) with a different endpoint plugged in. Each page gets a title, a paragraph of rules, an "Add X" button and a stack of large cards with Edit/Delete buttons. Building it this way is consistent, but using it feels like admin work, especially for the most frequent task: recording a transaction.

## Guiding principles

- Make the most frequent action (adding a transaction) take the fewest clicks and fields.
- Use rows people can scan instead of cards, and show money as money (`−€25.00`, not `Expense: EUR 25.00`).
- If a screen needs a paragraph to explain it, change the screen. Put rules in field hints or tooltips.
- Show fewer top-level destinations, grouped by what the user is trying to do.

## Phase 1: highest impact, frontend only

Start here. None of these items need backend changes.

### 1.1 Quick add for transactions
- [ ] Add a global **"+ Add"** button in the header, and a floating button on mobile. It opens the transaction dialog directly from any page.
- [ ] Point the Overview hero buttons at the dialog. They currently only go to `/transactions` and `/transfers`.
- [ ] Put an **Expense / Income / Transfer** toggle at the top of the dialog in place of the "Entry type" select. Transfer switches the dialog to the source/destination account fields from `transferFields` in [activityFields.js](frontend/src/components/activityFields.js).
- [ ] Reorder the fields: amount first (autofocused), then category, account, date, description, notes.
- [ ] Default the account to the last one used (remembered per browser) and the date to today. Use `inputMode="decimal"` and a currency prefix on the amount field.
- [ ] Consider making description optional and falling back to the category name. **This needs a backend validation change.** Skip it if you want to stay frontend-only.
- [ ] Rename "entry" to "transaction" in the UI copy ("Add transaction", "Save transaction").

Done when you can record an expense from the Overview with one click to open the dialog, an amount, a category and Enter.

### 1.2 Lists as rows, with proper money formatting
- [ ] Add a shared `formatMoney(amount, currency)` helper built on `Intl.NumberFormat`. The API returns amounts as decimal strings, so pass the string straight to `format()` and never do arithmetic on money in JS. Use it everywhere amounts appear: Overview, accounts, budgets, goals, reports and transfers.
- [ ] Show expenses as `−€25.00` in the error/red color and income as `+€1,250.50` in the success/green color. Transfers stay neutral, with in/out direction in account history.
- [ ] Replace the card list in `ResourceManager` with compact rows for activity: date · description · category chip · account · amount (right-aligned). Group rows under day headers ("Today", "Yesterday", "Sep 28").
- [ ] Make the whole row clickable to edit. Move Delete into the edit dialog, or into a "⋯" menu on the row.
- [ ] Optional: replace the delete confirmation with an "Undo" Snackbar.
- [ ] Keep cards only where they suit the content (Categories grid, Goals).

### 1.3 Cut the explanatory text
- [ ] Reduce each page `introduction` to one short sentence at most. Today the longest are on Recurring, Savings goals, Transfers, Transactions and CSV import.
- [ ] Move individual rules into the relevant field `hint` or an ⓘ tooltip. For example, "Pausing skips dates until resumed" belongs next to the Pause action.
- [ ] Overview: remove the paragraph under the summary cards. Move the month picker into the "This month" section it actually controls, so it no longer needs explaining.

## Phase 2: navigation and filtering

### 2.1 Navigation
There are currently 11 destinations, 7 of them plus Sign out hidden behind "More" in [WorkspaceNavigation.jsx](frontend/src/components/WorkspaceNavigation.jsx).

- [ ] New structure:
  - **Overview · Activity · Accounts · Budgets · Goals · Reports**
  - **Activity** = transactions and transfers in one list, plus a "Scheduled" tab for recurring rules.
  - **Settings** = preferences, categories and CSV import/export.
- [ ] Use a left sidebar on desktop and a bottom navigation bar on mobile. Put Sign out in a user/avatar menu.
- [ ] Keep the old routes as redirects (`/transfers`, `/recurring`, `/categories`, `/import`) so existing links and tests can be migrated gradually.
- [ ] The brand link in [Appearance.jsx](frontend/src/Appearance.jsx) is a plain `<a href="/">`, which causes a full page reload. Switch it to a router `Link`.

### 2.2 Search and filters
[BrowseControls.jsx](frontend/src/components/BrowseControls.jsx) shows about 10 fields at once, and nothing applies until you press "Apply filters".

- [ ] Make the search box live, with a debounce of about 300 ms.
- [ ] Add a "Filters" button that reveals the account, category, type, date and amount fields.
- [ ] Show active filters as removable chips (`Groceries ✕`).
- [ ] Sort by clicking column headers. Remove the separate sort, direction and per-page selects.
- [ ] Move "Export CSV" into a "⋯" menu on the list header.

## Phase 3: page-level fixes

### Overview ([Overview.jsx](frontend/src/pages/Overview.jsx))
- [ ] Remove the fixed-height panels that scroll inside the page (`.dashboard-panel` in `index.css`). Show the top 3–5 items per panel plus a "See all" link.
- [ ] Make account and activity items clickable, and remove the per-item "View history" / "View account history" / "Manage transfers" buttons.
- [ ] Budgets panel: show the budgets that are over or close to their limit first.
- [ ] Remove the Refresh button. Data should reload after any save, which needs a shared invalidation mechanism or a refetch on focus.

### Accounts ([Accounts.jsx](frontend/src/pages/Accounts.jsx))
- [ ] Make the current balance the prominent number. Opening balance and date become secondary text.
- [ ] Make the whole card open the account history. The "View history" button currently sits between the balance and the opening date.

### Account history ([Transactions.jsx](frontend/src/pages/Transactions.jsx) with `accountId`)
- [ ] Replace the stacked "Back to accounts" / "Manage transfers" buttons with a breadcrumb (Accounts › Account name).
- [ ] Show the current balance large in the page header instead of in the introduction text.

### Budgets ([Budgets.jsx](frontend/src/pages/Budgets.jsx), [BudgetProgress.jsx](frontend/src/components/BudgetProgress.jsx))
- [ ] Move the month picker into the page header. It is currently a full-width field above the page title.
- [ ] Show progress as "€320 of €500", a progress bar and "€180 left". Turn the bar warning-colored at 80% and error-colored when over.
- [ ] Add **"Copy last month's budgets"**, because budgets do not roll over. **Needs a backend endpoint**, or a client-side loop over the existing create endpoint.

### Savings goals ([SavingsGoals.jsx](frontend/src/pages/SavingsGoals.jsx))
- [ ] Add a **"+ Add money"** action on the goal card that increases the saved amount. Users currently have to edit the goal and type a new running total, which the hint has to warn about. **Prefer a backend endpoint** for the increment, so decimal math stays on the server.

### Reports ([Reports.jsx](frontend/src/pages/Reports.jsx))
- [ ] Show change with color, an up/down arrow and a percentage instead of `Change: EUR -50.00`.
- [ ] Spending by category: one row per category with its amount, % share and a bar, instead of a separate card per category.

### CSV import ([CsvImport.jsx](frontend/src/pages/CsvImport.jsx))
- [ ] Biggest pain point: users must look up and type numeric `account_id` / `category_id` values. Match accounts and categories by **name**, or add a column-mapping step after upload. **Needs backend changes** to the import preview/validation.
- [ ] Show validation errors per row in the preview table instead of one list above it.
- [ ] Turn the page into steps: 1. Download template, 2. Upload, 3. Review, 4. Confirm.

### First-run experience
- [ ] Replace the forced redirect to Settings with a 3-step setup: currency and timezone (timezone is already auto-suggested) → first account → first transaction.
- [ ] Give every empty state a primary button ("Add your first account"), not just text.

## Notes for whoever implements this

- **Tests depend on visible labels.** Unit tests in `frontend/src/*.test.jsx` and Playwright specs in `frontend/e2e/` find elements by role and name: "More", "Export CSV", "Save goal", "Delete category", "Confirm import" and others. Renaming copy or moving actions will break them, so update tests in the same change. Test commands are in [README.md](README.md).
- **Keep accessibility intact.** The current UI has good ARIA labels, landmarks and keyboard support (skip link, labelled regions). Clickable rows must stay keyboard-reachable, and colored amounts must keep their +/− sign, because color alone is not enough.
- **Money stays as strings.** Amounts are decimal strings from the API. Format them for display, and do any arithmetic on the backend.
- Do one numbered item per change/PR where possible, and tick the boxes here as you go.
