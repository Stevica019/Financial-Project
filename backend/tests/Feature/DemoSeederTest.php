<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\AccountBalance;
use App\Services\ActivityCsv;
use App\Services\RecurringProcessor;
use Carbon\CarbonImmutable;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

class DemoSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->travelTo(CarbonImmutable::parse('2026-09-08 12:00:00', 'Europe/Belgrade'));
    }

    private function seedDemo(): User
    {
        $this->seed(DatabaseSeeder::class);

        return User::where('email', DemoSeeder::EMAIL)->firstOrFail();
    }

    public function test_demo_login_and_every_workspace_page_have_usable_examples(): void
    {
        $user = $this->seedDemo();
        $this->postJson('/api/login', ['email' => DemoSeeder::EMAIL, 'password' => DemoSeeder::PASSWORD])->assertOk();
        $this->getJson('/api/user')->assertOk()->assertJsonPath('name', 'Mila Petrovic');
        $this->actingAs($user);
        $this->getJson('/api/settings')->assertOk()->assertJsonPath('user.currency', 'EUR')
            ->assertJsonPath('user.timezone', 'Europe/Belgrade')->assertJsonPath('user.currency_locked', true);
        $this->getJson('/api/accounts')->assertOk()->assertJsonCount(5, 'data');
        $this->getJson('/api/categories')->assertOk()->assertJsonCount(15, 'data');
        $this->getJson('/api/transactions')->assertOk()->assertJsonCount(20, 'data');
        $this->getJson('/api/transfers')->assertOk();
        $this->getJson('/api/budgets?month=2026-09')->assertOk()->assertJsonCount(10, 'data');
        $this->getJson('/api/recurring-rules')->assertOk()->assertJsonCount(7, 'data');
        $this->getJson('/api/savings-goals')->assertOk()->assertJsonCount(5, 'data');
        $dashboard = $this->getJson('/api/dashboard?month=2026-09')->assertOk()
            ->assertJsonCount(10, 'recent_activity')->assertJsonCount(3, 'goals')->json();
        $this->assertSame('2950.00', $dashboard['monthly']['income']);
        $this->assertGreaterThan(0, (float) $dashboard['monthly']['expenses']);
        $budgets = collect($dashboard['budgets'])->keyBy('name');
        $this->assertEquals(100, $budgets['Rent']['percentage']);
        $this->assertGreaterThan(100, $budgets['Entertainment']['percentage']);
        $this->assertLessThan(100, $budgets['Groceries']['percentage']);
        $this->assertEquals(0, $budgets['Travel']['percentage']);
        $report = $this->getJson('/api/reports?month=2026-09')->assertOk()->assertJsonCount(12, 'trend')->json();
        foreach ($report['trend'] as $month) {
            $this->assertGreaterThan(0, (float) $month['income']);
            $this->assertGreaterThan(0, (float) $month['expenses']);
        }
        $this->assertGreaterThan(1, collect($report['trend'])->pluck('expenses')->unique()->count());
        foreach ($user->accounts()->get() as $account) {
            $this->getJson('/api/accounts/'.$account->id.'/history')->assertOk();
            if (! $account->is_active) {
                $this->assertSame(0, AccountBalance::minor($account));
            }
        }

        // Exercise the actual CSV page's preview, confirmation and duplicate handling.
        $csv = Storage::disk('local')->get(DemoSeeder::CSV_PATH);
        $this->assertCount(3, ActivityCsv::parse($csv));
        $preview = $this->postJson('/api/activity/import/preview', [
            'file' => UploadedFile::fake()->createWithContent('mila-activity.csv', $csv),
        ])->assertOk()->assertJsonPath('total', 3)->assertJsonPath('duplicates', 0);
        $this->postJson('/api/activity/import', ['token' => $preview->json('token')])->assertOk()->assertJsonPath('imported', 3);
        $this->postJson('/api/activity/import', ['token' => $preview->json('token')])->assertOk()->assertJsonPath('imported', 0);
        $export = $this->get('/api/activity/export')->assertOk()->streamedContent();
        $this->assertCount($user->transactions()->count() + $user->transfers()->count(), ActivityCsv::parse($export));
    }

    public static function calendarBoundaries(): array
    {
        return [
            'first day and year rollover' => ['2027-01-01 00:15:00'],
            'leap day' => ['2028-02-29 23:45:00'],
            'short month' => ['2027-02-28 12:00:00'],
        ];
    }

    #[DataProvider('calendarBoundaries')]
    public function test_ledger_dates_ownership_and_recurring_receipts_stay_valid(string $date): void
    {
        $today = CarbonImmutable::parse($date, 'Europe/Belgrade');
        $this->travelTo($today);
        $user = $this->seedDemo();
        $accounts = $user->accounts()->get()->keyBy('id');
        $categories = $user->categories()->get()->keyBy('id');
        foreach ($user->transactions()->get() as $entry) {
            $this->assertTrue($entry->date->gte($accounts[$entry->account_id]->opening_date));
            $this->assertLessThanOrEqual($today->toDateString(), $entry->date->toDateString());
            $this->assertSame($categories[$entry->category_id]->type, $entry->type);
            $this->assertGreaterThan(0, $entry->amount);
            if ($entry->recurring_rule_id !== null) {
                $this->assertDatabaseHas('recurring_occurrences', ['recurring_rule_id' => $entry->recurring_rule_id, 'date' => $entry->scheduled_date]);
                $this->assertSame($entry->date->toDateString(), $entry->scheduled_date);
            }
        }
        foreach ($user->transfers()->get() as $transfer) {
            $this->assertNotSame($transfer->source_account_id, $transfer->destination_account_id);
            $this->assertTrue($transfer->date->gte($accounts[$transfer->source_account_id]->opening_date));
            $this->assertTrue($transfer->date->gte($accounts[$transfer->destination_account_id]->opening_date));
            $this->assertLessThanOrEqual($today->toDateString(), $transfer->date->toDateString());
        }
        foreach ($user->recurringRules()->where('is_active', true)->get() as $rule) {
            $this->assertGreaterThan($today->toDateString(), $rule->next_execution_date);
        }
        $this->assertCount(3, ActivityCsv::validateRows($user, ActivityCsv::parse(Storage::disk('local')->get(DemoSeeder::CSV_PATH))));
        $count = $user->transactions()->count();
        $this->assertSame(0, app(RecurringProcessor::class)->run(10000));
        $this->assertSame($count, $user->transactions()->count());
        $this->actingAs($user)->getJson('/api/dashboard')->assertOk()->assertJsonPath('month', $today->format('Y-m'));
    }

    private function snapshot(): array
    {
        $snapshot = [];
        foreach (['users', 'accounts', 'categories', 'transactions', 'transfers', 'budgets', 'recurring_rules', 'recurring_occurrences', 'savings_goals'] as $table) {
            $snapshot[$table] = DB::table($table)->orderBy('id')->get()->toJson();
        }

        return $snapshot;
    }

    public function test_reseeding_preserves_edits_deletions_credentials_and_other_users(): void
    {
        $other = User::factory()->create(['currency' => 'USD', 'timezone' => 'UTC']);
        $account = $other->accounts()->create(['name' => 'Personal checking', 'type' => 'checking', 'opening_balance' => 12345, 'opening_date' => '2026-01-01']);
        $category = $other->categories()->create(['name' => 'Salary', 'name_key' => 'salary', 'type' => 'income']);
        $other->recurringRules()->create(['account_id' => $account->id, 'category_id' => $category->id,
            'type' => 'income', 'amount' => 10000, 'description' => 'Personal salary', 'frequency' => 'monthly',
            'start_date' => '2026-01-01', 'next_execution_date' => '2026-01-01', 'is_active' => true]);
        $before = $this->snapshot();
        $user = $this->seedDemo();
        $this->assertSame(0, $other->transactions()->count());
        $this->assertSame('2026-01-01', $other->recurringRules()->first()->next_execution_date);
        $this->assertSame(json_decode($before['accounts'])[0]->opening_balance, $account->fresh()->opening_balance);
        $user->update(['name' => 'Mila P.', 'password' => 'MyChangedPassword!']);
        $user->transactions()->first()->delete();
        $user->accounts()->first()->update(['description' => 'Edited while exploring']);
        $snapshot = $this->snapshot();
        $csv = Storage::disk('local')->get(DemoSeeder::CSV_PATH);
        $this->travelTo(CarbonImmutable::parse('2026-10-02', 'Europe/Belgrade'));
        $this->seedDemo();
        $this->assertSame($snapshot, $this->snapshot());
        $this->assertSame($csv, Storage::disk('local')->get(DemoSeeder::CSV_PATH));
    }

    public function test_existing_email_is_not_taken_over(): void
    {
        User::factory()->create(['email' => DemoSeeder::EMAIL, 'name' => 'Existing owner']);
        $snapshot = $this->snapshot();
        $this->seed(DatabaseSeeder::class);
        $this->assertSame($snapshot, $this->snapshot());
        Storage::disk('local')->assertMissing(DemoSeeder::CSV_PATH);
    }

    public function test_demo_seed_refuses_production_even_when_called_directly(): void
    {
        $this->app['env'] = 'production';
        try {
            (new DemoSeeder)->run();
            $this->fail('Production demo seeding must be rejected.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('local or testing', $exception->getMessage());
            $this->assertDatabaseCount('users', 0);
        } finally {
            $this->app['env'] = 'testing';
        }
    }
}
