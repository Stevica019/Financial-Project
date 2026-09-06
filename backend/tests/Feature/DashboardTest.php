<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private function finances(): array
    {
        $user = User::factory()->create(['currency' => 'EUR', 'timezone' => 'UTC']);
        $this->actingAs($user);
        $bank = $user->accounts()->create(['name' => 'Bank', 'type' => 'checking', 'opening_balance' => 10000, 'opening_date' => '2024-01-01', 'is_active' => true]);
        $cash = $user->accounts()->create(['name' => 'Cash', 'type' => 'cash', 'opening_balance' => -2000, 'opening_date' => '2024-01-01', 'is_active' => true]);
        $income = $user->categories()->create(['name' => 'Pay', 'name_key' => 'pay', 'type' => 'income']);
        $expense = $user->categories()->create(['name' => 'Food', 'name_key' => 'food', 'type' => 'expense']);

        return [$user, $bank, $cash, $income, $expense];
    }

    private function entry($user, $account, $category, string $date, int $amount)
    {
        return $user->transactions()->create(['account_id' => $account->id, 'category_id' => $category->id, 'type' => $category->type, 'amount' => $amount, 'date' => $date, 'description' => 'Entry']);
    }

    public function test_month_totals_include_archived_accounts_but_exclude_openings_and_transfers(): void
    {
        [$user, $bank, $cash, $income, $expense] = $this->finances();
        $this->entry($user, $bank, $income, '2024-02-01', 10001);
        $this->entry($user, $cash, $expense, '2024-02-29', 2002);
        $this->entry($user, $bank, $income, '2024-01-31', 300);
        $this->entry($user, $bank, $expense, '2024-03-01', 400);
        $user->transfers()->create(['source_account_id' => $bank->id, 'destination_account_id' => $cash->id, 'amount' => 1234, 'date' => '2024-02-15']);
        $cash->update(['is_active' => false]);
        $this->getJson('/api/dashboard?month=2024-02')->assertOk()
            ->assertJsonPath('total_balance', '158.99')->assertJsonPath('monthly.income', '100.01')
            ->assertJsonPath('monthly.expenses', '20.02')->assertJsonPath('monthly.net_cash_flow', '79.99')
            ->assertJsonPath('accounts.0.balance', '186.67')->assertJsonPath('accounts.1.balance', '-27.68')->assertJsonPath('accounts.1.is_active', false)
            ->assertJsonCount(5, 'recent_activity')->assertJsonPath('recent_activity.0.date', '2024-03-01');
        $this->getJson('/api/dashboard?month=2024-03')->assertJsonPath('monthly.net_cash_flow', '-4.00')->assertJsonPath('total_balance', '158.99');
        $this->getJson('/api/dashboard?month=2024-04')->assertJsonPath('monthly.income', '0.00')->assertJsonPath('monthly.expenses', '0.00')->assertJsonPath('total_balance', '158.99');
    }

    public function test_default_month_uses_timezone_and_december_boundaries_work(): void
    {
        [$user, $bank, , $income] = $this->finances();
        $user->timezone = 'Pacific/Honolulu';
        $user->save();
        $this->travelTo(now()->setTimezone('UTC')->setDate(2026, 1, 1)->setTime(0, 30));
        $this->entry($user, $bank, $income, '2025-12-01', 10);
        $this->entry($user, $bank, $income, '2025-12-31', 20);
        $this->entry($user, $bank, $income, '2025-11-30', 30);
        $this->getJson('/api/dashboard')->assertJsonPath('month', '2025-12')->assertJsonPath('monthly.income', '0.30');
        $user->timezone = 'Pacific/Kiritimati';
        $user->save();
        $this->getJson('/api/dashboard')->assertJsonPath('month', '2026-01')->assertJsonPath('monthly.income', '0.00');
    }

    public function test_edits_and_deletions_are_reflected_on_the_next_dashboard_read(): void
    {
        [$user, $bank, $cash, $income, $expense] = $this->finances();
        $entry = $this->entry($user, $bank, $income, '2026-02-01', 1000);
        $id = $this->postJson('/api/transfers', ['source_account_id' => $bank->id, 'destination_account_id' => $cash->id, 'amount' => '1.00', 'date' => '2026-02-01'])->assertCreated()->json('data.id');
        $this->getJson('/api/dashboard?month=2026-02')->assertJsonPath('total_balance', '90.00')->assertJsonPath('monthly.income', '10.00')->assertJsonCount(2, 'recent_activity');
        $this->patchJson('/api/transactions/'.$entry->id, ['type' => 'expense', 'category_id' => $expense->id, 'amount' => '2.01', 'account_id' => $cash->id])->assertOk();
        $this->patchJson('/api/transfers/'.$id, ['amount' => '30.00'])->assertOk();
        $this->getJson('/api/dashboard?month=2026-02')->assertJsonPath('total_balance', '77.99')->assertJsonPath('monthly.net_cash_flow', '-2.01')
            ->assertJsonPath('accounts.0.balance', '70.00')->assertJsonPath('accounts.1.balance', '7.99');
        $this->patchJson('/api/transactions/'.$entry->id, ['date' => '2026-01-31'])->assertOk();
        $this->getJson('/api/dashboard?month=2026-02')->assertJsonPath('monthly.net_cash_flow', '0.00');
        $this->deleteJson('/api/transfers/'.$id)->assertNoContent();
        $this->deleteJson('/api/transactions/'.$entry->id)->assertNoContent();
        $this->getJson('/api/dashboard?month=2026-02')->assertJsonPath('total_balance', '80.00')->assertJsonPath('accounts.0.balance', '100.00')->assertJsonCount(0, 'recent_activity');
    }

    public function test_recent_activity_is_owned_bounded_stable_and_transfers_appear_once(): void
    {
        [$user, $bank, $cash, $income] = $this->finances();
        for ($i = 0; $i < 12; $i++) {
            $this->entry($user, $bank, $income, '2026-02-01', 1);
        }
        $transfer = $user->transfers()->create(['source_account_id' => $bank->id, 'destination_account_id' => $cash->id, 'amount' => 2, 'date' => '2026-02-01']);
        [$other, $otherBank, , $otherIncome] = $this->finances();
        $this->entry($other, $otherBank, $otherIncome, '2026-03-01', 99999);
        $this->actingAs($user);
        $response = $this->getJson('/api/dashboard?month=2026-02&user_id='.$other->id.'&per_page=100')->assertOk()
            ->assertJsonCount(2, 'accounts')->assertJsonPath('total_balance', '80.12')->assertJsonPath('monthly.income', '0.12')->assertJsonCount(10, 'recent_activity')
            ->assertJsonPath('recent_activity.0.kind', 'transfer')->assertJsonPath('recent_activity.0.id', $transfer->id);
        $rows = collect($response->json('recent_activity'));
        $this->assertCount(1, $rows->where('kind', 'transfer'));
        $this->assertSame([12, 11, 10, 9, 8, 7, 6, 5, 4], $rows->where('kind', 'transaction')->pluck('id')->all());
    }

    public function test_empty_state_validation_and_authentication(): void
    {
        $this->getJson('/api/dashboard')->assertUnauthorized();
        $user = User::factory()->create(['currency' => 'EUR', 'timezone' => 'UTC']);
        $this->actingAs($user)->getJson('/api/dashboard')->assertOk()->assertJsonPath('total_balance', '0.00')->assertJsonPath('monthly.net_cash_flow', '0.00')->assertJsonCount(0, 'accounts')->assertJsonCount(0, 'recent_activity');
        foreach (['2026-13', '2026-2', '2026-02-01', 'nope', '', '0000-01'] as $month) {
            $this->getJson('/api/dashboard?month='.urlencode($month))->assertUnprocessable()->assertJsonValidationErrors('month');
        }
    }
}
