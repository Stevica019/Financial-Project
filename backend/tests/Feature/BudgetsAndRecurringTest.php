<?php

namespace Tests\Feature;

use App\Models\RecurringRule;
use App\Models\Transaction;
use App\Models\User;
use App\Services\RecurringProcessor;
use App\Services\RecurringSchedule;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BudgetsAndRecurringTest extends TestCase
{
    use RefreshDatabase;

    private function finances(): array
    {
        $this->travelTo(now('UTC')->setDate(2026, 3, 31)->setTime(12, 0));
        $user = User::factory()->create(['currency' => 'EUR', 'timezone' => 'UTC']);
        $this->actingAs($user);
        $account = $user->accounts()->create(['name' => 'Bank', 'type' => 'checking', 'opening_balance' => 10000, 'opening_date' => '2024-01-01', 'is_active' => true]);
        $category = $user->categories()->create(['name' => 'Food', 'name_key' => 'food', 'type' => 'expense']);

        return [$user, $account, $category];
    }

    private function ruleData($account, $category, array $extra = []): array
    {
        return array_merge(['account_id' => $account->id, 'category_id' => $category->id, 'type' => $category->type, 'amount' => '10.01', 'description' => 'Subscription', 'frequency' => 'monthly', 'start_date' => '2026-01-31'], $extra);
    }

    public function test_budget_progress_is_exact_monthly_owned_and_reflects_corrections(): void
    {
        [$user, $account, $category] = $this->finances();
        $data = ['category_id' => $category->id, 'month' => '2026-02', 'amount' => '10.00'];
        $id = $this->postJson('/api/budgets', $data)->assertCreated()->json('data.id');
        $this->postJson('/api/budgets', $data)->assertUnprocessable()->assertJsonValidationErrors('category_id');
        $entry = $user->transactions()->create(['account_id' => $account->id, 'category_id' => $category->id, 'type' => 'expense', 'amount' => 1201, 'date' => '2026-02-28', 'description' => 'Food']);
        $user->transactions()->create(['account_id' => $account->id, 'category_id' => $category->id, 'type' => 'expense', 'amount' => 999, 'date' => '2026-03-01', 'description' => 'Other month']);
        $otherAccount = $user->accounts()->create(['name' => 'Cash', 'type' => 'cash', 'opening_balance' => 10000, 'opening_date' => '2024-01-01', 'is_active' => true]);
        $user->transfers()->create(['source_account_id' => $account->id, 'destination_account_id' => $otherAccount->id, 'amount' => 555, 'date' => '2026-02-01']);
        $account->update(['is_active' => false]);
        $this->getJson('/api/budgets?month=2026-02')->assertOk()->assertJsonPath('data.0.spent', '12.01')->assertJsonPath('data.0.remaining', '-2.01')->assertJsonPath('data.0.percentage', 120.1);
        $this->getJson('/api/dashboard?month=2026-02')->assertJsonPath('budgets.0.spent', '12.01');
        $this->patchJson('/api/transactions/'.$entry->id, ['amount' => '0.01'])->assertOk();
        $this->getJson('/api/budgets?month=2026-02')->assertJsonPath('data.0.remaining', '9.99');
        $this->deleteJson('/api/transactions/'.$entry->id)->assertNoContent();
        $this->getJson('/api/budgets?month=2026-02')->assertJsonPath('data.0.spent', '0.00');
        $this->putJson('/api/budgets/'.$id, array_merge($data, ['amount' => '15.50']))->assertOk();
        $this->getJson('/api/budgets?month=2026-02')->assertJsonPath('data.0.amount', '15.50');
        $this->getJson('/api/budgets?month=2026-03')->assertJsonCount(0, 'data');
        $this->deleteJson('/api/categories/'.$category->id)->assertUnprocessable();
        $this->putJson('/api/categories/'.$category->id, ['name' => 'Food', 'type' => 'income'])->assertUnprocessable();
        $this->deleteJson('/api/budgets/'.$id)->assertNoContent();
    }

    public function test_validation_ownership_and_reference_guards(): void
    {
        [$user, $account, $category] = $this->finances();
        $rule = $this->postJson('/api/recurring-rules', $this->ruleData($account, $category))->assertCreated()->json('data.id');
        $budget = $this->postJson('/api/budgets', ['category_id' => $category->id, 'month' => '2026-03', 'amount' => '20'])->assertCreated()->json('data.id');
        $this->deleteJson('/api/accounts/'.$account->id)->assertUnprocessable();
        $this->patchJson('/api/accounts/'.$account->id, ['opening_date' => '2026-02-01'])->assertUnprocessable();
        $this->deleteJson('/api/categories/'.$category->id)->assertUnprocessable();
        $this->putJson('/api/categories/'.$category->id, ['name' => 'Food', 'type' => 'income'])->assertUnprocessable();
        foreach (['0', '-1', '1.001', '1000000000000'] as $amount) {
            $this->postJson('/api/recurring-rules', $this->ruleData($account, $category, ['amount' => $amount]))->assertUnprocessable()->assertJsonValidationErrors('amount');
            $this->postJson('/api/budgets', ['category_id' => $category->id, 'month' => '2026-02', 'amount' => $amount])->assertUnprocessable()->assertJsonValidationErrors('amount');
        }
        $this->postJson('/api/recurring-rules', $this->ruleData($account, $category, ['end_date' => '2026-01-01']))->assertUnprocessable()->assertJsonValidationErrors('end_date');
        $this->postJson('/api/recurring-rules', $this->ruleData($account, $category, ['start_date' => '2023-12-31']))->assertUnprocessable()->assertJsonValidationErrors('start_date');
        $this->postJson('/api/recurring-rules', $this->ruleData($account, $category, ['type' => 'income']))->assertUnprocessable()->assertJsonValidationErrors('category_id');
        $this->getJson('/api/budgets?month=2026-13')->assertUnprocessable();
        [$other, $otherAccount, $otherCategory] = $this->finances();
        $this->getJson('/api/budgets?month=2026-03')->assertJsonCount(0, 'data');
        $this->getJson('/api/recurring-rules')->assertJsonCount(0, 'data');
        foreach (['budgets' => $budget, 'recurring-rules' => $rule] as $endpoint => $id) {
            $this->patchJson('/api/'.$endpoint.'/'.$id, [])->assertNotFound();
            $this->deleteJson('/api/'.$endpoint.'/'.$id)->assertNotFound();
        }
        $this->postJson('/api/recurring-rules', $this->ruleData($account, $otherCategory))->assertUnprocessable()->assertJsonValidationErrors('account_id');
        $this->postJson('/api/recurring-rules', $this->ruleData($otherAccount, $category))->assertUnprocessable()->assertJsonValidationErrors('category_id');
        $this->postJson('/api/budgets', ['category_id' => $category->id, 'month' => '2026-03', 'amount' => '1'])->assertUnprocessable();
        $this->actingAs($user)->getJson('/api/recurring-rules')->assertJsonCount(1, 'data');
    }

    public function test_month_end_catch_up_is_bounded_and_retries_do_not_recreate_deleted_entries(): void
    {
        [$user, $account, $category] = $this->finances();
        $id = $this->postJson('/api/recurring-rules', $this->ruleData($account, $category))->assertCreated()->json('data.id');
        $this->artisan('finance:process-recurring --limit=2')->assertSuccessful();
        $this->assertSame(['2026-01-31', '2026-02-28'], $user->transactions()->orderBy('date')->pluck('date')->map->format('Y-m-d')->all());
        $this->assertDatabaseHas('recurring_rules', ['id' => $id, 'next_execution_date' => '2026-03-31']);
        $this->artisan('finance:process-recurring')->assertSuccessful();
        $this->artisan('finance:process-recurring')->assertSuccessful();
        $this->assertDatabaseCount('transactions', 3);
        $this->getJson('/api/dashboard?month=2026-03')->assertJsonPath('total_balance', '69.97');
        $entry = $user->transactions()->orderBy('date')->first();
        $this->deleteJson('/api/transactions/'.$entry->id)->assertNoContent();
        // Simulate a stale checkpoint: the durable receipt prevents recreation.
        RecurringRule::findOrFail($id)->update(['next_execution_date' => '2026-01-31']);
        $this->artisan('finance:process-recurring')->assertSuccessful();
        $this->assertDatabaseCount('transactions', 2);
        $this->assertDatabaseCount('recurring_occurrences', 3);
        $this->deleteJson('/api/recurring-rules/'.$id)->assertNoContent();
        $this->assertDatabaseCount('transactions', 2);
        $this->assertDatabaseHas('transactions', ['recurring_rule_id' => null, 'scheduled_date' => '2026-02-28']);
    }

    public function test_failed_generation_rolls_back_receipt_entry_and_schedule_then_retries(): void
    {
        [$user, $account, $category] = $this->finances();
        $id = $this->postJson('/api/recurring-rules', $this->ruleData($account, $category))->json('data.id');
        $dispatcher = Transaction::getEventDispatcher();
        Transaction::setEventDispatcher(clone $dispatcher);
        Transaction::created(function () {
            throw new \RuntimeException('Simulated interrupted write');
        });
        try {
            app(RecurringProcessor::class)->run();
            $this->fail('Expected interrupted write');
        } catch (\RuntimeException $exception) {
            $this->assertSame('Simulated interrupted write', $exception->getMessage());
        } finally {
            Transaction::setEventDispatcher($dispatcher);
        }
        $this->assertDatabaseCount('transactions', 0);
        $this->assertDatabaseCount('recurring_occurrences', 0);
        $this->assertDatabaseHas('recurring_rules', ['id' => $id, 'next_execution_date' => '2026-01-31']);
        $this->assertSame(3, app(RecurringProcessor::class)->run());
        $this->assertSame(0, app(RecurringProcessor::class)->run());
    }

    public function test_pauses_archive_resume_edits_and_inclusive_end_date(): void
    {
        [$user, $account, $category] = $this->finances();
        $id = $this->postJson('/api/recurring-rules', $this->ruleData($account, $category, ['frequency' => 'daily', 'start_date' => '2026-03-28', 'end_date' => '2026-04-02']))->json('data.id');
        $this->patchJson('/api/recurring-rules/'.$id, ['is_active' => false])->assertOk();
        $this->assertSame(0, app(RecurringProcessor::class)->run());
        $this->patchJson('/api/recurring-rules/'.$id, ['is_active' => true])->assertOk()->assertJsonPath('data.next_execution_date', '2026-03-31');
        $this->assertSame(1, app(RecurringProcessor::class)->run());
        $this->patchJson('/api/recurring-rules/'.$id, ['amount' => '20.02'])->assertOk();
        $this->assertTrue($user->transactions()->whereDate('date', '2026-03-31')->where('amount', 1001)->exists());
        $this->patchJson('/api/accounts/'.$account->id, ['is_active' => false])->assertOk();
        $this->assertDatabaseHas('recurring_rules', ['id' => $id, 'is_active' => false]);
        $this->patchJson('/api/recurring-rules/'.$id, ['is_active' => true])->assertUnprocessable();
        $this->patchJson('/api/accounts/'.$account->id, ['is_active' => true])->assertOk();
        $this->assertDatabaseHas('recurring_rules', ['id' => $id, 'is_active' => false]);
        $this->travelTo(now('UTC')->setDate(2026, 4, 2));
        $this->patchJson('/api/recurring-rules/'.$id, ['is_active' => true])->assertOk()->assertJsonPath('data.next_execution_date', '2026-04-02');
        $this->assertSame(1, app(RecurringProcessor::class)->run());
        $this->assertTrue($user->transactions()->whereDate('date', '2026-04-02')->where('amount', 2002)->exists());
        $this->assertFalse($user->transactions()->whereDate('date', '2026-04-01')->exists());
        $this->assertDatabaseHas('recurring_rules', ['id' => $id, 'next_execution_date' => null, 'is_active' => false]);
    }

    public function test_timezone_boundaries_and_income_generation(): void
    {
        [$user, $account, $category] = $this->finances();
        $category->update(['type' => 'income']);
        $user->timezone = 'Pacific/Honolulu';
        $user->save();
        $this->travelTo(now('UTC')->setDate(2026, 1, 1)->setTime(0, 30));
        $id = $this->postJson('/api/recurring-rules', $this->ruleData($account, $category, ['start_date' => '2026-01-01']))->json('data.id');
        $this->assertSame(0, app(RecurringProcessor::class)->run());
        $user->timezone = 'Pacific/Kiritimati';
        $user->save();
        $this->assertSame(1, app(RecurringProcessor::class)->run());
        $this->assertTrue($user->transactions()->whereDate('date', '2026-01-01')->where('recurring_rule_id', $id)->where('type', 'income')->exists());
        $this->getJson('/api/dashboard')->assertJsonPath('monthly.income', '10.01')->assertJsonPath('total_balance', '110.01');
    }

    public function test_anchor_dates_survive_short_months_leap_years_weekly_and_dst(): void
    {
        foreach ([
            ['monthly', '2024-01-31', '2024-02-01', '2024-02-29'],
            ['monthly', '2024-01-31', '2024-03-01', '2024-03-31'],
            ['yearly', '2024-02-29', '2025-01-01', '2025-02-28'],
            ['yearly', '2024-02-29', '2028-01-01', '2028-02-29'],
            ['weekly', '2025-12-29', '2026-01-01', '2026-01-05'],
            ['daily', '2026-03-28', '2026-03-29', '2026-03-29'],
        ] as [$frequency, $anchor, $from, $expected]) {
            $rule = new RecurringRule(['frequency' => $frequency, 'start_date' => $anchor]);
            $this->assertSame($expected, RecurringSchedule::onOrAfter($rule, $from));
        }
        $this->artisan('finance:process-recurring --limit=0')->assertFailed();
    }

    public function test_occurrence_uniqueness_is_enforced_by_database(): void
    {
        [, $account, $category] = $this->finances();
        $id = $this->postJson('/api/recurring-rules', $this->ruleData($account, $category))->json('data.id');
        app(RecurringProcessor::class)->run(1);
        $this->expectException(UniqueConstraintViolationException::class);
        DB::table('recurring_occurrences')->insert(['recurring_rule_id' => $id, 'date' => '2026-01-31']);
    }

    public function test_schedule_edits_use_the_new_anchor_and_new_end_date(): void
    {
        [$user, $account, $category] = $this->finances();
        $id = $this->postJson('/api/recurring-rules', $this->ruleData($account, $category, ['start_date' => '2026-06-30']))->json('data.id');
        $this->patchJson('/api/recurring-rules/'.$id, ['start_date' => '2026-04-01', 'frequency' => 'daily'])->assertOk()->assertJsonPath('data.next_execution_date', '2026-04-01');
        $this->patchJson('/api/recurring-rules/'.$id, ['is_active' => false])->assertOk();
        $this->patchJson('/api/recurring-rules/'.$id, ['start_date' => '2026-03-01', 'frequency' => 'monthly'])->assertOk()->assertJsonPath('data.next_execution_date', '2026-04-01')->assertJsonPath('data.is_active', false);
        $this->patchJson('/api/recurring-rules/'.$id, ['end_date' => '2026-03-30', 'is_active' => true])->assertOk()->assertJsonPath('data.next_execution_date', null)->assertJsonPath('data.is_active', false);
        $this->assertSame(0, app(RecurringProcessor::class)->run());
    }

    public function test_extended_endpoints_require_authentication(): void
    {
        foreach (['budgets', 'recurring-rules'] as $endpoint) {
            $this->getJson('/api/'.$endpoint)->assertUnauthorized();
            $this->postJson('/api/'.$endpoint, [])->assertUnauthorized();
            $this->patchJson('/api/'.$endpoint.'/1', [])->assertUnauthorized();
            $this->deleteJson('/api/'.$endpoint.'/1')->assertUnauthorized();
        }
    }

    public function test_daily_processing_across_dst_uses_calendar_dates_once(): void
    {
        [$user, $account, $category] = $this->finances();
        $user->timezone = 'Europe/Belgrade';
        $user->save();
        $this->travelTo(now('UTC')->setDate(2026, 3, 29)->setTime(0, 30));
        $this->postJson('/api/recurring-rules', $this->ruleData($account, $category, ['frequency' => 'daily', 'start_date' => '2026-03-28', 'end_date' => '2026-03-30']))->assertCreated();
        $this->assertSame(2, app(RecurringProcessor::class)->run());
        $this->travelTo(now('UTC')->setDate(2026, 3, 29)->setTime(22, 30));
        $this->assertSame(1, app(RecurringProcessor::class)->run());
        $this->assertSame(0, app(RecurringProcessor::class)->run());
        $this->assertSame(['2026-03-28', '2026-03-29', '2026-03-30'], $user->transactions()->orderBy('date')->pluck('date')->map->format('Y-m-d')->all());
    }
}
