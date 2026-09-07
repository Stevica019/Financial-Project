<?php

namespace App\Services;

use App\Models\User;
use App\Support\Money;
use Carbon\CarbonImmutable;

class MonthlyReport
{
    public static function totals(User $user, string $month): array
    {
        $start = CarbonImmutable::createFromFormat('!Y-m', $month, $user->timezone ?? 'UTC');
        $row = $user->transactions()->where('date', '>=', $start->toDateString())->where('date', '<', $start->addMonth()->toDateString())
            ->selectRaw("COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income, COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses")->first();
        $income = (int) $row->income;
        $expenses = (int) $row->expenses;

        return ['income' => $income, 'expenses' => $expenses, 'net_cash_flow' => $income - $expenses];
    }

    public static function summary(User $user, string $month): array
    {
        $start = CarbonImmutable::createFromFormat('!Y-m', $month, $user->timezone ?? 'UTC');
        $previousMonth = $start->subMonth()->format('Y-m');
        $current = self::totals($user, $month);
        $previous = self::totals($user, $previousMonth);
        $change = [];
        foreach ($current as $key => $amount) {
            $change[$key] = Money::decimal($amount - $previous[$key]);
        }
        $categories = $user->transactions()->where('type', 'expense')
            ->where('date', '>=', $start->toDateString())->where('date', '<', $start->addMonth()->toDateString())
            ->selectRaw('category_id, SUM(amount) AS total')->groupBy('category_id')
            ->with('category')->orderByDesc('total')->orderBy('category_id')->get()
            ->map(fn ($row) => ['category_id' => $row->category_id, 'name' => $row->category->name, 'amount' => Money::decimal((int) $row->total)]);

        return [
            'month' => $month, 'previous_month' => $previousMonth, 'currency' => $user->currency,
            'monthly' => array_map(Money::decimal(...), $current),
            'previous' => array_map(Money::decimal(...), $previous),
            'change' => $change, 'spending_by_category' => $categories,
        ];
    }
}
