<?php

namespace App\Services;

use App\Models\Account;

class AccountBalance
{
    public static function minor(Account $account): int
    {
        $net = $account->transactions()
            ->selectRaw("COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS net")
            ->value('net');

        return $account->opening_balance + (int) $net;
    }
}
