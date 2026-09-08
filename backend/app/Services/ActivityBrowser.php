<?php

namespace App\Services;

use App\Support\Money;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ActivityBrowser
{
    public static function page(Request $request, string $scope = 'transactions', ?int $accountId = null)
    {
        return self::filtered($request, $scope, $accountId)->paginate($request->input('per_page', 20))->withQueryString();
    }

    public static function filtered(Request $request, string $scope = 'transactions', ?int $accountId = null): Builder
    {
        $types = $scope === 'transactions' ? ['income', 'expense'] : ($scope === 'transfers' ? ['transfer'] : ['income', 'expense', 'transfer']);
        $filters = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:255'],
            'account_id' => ['sometimes', 'integer', Rule::exists('accounts', 'id')->where('user_id', $request->user()->id)],
            'category_id' => ['sometimes', 'integer', Rule::exists('categories', 'id')->where('user_id', $request->user()->id)],
            'type' => ['sometimes', Rule::in($types)],
            'date_from' => ['sometimes', 'date_format:Y-m-d'],
            'date_to' => ['sometimes', 'date_format:Y-m-d'],
            'amount_min' => ['sometimes', 'string', 'regex:'.Money::INPUT_PATTERN],
            'amount_max' => ['sometimes', 'string', 'regex:'.Money::INPUT_PATTERN],
            'sort' => ['sometimes', Rule::in(['date', 'amount', 'description'])],
            'direction' => ['sometimes', Rule::in(['asc', 'desc'])],
            'page' => ['sometimes', 'integer', 'min:1', 'max:1000000'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        foreach (['amount_min', 'amount_max'] as $key) {
            if (isset($filters[$key])) {
                $filters[$key] = Money::toMinor($filters[$key]);
                if ($filters[$key] < 0) {
                    throw ValidationException::withMessages([$key => 'Amount filters must be zero or greater.']);
                }
            }
        }
        if (isset($filters['amount_min'], $filters['amount_max']) && $filters['amount_min'] > $filters['amount_max']) {
            throw ValidationException::withMessages(['amount_max' => 'Maximum amount must be at least the minimum.']);
        }
        if (isset($filters['date_from'], $filters['date_to']) && $filters['date_from'] > $filters['date_to']) {
            throw ValidationException::withMessages(['date_to' => 'End date must be on or after the start date.']);
        }
        $query = self::query($request->user()->id, $scope);
        foreach (array_filter([$accountId, $filters['account_id'] ?? null]) as $id) {
            $query->where(fn ($q) => $q->where('account_id', $id)->orWhere('source_account_id', $id)->orWhere('destination_account_id', $id));
        }
        foreach (['category_id', 'type'] as $key) {
            if (isset($filters[$key])) {
                $query->where($key, $filters[$key]);
            }
        }
        foreach (['date_from' => ['date', '>='], 'date_to' => ['date', '<='], 'amount_min' => ['amount', '>='], 'amount_max' => ['amount', '<=']] as $key => [$column, $operator]) {
            if (isset($filters[$key])) {
                $query->where($column, $operator, $filters[$key]);
            }
        }
        if (isset($filters['search']) && $filters['search'] !== '') {
            // Treat wildcard characters literally. Explicit ESCAPE works on SQLite and PostgreSQL.
            $needle = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], mb_strtolower($filters['search'])).'%';
            $query->where(fn ($q) => $q->whereRaw("LOWER(description) LIKE ? ESCAPE '!'", [$needle])->orWhereRaw("LOWER(notes) LIKE ? ESCAPE '!'", [$needle]));
        }
        $direction = $filters['direction'] ?? 'desc';

        return $query->orderBy($filters['sort'] ?? 'date', $direction)->orderBy('kind', $direction)->orderBy('id', $direction);
    }

    public static function query(int $userId, string $scope = 'history'): Builder
    {
        // SQLite retains the time written by Eloquent date casts; expose calendar dates on both databases.
        $transactions = DB::table('transactions as t')->join('accounts as a', 'a.id', '=', 't.account_id')->join('categories as c', 'c.id', '=', 't.category_id')
            ->where('t.user_id', $userId)
            ->selectRaw("t.id, 'transaction' as kind, t.type, t.amount, SUBSTR(CAST(t.date AS VARCHAR), 1, 10) as date, t.description, t.notes, t.account_id, a.name as account_name, t.category_id, c.name as category_name, CAST(NULL AS BIGINT) as source_account_id, CAST(NULL AS BIGINT) as destination_account_id, NULL as source_account_name, NULL as destination_account_name");
        $transfers = DB::table('transfers as t')->join('accounts as s', 's.id', '=', 't.source_account_id')->join('accounts as d', 'd.id', '=', 't.destination_account_id')
            ->where('t.user_id', $userId)
            ->selectRaw("t.id, 'transfer' as kind, 'transfer' as type, t.amount, SUBSTR(CAST(t.date AS VARCHAR), 1, 10) as date, t.description, NULL as notes, CAST(NULL AS BIGINT) as account_id, NULL as account_name, CAST(NULL AS BIGINT) as category_id, NULL as category_name, t.source_account_id, t.destination_account_id, s.name as source_account_name, d.name as destination_account_name");
        $base = match ($scope) {
            'transfers' => $transfers,
            'history' => $transactions->unionAll($transfers),
            default => $transactions,
        };

        return DB::query()->fromSub($base, 'activity');
    }
}
