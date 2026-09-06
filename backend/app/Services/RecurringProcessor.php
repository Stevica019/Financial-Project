<?php

namespace App\Services;

use App\Models\RecurringRule;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class RecurringProcessor
{
    public function run(int $limit = 100): int
    {
        $processed = 0;
        // Earliest outstanding dates first; each occurrence is independently atomic.
        $ids = RecurringRule::where('is_active', true)->whereNotNull('next_execution_date')
            ->where('next_execution_date', '<=', now('Pacific/Kiritimati')->toDateString())
            ->orderBy('next_execution_date')->orderBy('id')->pluck('id');
        foreach ($ids as $id) {
            while ($processed < $limit) {
                $worked = DB::transaction(function () use ($id) {
                    $ownerId = RecurringRule::whereKey($id)->value('user_id');
                    if (! $ownerId) {
                        return false;
                    }
                    // Same lock order as API writes, including archive/edit/delete.
                    $user = User::whereKey($ownerId)->lockForUpdate()->firstOrFail();
                    $rule = $user->recurringRules()->find($id);
                    if (! $rule || ! $rule->is_active || ! $rule->next_execution_date || $rule->next_execution_date > now($user->timezone ?? 'UTC')->toDateString()) {
                        return false;
                    }
                    if (! $rule->account->is_active) {
                        $rule->update(['is_active' => false]);

                        return false;
                    }
                    $date = $rule->next_execution_date;
                    if ($rule->end_date && $date > $rule->end_date) {
                        $rule->update(['next_execution_date' => null, 'is_active' => false]);

                        return false;
                    }
                    $receipt = DB::table('recurring_occurrences')->where('recurring_rule_id', $id)->where('date', $date);
                    if (! $receipt->exists()) {
                        DB::table('recurring_occurrences')->insert(['recurring_rule_id' => $id, 'date' => $date]);
                        $user->transactions()->create([
                            'account_id' => $rule->account_id, 'category_id' => $rule->category_id, 'type' => $rule->type,
                            'amount' => $rule->amount, 'description' => $rule->description, 'notes' => $rule->notes,
                            'date' => $date, 'recurring_rule_id' => $id, 'scheduled_date' => $date,
                        ]);
                    }
                    $next = RecurringSchedule::onOrAfter($rule, CarbonImmutable::parse($date)->addDay()->toDateString());
                    $rule->update(['next_execution_date' => $next, 'is_active' => $next !== null]);

                    return true;
                }, 5);
                if (! $worked) {
                    break;
                }
                $processed++;
            }
            if ($processed >= $limit) {
                break;
            }
        }

        return $processed;
    }
}
