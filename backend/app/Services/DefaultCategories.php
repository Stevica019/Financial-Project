<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class DefaultCategories
{
    // Version 1 seed list, also used by the existing-user backfill migration.
    public const NAMES = [
        'income' => ['Salary', 'Freelance', 'Other income'],
        'expense' => ['Groceries', 'Rent', 'Utilities', 'Transport', 'Entertainment', 'Health', 'Subscriptions', 'Other expense'],
    ];

    public static function seed(int $userId): void
    {
        foreach (self::NAMES as $type => $names) {
            foreach ($names as $name) {
                DB::table('categories')->insertOrIgnore([
                    'user_id' => $userId, 'type' => $type, 'name' => $name,
                    'name_key' => mb_strtolower($name), 'created_at' => now(), 'updated_at' => now(),
                ]);
            }
        }
    }
}
