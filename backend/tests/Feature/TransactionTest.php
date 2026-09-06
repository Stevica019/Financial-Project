<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionTest extends TestCase
{
    use RefreshDatabase;

    private function setupFinance(): array
    {
        $user = User::factory()->create(['currency' => 'EUR', 'timezone' => 'UTC']);
        $this->actingAs($user);
        $account = $this->postJson('/api/accounts', ['name' => 'Bank', 'type' => 'checking', 'opening_balance' => '100.00', 'opening_date' => '2026-01-01'])->assertCreated()->json('data.id');
        $category = $this->postJson('/api/categories', ['name' => 'Pay', 'type' => 'income'])->assertCreated()->json('data.id');

        return [$user, ['account_id' => $account, 'category_id' => $category, 'type' => 'income', 'amount' => '0.10', 'date' => '2026-01-01', 'description' => 'Test entry', 'notes' => 'Details']];
    }

    public function test_create_edit_move_and_delete_recalculate_balances_and_history(): void
    {
        [$user, $entry] = $this->setupFinance();
        $id = $this->postJson('/api/transactions', $entry + ['user_id' => 999])->assertCreated()->assertJsonPath('data.amount', '0.10')->json('data.id');
        $this->assertDatabaseHas('transactions', ['id' => $id, 'amount' => 10, 'user_id' => $user->id]);
        $expense = $this->postJson('/api/categories', ['name' => 'Food', 'type' => 'expense'])->json('data.id');
        $this->postJson('/api/transactions', array_replace($entry, ['type' => 'expense', 'category_id' => $expense, 'amount' => '0.20']))->assertCreated();
        $this->getJson('/api/accounts/'.$entry['account_id'])->assertJsonPath('data.balance', '99.90');
        $this->getJson('/api/accounts/'.$entry['account_id'].'/history')->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('data.0.type', 'expense');
        $second = $this->postJson('/api/accounts', ['name' => 'Cash', 'type' => 'cash', 'opening_balance' => '-2.00', 'opening_date' => '2026-01-01'])->json('data.id');
        $this->patchJson('/api/transactions/'.$id, ['account_id' => $second, 'amount' => '1.23'])->assertOk();
        $this->getJson('/api/accounts/'.$entry['account_id'])->assertJsonPath('data.balance', '99.80');
        $this->getJson('/api/accounts/'.$second)->assertJsonPath('data.balance', '-0.77');
        $this->getJson('/api/accounts/'.$second.'/history')->assertJsonCount(1, 'data');
        $this->patchJson('/api/transactions/'.$id, ['type' => 'expense', 'category_id' => $expense])->assertOk();
        $this->getJson('/api/accounts/'.$second)->assertJsonPath('data.balance', '-3.23');
        $this->deleteJson('/api/transactions/'.$id)->assertNoContent();
        $this->getJson('/api/accounts/'.$second)->assertJsonPath('data.balance', '-2.00');
        $this->getJson('/api/accounts/'.$second.'/history')->assertJsonCount(0, 'data');
    }

    public function test_money_dates_and_related_types_are_validated_on_create_and_patch(): void
    {
        [, $entry] = $this->setupFinance();
        $this->travelTo(now()->setTimezone('UTC')->setDate(2026, 9, 6)->setTime(0, 30));
        foreach (['0', '-0.01', '1.001', '1,25', '1e3', '1000000000000', 1.25] as $amount) {
            $this->postJson('/api/transactions', array_replace($entry, ['amount' => $amount]))->assertUnprocessable()->assertJsonValidationErrors('amount');
        }
        foreach (['2025-12-31', '2026-02-30', '2026-09-07'] as $date) {
            $this->postJson('/api/transactions', array_replace($entry, ['date' => $date]))->assertUnprocessable()->assertJsonValidationErrors('date');
        }
        $this->postJson('/api/transactions', array_replace($entry, ['type' => 'expense']))->assertUnprocessable()->assertJsonValidationErrors('category_id');
        $id = $this->postJson('/api/transactions', $entry)->assertCreated()->json('data.id');
        $this->patchJson('/api/transactions/'.$id, ['type' => 'expense'])->assertUnprocessable()->assertJsonValidationErrors('category_id');
        $this->patchJson('/api/transactions/'.$id, ['amount' => '0'])->assertUnprocessable();
        $this->getJson('/api/transactions/'.$id)->assertJsonPath('data.amount', '0.10');
        $this->patchJson('/api/transactions/'.$id, ['amount' => '999999999999.99'])->assertOk()->assertJsonPath('data.amount', '999999999999.99');
        $this->getJson('/api/accounts/'.$entry['account_id'])->assertJsonPath('data.balance', '1000000000099.99');
    }

    public function test_activity_dates_use_user_local_today(): void
    {
        [$user, $entry] = $this->setupFinance();
        $user->timezone = 'Pacific/Honolulu';
        $user->save();
        $this->travelTo(now()->setTimezone('UTC')->setDate(2026, 9, 6)->setTime(0, 30));
        $this->postJson('/api/transactions', array_replace($entry, ['date' => '2026-09-06']))->assertUnprocessable()->assertJsonValidationErrors('date');
        $this->postJson('/api/transactions', array_replace($entry, ['date' => '2026-09-05']))->assertCreated();
    }

    public function test_references_opening_dates_and_archive_rules_preserve_history(): void
    {
        [, $entry] = $this->setupFinance();
        $id = $this->postJson('/api/transactions', $entry)->json('data.id');
        $account = $entry['account_id'];
        $category = $entry['category_id'];
        $this->deleteJson('/api/accounts/'.$account)->assertUnprocessable();
        $this->deleteJson('/api/categories/'.$category)->assertUnprocessable();
        $this->putJson('/api/categories/'.$category, ['name' => 'Renamed', 'type' => 'expense'])->assertUnprocessable()->assertJsonValidationErrors('type');
        $this->putJson('/api/categories/'.$category, ['name' => 'Renamed', 'type' => 'income'])->assertOk();
        $this->patchJson('/api/accounts/'.$account, ['opening_date' => '2026-01-02'])->assertUnprocessable()->assertJsonValidationErrors('opening_date');
        $this->patchJson('/api/accounts/'.$account, ['opening_balance' => '-1.00', 'is_active' => false])->assertOk()->assertJsonPath('data.balance', '-0.90');
        $this->postJson('/api/transactions', $entry)->assertUnprocessable()->assertJsonValidationErrors('account_id');
        $this->patchJson('/api/transactions/'.$id, ['amount' => '2.00'])->assertOk();
        $this->getJson('/api/accounts')->assertJsonPath('data.0.balance', '1.00');
        $second = $this->postJson('/api/accounts', ['name' => 'Cash', 'type' => 'cash', 'opening_balance' => '0', 'opening_date' => '2026-01-01', 'is_active' => false])->json('data.id');
        $this->patchJson('/api/transactions/'.$id, ['account_id' => $second])->assertUnprocessable()->assertJsonValidationErrors('account_id');
        $this->patchJson('/api/accounts/'.$second, ['is_active' => true])->assertOk();
        $this->patchJson('/api/transactions/'.$id, ['account_id' => $second])->assertOk();
        $this->deleteJson('/api/transactions/'.$id)->assertNoContent();
        $this->deleteJson('/api/accounts/'.$account)->assertNoContent();
        $this->deleteJson('/api/categories/'.$category)->assertNoContent();
    }

    public function test_other_users_cannot_access_entries_history_or_submit_foreign_relations(): void
    {
        [$owner, $entry] = $this->setupFinance();
        $id = $this->postJson('/api/transactions', $entry)->json('data.id');
        [, $own] = $this->setupFinance();
        $ownId = $this->postJson('/api/transactions', $own)->json('data.id');
        $this->getJson('/api/transactions?user_id='.$owner->id)->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $ownId);
        $this->getJson('/api/transactions/'.$id)->assertNotFound();
        $this->patchJson('/api/transactions/'.$id, ['amount' => '5'])->assertNotFound();
        $this->deleteJson('/api/transactions/'.$id)->assertNotFound();
        $this->getJson('/api/accounts/'.$entry['account_id'].'/history')->assertNotFound();
        foreach (['account_id', 'category_id'] as $field) {
            $this->postJson('/api/transactions', array_replace($own, [$field => $entry[$field]]))->assertUnprocessable()->assertJsonValidationErrors($field);
            $this->patchJson('/api/transactions/'.$ownId, [$field => $entry[$field]])->assertUnprocessable()->assertJsonValidationErrors($field);
        }
        $this->assertDatabaseCount('transactions', 2);
    }

    public function test_transaction_endpoints_require_authentication(): void
    {
        $this->getJson('/api/transactions')->assertUnauthorized();
        $this->postJson('/api/transactions', [])->assertUnauthorized();
        $this->getJson('/api/transactions/1')->assertUnauthorized();
        $this->patchJson('/api/transactions/1', [])->assertUnauthorized();
        $this->deleteJson('/api/transactions/1')->assertUnauthorized();
        $this->getJson('/api/accounts/1/history')->assertUnauthorized();
    }
}
