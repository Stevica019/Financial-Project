<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\BudgetProgress;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BudgetController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate(['month' => ['sometimes', 'required', 'date_format:Y-m', 'regex:/^[1-9][0-9]{3}-/']]);

        return DB::transaction(function () use ($request, $data) {
            $user = User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();

            return response()->json(['data' => BudgetProgress::forMonth($user, $data['month'] ?? now($user->timezone ?? 'UTC')->format('Y-m'))]);
        });
    }

    public function store(Request $request)
    {
        return $this->save($request);
    }

    public function update(Request $request, string $budget)
    {
        return $this->save($request, $request->user()->budgets()->findOrFail($budget));
    }

    private function save(Request $request, $budget = null)
    {
        $data = $request->validate(['category_id' => ['required', 'integer'], 'month' => ['required', 'date_format:Y-m', 'regex:/^[1-9][0-9]{3}-/'], 'amount' => ['required', 'string', 'regex:'.Money::INPUT_PATTERN]]);
        $data['amount'] = Money::toMinor($data['amount']);
        if ($data['amount'] <= 0) {
            throw ValidationException::withMessages(['amount' => 'Amount must be greater than zero.']);
        }
        if (! $request->user()->categories()->whereKey($data['category_id'])->where('type', 'expense')->exists()) {
            throw ValidationException::withMessages(['category_id' => 'Choose one of your expense categories.']);
        }
        $data['month'] .= '-01';
        $duplicate = $request->user()->budgets()->where('category_id', $data['category_id'])->where('month', $data['month']);
        if ($budget) {
            $duplicate->whereKeyNot($budget->id);
        }
        if ($duplicate->exists()) {
            throw ValidationException::withMessages(['category_id' => 'This category already has a budget for this month.']);
        }
        if ($budget) {
            $budget->update($data);
        } else {
            $budget = $request->user()->budgets()->create($data);
        }

        return response()->json(['data' => ['id' => $budget->id]], $budget->wasRecentlyCreated ? 201 : 200);
    }

    public function destroy(Request $request, string $budget)
    {
        $request->user()->budgets()->findOrFail($budget)->delete();

        return response()->noContent();
    }
}
