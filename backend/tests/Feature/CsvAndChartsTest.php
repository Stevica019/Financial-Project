<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\ActivityCsv;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CsvAndChartsTest extends TestCase
{
    use RefreshDatabase;

    private function setupFinances(): array
    {
        $user = User::factory()->create(['currency' => 'EUR', 'timezone' => 'UTC']);
        $this->actingAs($user);
        $account = $user->accounts()->create(['name' => '=Bank', 'type' => 'cash', 'opening_balance' => 10000, 'opening_date' => '2024-01-01', 'is_active' => true]);
        $second = $user->accounts()->create(['name' => 'Cash', 'type' => 'cash', 'opening_balance' => 0, 'opening_date' => '2024-01-01', 'is_active' => true]);
        $category = $user->categories()->create(['name' => 'Food', 'name_key' => 'food', 'type' => 'expense']);
        $row = array_fill_keys(ActivityCsv::HEADER, '');
        $row = array_replace($row, ['type' => 'expense', 'date' => '2024-02-29', 'amount' => '10.01', 'currency' => 'EUR', 'account_id' => (string) $account->id, 'category_id' => (string) $category->id, 'description' => 'Lunch']);

        return [$user, $account, $second, $category, $row];
    }

    private function csv(array $rows): string
    {
        $stream = fopen('php://temp', 'r+');
        fputcsv($stream, ActivityCsv::HEADER, ',', '"', '');
        foreach ($rows as $row) {
            fputcsv($stream, array_values($row), ',', '"', '');
        }
        rewind($stream);
        $contents = stream_get_contents($stream);
        fclose($stream);

        return $contents;
    }

    private function preview(string $csv)
    {
        return $this->postJson('/api/activity/import/preview', ['file' => UploadedFile::fake()->createWithContent('activity.csv', $csv)]);
    }

    public function test_export_is_owned_filtered_unpaginated_and_preserves_safe_text_and_exact_amounts(): void
    {
        [$user, $account, $second, $category] = $this->setupFinances();
        for ($i = 0; $i < 25; $i++) {
            $user->transactions()->create(['account_id' => $account->id, 'category_id' => $category->id, 'type' => 'expense', 'amount' => 1001, 'date' => '2024-02-29', 'description' => '=SUM(1,2)', 'notes' => "Čaj, \"food\"\nnext line"]);
        }
        $user->transfers()->create(['source_account_id' => $account->id, 'destination_account_id' => $second->id, 'amount' => 123, 'date' => '2024-03-01']);
        [$other] = $this->setupFinances();
        $this->actingAs($user);
        $response = $this->get('/api/activity/export?scope=transactions&per_page=1&page=2&amount_min=10.01&amount_max=10.01')->assertOk();
        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $csv = $response->streamedContent();
        $this->assertStringContainsString("'=SUM(1,2)", $csv);
        $this->assertStringContainsString("'=Bank", $csv);
        $rows = ActivityCsv::parse($csv);
        $this->assertCount(25, $rows);
        $this->assertSame('10.01', $rows[0]['amount']);
        $this->assertSame('=SUM(1,2)', $rows[0]['description']);
        $this->assertSame("Čaj, \"food\"\nnext line", $rows[0]['notes']);
        $this->assertCount(26, ActivityCsv::parse($this->get('/api/activity/export')->streamedContent()));
        $this->assertCount(1, ActivityCsv::parse($this->get('/api/activity/export?scope=history&history_account_id='.$second->id)->streamedContent()));
        $this->getJson('/api/activity/export?account_id='.$other->accounts()->first()->id)->assertUnprocessable();
        $this->getJson('/api/activity/export?history_account_id='.$other->accounts()->first()->id)->assertNotFound();
        $this->assertStringNotContainsString('Lunch', $this->get('/api/activity/export?template=1')->streamedContent());
    }

    public function test_import_preview_writes_nothing_confirmation_is_atomic_and_retries_do_not_restore_deleted_entries(): void
    {
        [$user, $account, $second, $category, $row] = $this->setupFinances();
        $transfer = array_replace($row, ['type' => 'transfer', 'account_id' => '', 'category_id' => '', 'source_account_id' => (string) $account->id, 'destination_account_id' => (string) $second->id, 'amount' => '2.03', 'description' => 'Cash']);
        $csv = $this->csv([$row, $row, $transfer]);
        $token = $this->preview($csv)->assertOk()->assertJsonPath('total', 3)->assertJsonPath('duplicates', 1)->json('token');
        $this->assertDatabaseCount('transactions', 0);
        $this->assertDatabaseCount('transfers', 0);
        $this->postJson('/api/activity/import', ['token' => $token])->assertOk()->assertJsonPath('imported', 2)->assertJsonPath('skipped', 1);
        $this->assertDatabaseCount('transactions', 1);
        $this->assertDatabaseCount('transfers', 1);
        $this->getJson('/api/accounts')->assertJsonFragment(['balance' => '87.96'])->assertJsonFragment(['balance' => '2.03']);
        $user->transactions()->delete();
        $this->postJson('/api/activity/import', ['token' => $token])->assertOk()->assertJsonPath('imported', 0)->assertJsonPath('already_imported', true);
        $this->assertDatabaseCount('transactions', 0);
        $this->preview($csv)->assertOk()->assertJsonPath('already_imported', true);
        $this->assertDatabaseCount('csv_imports', 1);
    }

    public function test_import_revalidates_after_preview_and_prevents_partial_writes_and_foreign_tokens(): void
    {
        [$user, $account, $second, $category, $row] = $this->setupFinances();
        $later = array_replace($row, ['account_id' => (string) $second->id, 'description' => 'Second']);
        $token = $this->preview($this->csv([$row, $later]))->assertOk()->json('token');
        $second->update(['is_active' => false]);
        $this->postJson('/api/activity/import', ['token' => $token])->assertUnprocessable();
        $this->assertDatabaseCount('transactions', 0);
        $this->assertDatabaseCount('csv_imports', 0);
        $this->setupFinances();
        $this->postJson('/api/activity/import', ['token' => $token])->assertUnprocessable();
        $this->actingAs($user);
        $second->update(['is_active' => true]);
        $this->postJson('/api/activity/import', ['token' => $token])->assertOk()->assertJsonPath('imported', 2);
        Cache::flush();
        $this->postJson('/api/activity/import', ['token' => $token])->assertUnprocessable();
    }

    public function test_invalid_files_and_financial_rows_are_rejected_without_writes(): void
    {
        [$user, $account, $second, $category, $row] = $this->setupFinances();
        [$other, $foreign] = $this->setupFinances();
        $this->actingAs($user);
        foreach ([['amount' => '1.001'], ['date' => '2024-02-30'], ['currency' => 'USD'], ['account_id' => (string) $foreign->id], ['type' => 'income'], ['description' => ''], ['date' => '2099-01-01']] as $changes) {
            $this->preview($this->csv([$row, array_replace($row, $changes)]))->assertUnprocessable();
        }
        $this->preview("bad,headers\n1,2")->assertUnprocessable();
        $this->preview($this->csv([]))->assertUnprocessable();
        $this->preview($this->csv(array_fill(0, 1001, $row)))->assertUnprocessable();
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_exported_existing_activity_is_skipped_and_new_file_duplicates_are_checked_again(): void
    {
        [$user, $account, $second, $category, $row] = $this->setupFinances();
        $token = $this->preview($this->csv([$row]))->assertOk()->json('token');
        $this->postJson('/api/transactions', array_intersect_key($row, array_flip(['type', 'date', 'amount', 'account_id', 'category_id', 'description', 'notes'])))->assertCreated();
        $this->postJson('/api/activity/import', ['token' => $token])->assertOk()->assertJsonPath('imported', 0)->assertJsonPath('skipped', 1);
        $export = $this->get('/api/activity/export')->streamedContent();
        $newToken = $this->preview($export)->assertOk()->assertJsonPath('duplicates', 1)->json('token');
        $this->postJson('/api/activity/import', ['token' => $newToken])->assertOk()->assertJsonPath('imported', 0);
    }

    public function test_chart_trend_is_twelve_ordered_months_with_exact_owned_totals_and_empty_months(): void
    {
        [$user, $account, $second, $category] = $this->setupFinances();
        $entry = $user->transactions()->create(['account_id' => $account->id, 'category_id' => $category->id, 'type' => 'expense', 'amount' => 123, 'date' => '2024-02-29', 'description' => 'Lunch']);
        $user->transfers()->create(['source_account_id' => $account->id, 'destination_account_id' => $second->id, 'amount' => 50000, 'date' => '2024-02-29']);
        $account->update(['is_active' => false]);
        [$other, $foreign, , $foreignCategory] = $this->setupFinances();
        $other->transactions()->create(['account_id' => $foreign->id, 'category_id' => $foreignCategory->id, 'type' => 'expense', 'amount' => 9999, 'date' => '2024-02-29', 'description' => 'Foreign']);
        $this->actingAs($user);
        $this->getJson('/api/reports?month=2024-03')->assertOk()->assertJsonCount(12, 'trend')
            ->assertJsonPath('trend.0.month', '2023-04')->assertJsonPath('trend.10.month', '2024-02')
            ->assertJsonPath('trend.10.expenses', '1.23')->assertJsonPath('trend.10.net_cash_flow', '-1.23')->assertJsonPath('trend.11.expenses', '0.00');
        $entry->delete();
        $this->getJson('/api/reports?month=2024-03')->assertJsonPath('trend.10.expenses', '0.00');
    }

    public function test_mid_import_database_failure_rolls_back_entries_and_receipt_and_allows_retry(): void
    {
        [, , , , $row] = $this->setupFinances();
        $token = $this->preview($this->csv([$row, array_replace($row, ['description' => 'Fail here'])]))->assertOk()->json('token');
        DB::unprepared("CREATE TRIGGER fail_csv_insert BEFORE INSERT ON transactions WHEN NEW.description = 'Fail here' BEGIN SELECT RAISE(ABORT, 'Simulated failure'); END");
        $this->postJson('/api/activity/import', ['token' => $token])->assertStatus(500);
        $this->assertDatabaseCount('transactions', 0);
        $this->assertDatabaseCount('csv_imports', 0);
        DB::unprepared('DROP TRIGGER fail_csv_insert');
        $this->postJson('/api/activity/import', ['token' => $token])->assertOk()->assertJsonPath('imported', 2);
    }

    public function test_csv_endpoints_require_authentication(): void
    {
        $this->getJson('/api/activity/export')->assertUnauthorized();
        $this->postJson('/api/activity/import/preview')->assertUnauthorized();
        $this->postJson('/api/activity/import')->assertUnauthorized();
    }
}
