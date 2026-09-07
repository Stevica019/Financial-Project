<?php

namespace App\Http\Controllers;

use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SavingsGoalController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(['data' => $request->user()->savingsGoals()->orderByDesc('id')->get()->map->summary()]);
    }

    public function store(Request $request)
    {
        if (! $request->user()->currency || ! $request->user()->timezone) {
            throw ValidationException::withMessages(['currency' => 'Choose your currency and timezone in Settings before creating a goal.']);
        }
        $goal = $request->user()->savingsGoals()->create($this->validated($request, false));

        return response()->json(['data' => $goal->fresh()->summary()], 201);
    }

    public function update(Request $request, string $savings_goal)
    {
        $goal = $request->user()->savingsGoals()->findOrFail($savings_goal);
        $goal->update($this->validated($request, true));

        return response()->json(['data' => $goal->fresh()->summary()]);
    }

    public function destroy(Request $request, string $savings_goal)
    {
        $request->user()->savingsGoals()->findOrFail($savings_goal)->delete();

        return response()->noContent();
    }

    private function validated(Request $request, bool $partial): array
    {
        $required = $partial ? 'sometimes' : 'required';
        $data = $request->validate([
            'name' => [$required, 'required', 'string', 'max:100'],
            'target_amount' => [$required, 'required', 'string', 'regex:'.Money::INPUT_PATTERN],
            'current_amount' => ['sometimes', 'required', 'string', 'regex:'.Money::INPUT_PATTERN],
            'target_date' => ['sometimes', 'nullable', 'date_format:Y-m-d', 'regex:/^[1-9][0-9]{3}-/'],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'status' => ['sometimes', 'required', Rule::in(['active', 'completed', 'cancelled'])],
        ]);
        foreach (['target_amount', 'current_amount'] as $field) {
            if (isset($data[$field])) {
                $data[$field] = Money::toMinor($data[$field]);
                if ($data[$field] < ($field === 'target_amount' ? 1 : 0)) {
                    throw ValidationException::withMessages([$field => $field === 'target_amount' ? 'Target amount must be greater than zero.' : 'Current amount cannot be negative.']);
                }
            }
        }

        return $data;
    }
}
