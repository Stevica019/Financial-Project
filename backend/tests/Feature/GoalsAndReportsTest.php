<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GoalsAndReportsTest extends TestCase
{
    use RefreshDatabase;

    private function owner(): User
    {
        $user = User::factory()->create(['currency' => 'EUR', 'timezone' => 'UTC']);
        $this->actingAs($user);

        return $user;
    }

    public function test_goal_lifecycle_is_manual_exact_and_does_not_affect_finances(): void
    {
        $user = $this->owner();
        $user->accounts()->create(['name' => 'Cash', 'type' => 'cash', 'opening_balance' => 12345, 'opening_date' => '2024-01-01', 'is_active' => true]);
        $id = $this->postJson('/api/savings-goals', ['name' => 'Trip', 'target_amount' => '100.01'])->assertCreated()
            ->assertJsonPath('data.current_amount', '0.00')->assertJsonPath('data.status', 'active')->json('data.id');
        $this->patchJson('/api/savings-goals/'.$id, ['current_amount' => '125.02', 'target_date' => '2024-02-29', 'description' => 'Manual'])
            ->assertOk()->assertJsonPath('data.remaining', '0.00')->assertJsonPath('data.status', 'active');
        $this->getJson('/api/dashboard')->assertJsonPath('total_balance', '123.45')->assertJsonPath('monthly.income', '0.00')
            ->assertJsonPath('goals.0.current_amount', '125.02')->assertJsonCount(0, 'recent_activity');
        foreach (['completed', 'cancelled', 'active'] as $status) {
            $this->patchJson('/api/savings-goals/'.$id, ['status' => $status])->assertOk()->assertJsonPath('data.status', $status);
            $this->getJson('/api/dashboard')->assertJsonCount($status === 'active' ? 1 : 0, 'goals');
        }
        $this->putJson('/api/savings-goals/'.$id, ['name' => 'New trip', 'target_amount' => '999999999999.99', 'current_amount' => '0.01', 'target_date' => null])
            ->assertOk()->assertJsonPath('data.remaining', '999999999999.98')->assertJsonPath('data.target_date', null);
        $this->deleteJson('/api/savings-goals/'.$id)->assertNoContent();
        $this->getJson('/api/savings-goals')->assertJsonCount(0, 'data');
        $this->getJson('/api/dashboard')->assertJsonPath('total_balance', '123.45');
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_goal_validation_ownership_and_currency_protection(): void
    {
        $user = $this->owner();
        foreach (['0', '-1', '1.001', '1000000000000', 12] as $amount) {
            $this->postJson('/api/savings-goals', ['name' => 'Trip', 'target_amount' => $amount])->assertUnprocessable()->assertJsonValidationErrors('target_amount');
        }
        $id = $this->postJson('/api/savings-goals', ['name' => 'Trip', 'target_amount' => '1.00'])->assertCreated()->json('data.id');
        foreach ([['current_amount' => '-0.01'], ['status' => 'unknown'], ['target_date' => '2025-02-29'], ['name' => ''], ['current_amount' => '1.001']] as $invalid) {
            $this->patchJson('/api/savings-goals/'.$id, $invalid)->assertUnprocessable()->assertJsonValidationErrors(array_keys($invalid));
        }
        $this->putJson('/api/settings', ['currency' => 'USD', 'timezone' => 'UTC'])->assertUnprocessable()->assertJsonValidationErrors('currency');
        $this->putJson('/api/settings', ['currency' => 'EUR', 'timezone' => 'Europe/Belgrade'])->assertOk();
        $other = $this->owner();
        $this->getJson('/api/savings-goals?user_id='.$user->id)->assertJsonCount(0, 'data');
        $this->getJson('/api/dashboard')->assertJsonCount(0, 'goals');
        $this->patchJson('/api/savings-goals/'.$id, ['current_amount' => '5'])->assertNotFound();
        $this->deleteJson('/api/savings-goals/'.$id)->assertNotFound();
        $this->actingAs($user)->deleteJson('/api/savings-goals/'.$id)->assertNoContent();
        $this->putJson('/api/settings', ['currency' => 'USD', 'timezone' => 'UTC'])->assertOk();
        $other->currency = null;
        $other->save();
        $this->actingAs($other)->postJson('/api/savings-goals', ['name' => 'Trip', 'target_amount' => '1'])->assertUnprocessable();
    }

    public function test_reports_use_exact_owned_monthly_activity_and_refresh_after_corrections(): void
    {
        $user = $this->owner();
        $account = $user->accounts()->create(['name' => 'Archived', 'type' => 'cash', 'opening_balance' => 99999, 'opening_date' => '2023-01-01', 'is_active' => false]);
        $cash = $user->accounts()->create(['name' => 'Cash', 'type' => 'cash', 'opening_balance' => 0, 'opening_date' => '2023-01-01', 'is_active' => true]);
        $food = $user->categories()->create(['name' => 'Food', 'name_key' => 'food', 'type' => 'expense']);
        $pay = $user->categories()->create(['name' => 'Pay', 'name_key' => 'pay', 'type' => 'income']);
        $entry = fn ($category, $date, $amount) => $user->transactions()->create(['account_id' => $account->id, 'category_id' => $category->id, 'type' => $category->type, 'amount' => $amount, 'date' => $date, 'description' => 'Entry']);
        $entry($pay, '2024-01-31', 20001);
        $entry($food, '2024-01-01', 1000);
        $entry($pay, '2024-02-01', 10001);
        $expense = $entry($food, '2024-02-29', 2002);
        $entry($food, '2024-03-01', 99999);
        $user->transfers()->create(['source_account_id' => $account->id, 'destination_account_id' => $cash->id, 'amount' => 700, 'date' => '2024-02-10']);
        $this->postJson('/api/savings-goals', ['name' => 'Goal', 'target_amount' => '100', 'current_amount' => '80'])->assertCreated();
        $this->getJson('/api/reports?month=2024-02')->assertOk()->assertJsonPath('previous_month', '2024-01')
            ->assertJsonPath('monthly.income', '100.01')->assertJsonPath('monthly.expenses', '20.02')->assertJsonPath('monthly.net_cash_flow', '79.99')
            ->assertJsonPath('previous.net_cash_flow', '190.01')->assertJsonPath('change.income', '-100.00')->assertJsonPath('change.expenses', '10.02')
            ->assertJsonPath('change.net_cash_flow', '-110.02')->assertJsonCount(1, 'spending_by_category')->assertJsonPath('spending_by_category.0.amount', '20.02');
        $this->patchJson('/api/transactions/'.$expense->id, ['amount' => '21.03'])->assertOk();
        $this->getJson('/api/reports?month=2024-02')->assertJsonPath('monthly.expenses', '21.03')->assertJsonPath('spending_by_category.0.amount', '21.03');
        $this->patchJson('/api/transactions/'.$expense->id, ['date' => '2024-01-31'])->assertOk();
        $this->getJson('/api/reports?month=2024-02')->assertJsonPath('monthly.expenses', '0.00')->assertJsonPath('previous.expenses', '31.03')->assertJsonCount(0, 'spending_by_category');
        $this->deleteJson('/api/transactions/'.$expense->id)->assertNoContent();
        $this->getJson('/api/reports?month=2024-02')->assertJsonPath('previous.expenses', '10.00');
        $this->owner();
        $this->getJson('/api/reports?month=2024-02&user_id='.$user->id)->assertJsonPath('monthly.income', '0.00')->assertJsonPath('previous.expenses', '0.00')->assertJsonCount(0, 'spending_by_category');
    }

    public function test_report_timezone_year_boundaries_empty_months_validation_and_authentication(): void
    {
        $this->getJson('/api/reports')->assertUnauthorized();
        $this->getJson('/api/savings-goals')->assertUnauthorized();
        $this->postJson('/api/savings-goals', [])->assertUnauthorized();
        $user = $this->owner();
        $user->timezone = 'Pacific/Honolulu';
        $user->save();
        $this->travelTo(now('UTC')->setDate(2026, 1, 1)->setTime(0, 30));
        $this->getJson('/api/reports')->assertOk()->assertJsonPath('month', '2025-12')->assertJsonPath('previous_month', '2025-11');
        $this->getJson('/api/reports?month=2026-01')->assertJsonPath('previous_month', '2025-12')->assertJsonPath('change.net_cash_flow', '0.00');
        foreach (['', '0000-01', '2026-13', '2026-2', '2026-02-01', 'nope'] as $month) {
            $this->getJson('/api/reports?month='.urlencode($month))->assertUnprocessable()->assertJsonValidationErrors('month');
        }
    }
}
