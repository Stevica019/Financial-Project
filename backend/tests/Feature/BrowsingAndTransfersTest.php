<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BrowsingAndTransfersTest extends TestCase
{
    use RefreshDatabase;

    private function finances(): array
    {
        $user = User::factory()->create(['currency' => 'EUR', 'timezone' => 'UTC']);
        $this->actingAs($user);
        $accounts = [];
        foreach (['Bank', 'Cash', 'Savings'] as $name) {
            $accounts[] = $user->accounts()->create(['name' => $name, 'type' => 'cash', 'opening_balance' => 10000, 'opening_date' => '2026-01-01', 'is_active' => true]);
        }
        $category = $user->categories()->create(['name' => 'Food', 'name_key' => 'food', 'type' => 'expense']);

        return [$user, $accounts, $category];
    }

    private function entry($user, $account, $category, array $changes = [])
    {
        return $user->transactions()->create(array_replace(['account_id' => $account->id, 'category_id' => $category->id, 'amount' => 123, 'type' => $category->type, 'date' => '2026-02-01', 'description' => 'Lunch', 'notes' => 'Receipt'], $changes));
    }

    private function transfer(array $accounts, array $changes = []): array
    {
        return array_replace(['source_account_id' => $accounts[0]->id, 'destination_account_id' => $accounts[1]->id, 'amount' => '10.25', 'date' => '2026-02-01', 'description' => 'Cash withdrawal'], $changes);
    }

    private function balances(array $expected): void
    {
        $rows = $this->getJson('/api/accounts')->assertOk()->json('data');
        $actual = array_column($rows, 'balance', 'id');
        foreach ($expected as $id => $balance) {
            $this->assertSame($balance, $actual[$id]);
        }
    }

    public function test_browsing_combines_filters_searches_notes_and_keeps_full_balances(): void
    {
        [$user, $accounts, $category] = $this->finances();
        $target = $this->entry($user, $accounts[0], $category, ['notes' => 'Special RECEIPT 50%_off!']);
        $this->entry($user, $accounts[0], $category, ['amount' => 124]);
        $this->entry($user, $accounts[1], $category);
        $this->entry($user, $accounts[0], $category, ['date' => '2026-01-31']);
        $query = http_build_query(['search' => 'receipt 50%_off!', 'account_id' => $accounts[0]->id, 'category_id' => $category->id, 'type' => 'expense', 'date_from' => '2026-02-01', 'date_to' => '2026-02-01', 'amount_min' => '1.23', 'amount_max' => '1.23']);
        $this->getJson('/api/transactions?'.$query)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $target->id)->assertJsonPath('meta.total', 1);
        $this->getJson('/api/accounts/'.$accounts[0]->id.'/history?'.$query)->assertOk()->assertJsonPath('meta.total', 1);
        $this->balances([$accounts[0]->id => '96.30']);
        $this->getJson('/api/transactions?search=missing')->assertJsonCount(0, 'data')->assertJsonPath('meta.total', 0);
        $this->getJson('/api/transactions?search=%25_')->assertJsonCount(1, 'data');
        $zero = $this->entry($user, $accounts[0], $category, ['description' => '0']);
        $this->getJson('/api/transactions?search=0')->assertJsonCount(2, 'data');
        $this->getJson('/api/transactions?search=0&sort=description&direction=asc')->assertJsonPath('data.0.id', $zero->id);
    }

    public function test_sorting_and_pagination_are_stable_and_owned(): void
    {
        [$user, $accounts, $category] = $this->finances();
        $ids = [];
        for ($i = 0; $i < 25; $i++) {
            $ids[] = $this->entry($user, $accounts[0], $category)->id;
        }
        [$other, $foreign, $foreignCategory] = $this->finances();
        $this->entry($other, $foreign[0], $foreignCategory);
        $this->actingAs($user);
        $first = $this->getJson('/api/transactions?sort=amount&direction=asc&per_page=10')->assertOk()->assertJsonCount(10, 'data')->assertJsonPath('meta.total', 25)->assertJsonPath('meta.last_page', 3)->json('data');
        $second = $this->getJson('/api/transactions?sort=amount&direction=asc&per_page=10&page=2')->assertJsonCount(10, 'data')->json('data');
        $this->assertSame(array_slice($ids, 0, 20), array_column(array_merge($first, $second), 'id'));
        $this->getJson('/api/transactions?per_page=10&page=3')->assertJsonCount(5, 'data');
        $this->getJson('/api/transactions?per_page=10&page=4')->assertJsonCount(0, 'data');
        $this->getJson('/api/transactions?account_id='.$foreign[0]->id)->assertUnprocessable();
        $this->getJson('/api/transactions?category_id='.$foreignCategory->id)->assertUnprocessable();
        $this->getJson('/api/accounts/'.$foreign[0]->id.'/history')->assertNotFound();
    }

    public function test_invalid_browsing_parameters_return_validation_errors(): void
    {
        $this->finances();
        foreach ([['page' => 0], ['per_page' => 101], ['per_page' => 'all'], ['sort' => 'user_id'], ['direction' => 'random'], ['type' => 'transfer'], ['date_from' => '2026-02-30'], ['date_from' => '2026-02-02', 'date_to' => '2026-02-01'], ['amount_min' => '-1'], ['amount_min' => '0.001'], ['amount_min' => '2', 'amount_max' => '1'], ['search' => ['bad']]] as $query) {
            $this->getJson('/api/transactions?'.http_build_query($query))->assertUnprocessable();
        }
    }

    public function test_transfer_create_edit_move_delete_changes_both_balances_but_not_income_expenses_or_total(): void
    {
        [$user, $accounts, $category] = $this->finances();
        $this->entry($user, $accounts[0], $category);
        $id = $this->postJson('/api/transfers', $this->transfer($accounts) + ['user_id' => 999])->assertCreated()->assertJsonPath('data.amount', '10.25')->json('data.id');
        $this->assertDatabaseHas('transfers', ['id' => $id, 'user_id' => $user->id, 'amount' => 1025]);
        $this->balances([$accounts[0]->id => '88.52', $accounts[1]->id => '110.25', $accounts[2]->id => '100.00']);
        $this->getJson('/api/transactions')->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.amount', '1.23');
        $this->getJson('/api/transfers')->assertJsonPath('meta.total', 1);
        foreach (array_slice($accounts, 0, 2) as $account) {
            $this->getJson('/api/accounts/'.$account->id.'/history?type=transfer')->assertJsonCount(1, 'data')->assertJsonPath('data.0.kind', 'transfer')->assertJsonPath('data.0.id', $id);
        }
        $this->patchJson('/api/transfers/'.$id, ['destination_account_id' => $accounts[2]->id, 'amount' => '200.01'])->assertOk();
        $this->balances([$accounts[0]->id => '-101.24', $accounts[1]->id => '100.00', $accounts[2]->id => '300.01']);
        $this->getJson('/api/accounts/'.$accounts[1]->id.'/history')->assertJsonPath('meta.total', 0);
        $this->getJson('/api/transfers?account_id='.$accounts[2]->id.'&amount_min=200.01&amount_max=200.01')->assertJsonPath('meta.total', 1);
        $this->patchJson('/api/transfers/'.$id, ['source_account_id' => $accounts[1]->id])->assertOk();
        $this->balances([$accounts[0]->id => '98.77', $accounts[1]->id => '-100.01', $accounts[2]->id => '300.01']);
        $this->deleteJson('/api/transfers/'.$id)->assertNoContent();
        $this->balances([$accounts[0]->id => '98.77', $accounts[1]->id => '100.00', $accounts[2]->id => '100.00']);
        $this->assertDatabaseCount('transactions', 1);
        $this->assertDatabaseCount('transfers', 0);
    }

    public function test_transfer_validates_money_both_dates_and_distinct_accounts_without_partial_changes(): void
    {
        [$user, $accounts] = $this->finances();
        $accounts[1]->update(['opening_date' => '2026-02-01']);
        $this->travelTo(now()->setTimezone('UTC')->setDate(2026, 9, 6)->setTime(0, 30));
        $user->timezone = 'Pacific/Honolulu';
        $user->save();
        foreach (['0', '-1', '1.001', '1e3', '1,25', 1.25, '1000000000000'] as $amount) {
            $this->postJson('/api/transfers', $this->transfer($accounts, ['amount' => $amount]))->assertUnprocessable()->assertJsonValidationErrors('amount');
        }
        foreach (['2026-01-31', '2026-02-30', '2026-09-06'] as $date) {
            $this->postJson('/api/transfers', $this->transfer($accounts, ['date' => $date]))->assertUnprocessable()->assertJsonValidationErrors('date');
        }
        $this->postJson('/api/transfers', $this->transfer($accounts, ['destination_account_id' => $accounts[0]->id]))->assertUnprocessable()->assertJsonValidationErrors('destination_account_id');
        $id = $this->postJson('/api/transfers', $this->transfer($accounts, ['date' => '2026-09-05', 'description' => null]))->assertCreated()->json('data.id');
        $this->patchJson('/api/transfers/'.$id, ['amount' => '22.22', 'source_account_id' => $accounts[1]->id])->assertUnprocessable();
        $this->getJson('/api/transfers/'.$id)->assertJsonPath('data.amount', '10.25')->assertJsonPath('data.source_account_id', $accounts[0]->id);
        $this->patchJson('/api/transfers/'.$id, ['amount' => '999999999999.99'])->assertOk()->assertJsonPath('data.amount', '999999999999.99');
    }

    public function test_transfer_references_and_archived_account_corrections(): void
    {
        [, $accounts] = $this->finances();
        $id = $this->postJson('/api/transfers', $this->transfer($accounts))->json('data.id');
        foreach (array_slice($accounts, 0, 2) as $account) {
            $this->deleteJson('/api/accounts/'.$account->id)->assertUnprocessable();
            $this->patchJson('/api/accounts/'.$account->id, ['opening_date' => '2026-02-02'])->assertUnprocessable();
            $this->patchJson('/api/accounts/'.$account->id, ['is_active' => false])->assertOk();
        }
        $this->postJson('/api/transfers', $this->transfer($accounts))->assertUnprocessable();
        $this->patchJson('/api/transfers/'.$id, ['amount' => '1.00', 'description' => 'Correction'])->assertOk();
        $this->balances([$accounts[0]->id => '99.00', $accounts[1]->id => '101.00']);
        $this->patchJson('/api/transfers/'.$id, ['source_account_id' => $accounts[1]->id, 'destination_account_id' => $accounts[0]->id])->assertUnprocessable();
        $this->patchJson('/api/transfers/'.$id, ['destination_account_id' => $accounts[2]->id])->assertOk();
        $this->patchJson('/api/transfers/'.$id, ['destination_account_id' => $accounts[1]->id])->assertUnprocessable();
        $this->deleteJson('/api/transfers/'.$id)->assertNoContent();
        $this->deleteJson('/api/accounts/'.$accounts[0]->id)->assertNoContent();
    }

    public function test_transfers_reject_foreign_records_and_accounts_on_create_and_update(): void
    {
        [$owner, $accounts] = $this->finances();
        $id = $this->postJson('/api/transfers', $this->transfer($accounts))->json('data.id');
        [, $own] = $this->finances();
        $ownId = $this->postJson('/api/transfers', $this->transfer($own))->json('data.id');
        $this->getJson('/api/transfers?user_id='.$owner->id)->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.id', $ownId);
        $this->getJson('/api/transfers/'.$id)->assertNotFound();
        $this->patchJson('/api/transfers/'.$id, ['amount' => '1'])->assertNotFound();
        $this->deleteJson('/api/transfers/'.$id)->assertNotFound();
        foreach (['source_account_id', 'destination_account_id'] as $field) {
            $this->postJson('/api/transfers', $this->transfer($own, [$field => $accounts[0]->id]))->assertUnprocessable()->assertJsonValidationErrors($field);
            $this->patchJson('/api/transfers/'.$ownId, [$field => $accounts[0]->id])->assertUnprocessable()->assertJsonValidationErrors($field);
        }
        $this->assertDatabaseCount('transfers', 2);
    }

    public function test_transfer_endpoints_require_authentication(): void
    {
        $this->getJson('/api/transfers')->assertUnauthorized();
        $this->getJson('/api/transfers/1')->assertUnauthorized();
        $this->postJson('/api/transfers', [])->assertUnauthorized();
        $this->patchJson('/api/transfers/1', [])->assertUnauthorized();
        $this->deleteJson('/api/transfers/1')->assertUnauthorized();
        $this->getJson('/api/activity')->assertUnauthorized();
    }

    public function test_combined_history_pages_each_record_once_and_filters_transfers_separately(): void
    {
        [$user, $accounts, $category] = $this->finances();
        $entry = $this->entry($user, $accounts[0], $category);
        $transferId = $this->postJson('/api/transfers', $this->transfer($accounts))->assertCreated()->json('data.id');
        $this->assertSame($entry->id, $transferId);
        $path = '/api/accounts/'.$accounts[0]->id.'/history';
        $first = $this->getJson($path.'?per_page=1&direction=asc')->assertOk()->assertJsonPath('meta.total', 2)->json('data.0');
        $second = $this->getJson($path.'?per_page=1&direction=asc&page=2')->assertOk()->json('data.0');
        $this->assertNotSame($first['kind'], $second['kind']);
        $this->assertSame('2026-02-01', $first['date']);
        $this->assertSame('2026-02-01', $second['date']);
        $this->getJson($path.'?category_id='.$category->id)->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.kind', 'transaction');
        $this->getJson($path.'?type=transfer&date_to=2026-02-01')->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.kind', 'transfer');
        $this->getJson('/api/transfers?search=WITHDRAWAL&account_id='.$accounts[0]->id)->assertJsonPath('meta.total', 1);
        $this->getJson('/api/transfers?account_id='.$accounts[1]->id)->assertJsonPath('meta.total', 1);
        $this->getJson('/api/transfers?account_id='.$accounts[2]->id)->assertJsonPath('meta.total', 0);
    }

    public function test_activity_lists_entries_and_transfers_across_owned_accounts(): void
    {
        [$user, $accounts, $category] = $this->finances();
        $this->entry($user, $accounts[2], $category);
        $this->postJson('/api/transfers', $this->transfer($accounts))->assertCreated();
        $other = User::factory()->create(['currency' => 'EUR', 'timezone' => 'UTC']);
        $foreign = $other->accounts()->create(['name' => 'Other', 'type' => 'cash', 'opening_balance' => 0, 'opening_date' => '2026-01-01', 'is_active' => true]);
        $foreignCategory = $other->categories()->create(['name' => 'Food', 'name_key' => 'food', 'type' => 'expense']);
        $this->entry($other, $foreign, $foreignCategory);
        $this->getJson('/api/activity')->assertOk()->assertJsonPath('meta.total', 2);
        $this->getJson('/api/activity?type=transfer')->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.kind', 'transfer');
        $this->getJson('/api/activity?type=expense')->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.kind', 'transaction');
        $this->getJson('/api/activity?account_id='.$accounts[1]->id)->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.kind', 'transfer');
        $this->getJson('/api/activity?account_id='.$foreign->id)->assertUnprocessable()->assertJsonValidationErrors('account_id');
    }
}
