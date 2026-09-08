<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\ActivityCsv;
use App\Services\DefaultCategories;
use App\Services\RecurringSchedule;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class DemoSeeder extends Seeder
{
    public const EMAIL = 'mila.petrovic@example.com';

    public const PASSWORD = 'MapleRiver!2026';

    public const CSV_PATH = 'demo/mila-activity.csv';

    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException('Demo data can only be seeded in local or testing environments.');
        }

        $created = DB::transaction(function () {
            // Never take over an existing login or overwrite edits made while exploring.
            if (User::where('email', self::EMAIL)->exists()) {
                return false;
            }

            $today = CarbonImmutable::today('Europe/Belgrade');
            $start = $today->startOfMonth()->subMonths(11);
            $user = new User(['name' => 'Mila Petrovic', 'email' => self::EMAIL, 'password' => self::PASSWORD]);
            $user->forceFill(['currency' => 'EUR', 'timezone' => 'Europe/Belgrade', 'currency_locked' => true])->save();
            DefaultCategories::seed($user->id);
            foreach (['Dining out', 'Travel', 'Education', 'Insurance'] as $name) {
                $user->categories()->create(['name' => $name, 'name_key' => mb_strtolower($name), 'type' => 'expense']);
            }
            $categories = $user->categories()->get()->keyBy('name');

            // All amounts below are integer cents, like the application's ledger.
            $accounts = [];
            foreach ([
                ['checking', 'Everyday banking', 'checking', 245000, 'Salary, bills and everyday card purchases.'],
                ['savings', 'Rainy day savings', 'savings', 580000, 'Emergency reserve and upcoming travel.'],
                ['cash', 'Everyday cash', 'cash', 8500, 'Market stalls, bakeries and small purchases.'],
                ['credit', 'Travel rewards card', 'credit', -12000, 'Subscriptions; statement paid from Everyday banking.'],
                ['old', 'Previous salary account', 'checking', 75000, 'Closed after moving salary payments to Everyday banking.'],
            ] as [$key, $name, $type, $balance, $description]) {
                $accounts[$key] = $user->accounts()->create([
                    'name' => $name, 'type' => $type, 'opening_balance' => $balance,
                    'opening_date' => $start->toDateString(), 'description' => $description, 'is_active' => true,
                ]);
            }

            $entry = function (string $account, string $category, int $amount, CarbonImmutable $date, string $description, ?string $notes = null) use ($user, $accounts, $categories, $today) {
                if ($date->gt($today)) {
                    return;
                }
                $user->transactions()->create([
                    'account_id' => $accounts[$account]->id, 'category_id' => $categories[$category]->id,
                    'type' => $categories[$category]->type, 'amount' => $amount, 'date' => $date->toDateString(),
                    'description' => $description, 'notes' => $notes,
                ]);
            };
            $transfer = function (string $source, string $destination, int $amount, CarbonImmutable $date, string $description) use ($user, $accounts, $today) {
                if ($date->lte($today)) {
                    $user->transfers()->create([
                        'source_account_id' => $accounts[$source]->id, 'destination_account_id' => $accounts[$destination]->id,
                        'amount' => $amount, 'date' => $date->toDateString(), 'description' => $description,
                    ]);
                }
            };

            $entry('old', 'Utilities', 2400, $start, 'Final mobile bill from previous account');
            $transfer('old', 'checking', 72600, $start->addDay(), 'Move remaining balance before closing old account');
            $accounts['old']->update(['is_active' => false]);
            $transfer('checking', 'credit', 12000, $start, 'Pay opening credit card statement');

            // Use the real schedule calculator, but only create this demo user's history.
            // Receipts keep later scheduler runs from recreating these payments.
            foreach ([
                ['checking', 'Salary', 295000, 'Northstar Studio salary', 'monthly', 1, 'Monthly take-home pay from product design work.'],
                ['checking', 'Rent', 85000, 'Apartment rent - Vracar', 'monthly', 1, 'Standing order to the landlord.'],
                ['checking', 'Utilities', 2990, 'Home fibre internet', 'monthly', 5, null],
                ['credit', 'Subscriptions', 1299, 'Spotify Premium', 'monthly', 6, null],
                ['checking', 'Education', 2500, 'French conversation lesson with Claire', 'weekly', 4, 'One private lesson each week.'],
                ['checking', 'Insurance', 18900, 'Annual home contents insurance', 'yearly', 12, 'Annual renewal.'],
            ] as [$account, $category, $amount, $description, $frequency, $day, $notes]) {
                $rule = $user->recurringRules()->create([
                    'account_id' => $accounts[$account]->id, 'category_id' => $categories[$category]->id,
                    'type' => $categories[$category]->type, 'amount' => $amount, 'description' => $description,
                    'notes' => $notes, 'frequency' => $frequency, 'start_date' => $start->day($day)->toDateString(),
                    'is_active' => true,
                ]);
                $date = $rule->start_date;
                while ($date !== null && $date <= $today->toDateString()) {
                    $user->transactions()->create([
                        'account_id' => $rule->account_id, 'category_id' => $rule->category_id, 'type' => $rule->type,
                        'amount' => $rule->amount, 'description' => $rule->description, 'notes' => $rule->notes,
                        'date' => $date, 'recurring_rule_id' => $rule->id, 'scheduled_date' => $date,
                    ]);
                    DB::table('recurring_occurrences')->insert(['recurring_rule_id' => $rule->id, 'date' => $date]);
                    $date = RecurringSchedule::onOrAfter($rule, CarbonImmutable::parse($date)->addDay()->toDateString());
                }
                $rule->update(['next_execution_date' => $date]);
            }
            $user->recurringRules()->create([
                'account_id' => $accounts['cash']->id, 'category_id' => $categories['Dining out']->id,
                'type' => 'expense', 'amount' => 280, 'description' => 'Morning espresso at the corner cafe',
                'notes' => 'Paused while trying coffee at home.', 'frequency' => 'daily',
                'start_date' => $today->toDateString(), 'next_execution_date' => $today->toDateString(), 'is_active' => false,
            ]);

            for ($offset = 0; $offset < 12; $offset++) {
                $month = $start->addMonths($offset);
                $variation = ($offset % 4) * 325;
                foreach ([1, 8, 15, 22] as $week => $day) {
                    $entry('checking', 'Groceries', 6250 + $variation + $week * 215, $month->day($day), 'Maxi - weekly groceries', 'Vegetables, pantry staples and household essentials.');
                    $entry('cash', 'Groceries', 1650 + $week * 120, $month->day($day + 1), 'Kalenic market - fresh produce');
                }
                foreach ([
                    ['checking', 'Transport', 4200, 1, 'Monthly public transport pass'],
                    ['checking', 'Entertainment', 11900, 3, 'Belgrade jazz night - two tickets'],
                    ['checking', 'Dining out', 3850 + $variation, 7, 'Sunday lunch at Little Bistro'],
                    ['checking', 'Utilities', 6800 + $variation, 9, 'Apartment electricity bill'],
                    ['checking', 'Health', 1850, 11, 'BENU pharmacy - vitamins and first aid'],
                    ['cash', 'Dining out', 760, 13, 'Bread & Butter bakery - breakfast'],
                    ['checking', 'Dining out', 4650, 18, 'Dinner with Ana at Garden Kitchen'],
                    ['checking', 'Utilities', 1990, 20, 'Mobile phone plan'],
                    ['checking', 'Transport', 1450, 23, 'Taxi home after team dinner'],
                    ['checking', 'Subscriptions', 399, 27, 'Cloud photo storage'],
                ] as [$account, $category, $amount, $day, $description]) {
                    $entry($account, $category, $amount, $month->day($day), $description);
                }
                if ($offset % 3 === 1) {
                    $entry('checking', 'Freelance', 42000 + $offset * 1500, $month->day(16), 'Cedar & Finch - website design invoice', 'Payment for the seasonal menu and booking page.');
                }
                $transfer('checking', 'savings', 45000, $month, 'Monthly emergency fund contribution');
                $transfer('checking', 'cash', 10000, $month, 'ATM withdrawal for markets and small purchases');
                $transfer('checking', 'credit', 1299, $month->day(24), 'Pay travel rewards card statement');

                foreach (['Rent' => 85000, 'Groceries' => 38000, 'Utilities' => 16000, 'Transport' => 8000,
                    'Dining out' => 14000, 'Entertainment' => 10000, 'Health' => 6000,
                    'Subscriptions' => 2000, 'Education' => 12500, 'Travel' => 20000] as $category => $amount) {
                    $user->budgets()->create(['category_id' => $categories[$category]->id, 'amount' => $amount, 'month' => $month->toDateString()]);
                }
            }

            $entry('checking', 'Travel', 28600, $start->addMonths(7)->day(17), 'Ljubljana weekend - guesthouse', 'Two nights near the old town.');
            $entry('checking', 'Travel', 8900, $start->addMonths(7)->day(18), 'Return coach tickets to Ljubljana');
            $entry('checking', 'Other income', 7500, $start->addMonths(9)->day(12), 'Sold unused bicycle on local classifieds');

            foreach ([
                ['Six-month emergency fund', 1200000, 895000, 8, 'active', 'Build a reserve for rent, bills and essential living costs.'],
                ['Autumn trip to Lisbon', 180000, 112500, 3, 'active', 'Flights, a small guesthouse and a week exploring the city.'],
                ['New work laptop', 220000, 45000, 6, 'active', 'Replace the current laptop before the next design contract.'],
                ['Home office setup', 95000, 95000, -2, 'completed', 'Desk, ergonomic chair and a second monitor.'],
                ['Second-hand city car', 650000, 35000, null, 'cancelled', 'Keeping public transport and occasional rentals for now.'],
            ] as [$name, $target, $saved, $months, $status, $description]) {
                $user->savingsGoals()->create([
                    'name' => $name, 'target_amount' => $target, 'current_amount' => $saved,
                    'target_date' => $months === null ? null : $today->addMonthsNoOverflow($months)->toDateString(),
                    'description' => $description, 'status' => $status,
                ]);
            }

            // These three entries are intentionally unposted so CSV preview/import has work to do.
            $base = array_replace(array_fill_keys(ActivityCsv::HEADER, ''), ['date' => $today->toDateString(), 'currency' => 'EUR']);
            $rows = [
                array_replace($base, ['type' => 'expense', 'amount' => '24.60', 'account_id' => $accounts['checking']->id,
                    'category_id' => $categories['Groceries']->id, 'description' => 'Green Basket - olive oil and sourdough',
                    'account_name' => $accounts['checking']->name, 'category_name' => 'Groceries']),
                array_replace($base, ['type' => 'income', 'amount' => '180.00', 'account_id' => $accounts['checking']->id,
                    'category_id' => $categories['Freelance']->id, 'description' => 'Cedar & Finch - newsletter design',
                    'notes' => 'Final payment for the monthly newsletter layout.',
                    'account_name' => $accounts['checking']->name, 'category_name' => 'Freelance']),
                array_replace($base, ['type' => 'transfer', 'amount' => '50.00', 'source_account_id' => $accounts['checking']->id,
                    'destination_account_id' => $accounts['savings']->id, 'description' => 'Set aside part of newsletter payment',
                    'source_account_name' => $accounts['checking']->name, 'destination_account_name' => $accounts['savings']->name]),
            ];
            ActivityCsv::validateRows($user, $rows);
            $stream = fopen('php://temp', 'r+');
            try {
                fputcsv($stream, ActivityCsv::HEADER, ',', '"', '');
                foreach ($rows as $row) {
                    fputcsv($stream, array_values($row), ',', '"', '');
                }
                rewind($stream);
                if (! Storage::disk('local')->put(self::CSV_PATH, stream_get_contents($stream))) {
                    throw new RuntimeException('Could not write the demo CSV file.');
                }
            } finally {
                fclose($stream);
            }

            return true;
        });

        if (! $created) {
            $this->command?->info('Demo login already exists; all existing data and credentials were preserved.');

            return;
        }
        $this->command?->info('Demo ready: '.self::EMAIL.' / '.self::PASSWORD);
        $this->command?->info('Sample CSV: '.Storage::disk('local')->path(self::CSV_PATH));
    }
}
