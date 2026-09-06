<?php

namespace App\Services;

use App\Models\User;
use App\Support\Money;
use Carbon\CarbonImmutable;

class BudgetProgress
{
    public static function forMonth(User $user, string $month)
    {
        $start = CarbonImmutable::createFromFormat('!Y-m', $month);
        $spent = $user->transactions()->where('type', 'expense')->where('date', '>=', $start->toDateString())
            ->where('date', '<', $start->addMonth()->toDateString())->groupBy('category_id')->selectRaw('category_id, SUM(amount) as spent')->pluck('spent', 'category_id');

        return $user->budgets()->with('category')->where('month', $start->toDateString())->orderBy('id')->get()->map(function ($budget) use ($spent, $month) {
            $amount = (int) $budget->amount;
            $usage = (int) ($spent[$budget->category_id] ?? 0);

            return ['id' => $budget->id, 'category_id' => $budget->category_id, 'name' => $budget->category->name, 'month' => $month,
                'amount' => Money::decimal($amount), 'spent' => Money::decimal($usage), 'remaining' => Money::decimal($amount - $usage), 'percentage' => round($usage / $amount * 100, 1)];
        });
    }
}
