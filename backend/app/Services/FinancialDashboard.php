<?php

namespace App\Services;

use App\Models\User;
use App\Support\Money;
use Carbon\CarbonImmutable;

class FinancialDashboard
{
    public static function summary(User $user, string $month): array
    {
        $start = CarbonImmutable::createFromFormat('!Y-m', $month, $user->timezone ?? 'UTC');
        $monthly = $user->transactions()->where('date', '>=', $start->toDateString())
            ->where('date', '<', $start->addMonth()->toDateString())
            ->selectRaw("COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income, COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses")
            ->first();
        $income = (int) $monthly->income;
        $expenses = (int) $monthly->expenses;
        $total = 0;
        $accounts = $user->accounts()->orderByDesc('is_active')->orderBy('name')->orderBy('id')->get()->map(function ($account) use (&$total) {
            $balance = AccountBalance::minor($account);
            $total += $balance;

            return ['id' => $account->id, 'name' => $account->name, 'type' => $account->type, 'is_active' => $account->is_active, 'balance' => Money::decimal($balance)];
        });

        return [
            'month' => $month, 'currency' => $user->currency,
            'total_balance' => Money::decimal($total),
            'monthly' => ['income' => Money::decimal($income), 'expenses' => Money::decimal($expenses), 'net_cash_flow' => Money::decimal($income - $expenses)],
            'accounts' => $accounts,
            'recent_activity' => ActivityBrowser::query($user->id)->orderByDesc('date')->orderByDesc('kind')->orderByDesc('id')->limit(10)->get()->map(function ($entry) {
                $entry->amount = Money::decimal((int) $entry->amount);

                return $entry;
            }),
        ];
    }
}
