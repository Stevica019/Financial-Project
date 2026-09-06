<?php

namespace App\Http\Controllers;

use App\Models\RecurringRule;
use App\Services\RecurringSchedule;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class RecurringRuleController extends Controller
{
    private function resource(RecurringRule $rule): array
    {
        return array_merge($rule->toArray(), ['amount' => Money::decimal($rule->amount), 'account_name' => $rule->account->name, 'category_name' => $rule->category->name]);
    }

    public function index(Request $request)
    {
        return response()->json(['data' => $request->user()->recurringRules()->with(['account', 'category'])->orderBy('id')->get()->map(fn ($rule) => $this->resource($rule))]);
    }

    public function store(Request $request)
    {
        return $this->save($request);
    }

    public function update(Request $request, string $recurring_rule)
    {
        return $this->save($request, $request->user()->recurringRules()->findOrFail($recurring_rule));
    }

    private function save(Request $request, ?RecurringRule $rule = null)
    {
        $required = $rule ? 'sometimes' : 'required';
        $data = $request->validate([
            'account_id' => [$required, 'required', 'integer'], 'category_id' => [$required, 'required', 'integer'],
            'type' => [$required, 'required', Rule::in(['income', 'expense'])],
            'amount' => [$required, 'required', 'string', 'regex:'.Money::INPUT_PATTERN],
            'description' => [$required, 'required', 'string', 'max:255'], 'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'frequency' => [$required, 'required', Rule::in(['daily', 'weekly', 'monthly', 'yearly'])],
            'start_date' => [$required, 'required', 'date_format:Y-m-d', 'after_or_equal:1000-01-01', 'before_or_equal:9998-12-31'],
            'end_date' => ['sometimes', 'nullable', 'date_format:Y-m-d', 'before_or_equal:9998-12-31'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        if (isset($data['amount'])) {
            $data['amount'] = Money::toMinor($data['amount']);
            if ($data['amount'] <= 0) {
                throw ValidationException::withMessages(['amount' => 'Amount must be greater than zero.']);
            }
        }
        $creating = ! $rule;
        $rule ??= new RecurringRule(['is_active' => true]);
        $rule->fill($data);
        $account = $request->user()->accounts()->find($rule->account_id);
        $category = $request->user()->categories()->find($rule->category_id);
        $errors = [];
        if (! $account || (! $account->is_active && $rule->is_active)) {
            $errors['account_id'] = 'Choose an active account to run this rule.';
        } elseif ($rule->start_date < $account->opening_date->format('Y-m-d')) {
            $errors['start_date'] = 'Start date cannot precede the account opening date.';
        }
        if (! $category || $category->type !== $rule->type) {
            $errors['category_id'] = 'Choose one of your categories matching the entry type.';
        }
        if ($rule->end_date && $rule->end_date < $rule->start_date) {
            $errors['end_date'] = 'End date cannot precede start date.';
        }
        if ($errors) {
            throw ValidationException::withMessages($errors);
        }
        // New rules can catch up from a past start. Edits/resumes affect today onward.
        $from = $creating ? $rule->start_date : now($request->user()->timezone ?? 'UTC')->toDateString();
        if (! $creating && ! $rule->isDirty(['start_date', 'frequency'])) {
            $from = max($from, $rule->getOriginal('next_execution_date') ?? $from);
        }
        $rule->next_execution_date = RecurringSchedule::onOrAfter($rule, $from);
        if (! $rule->next_execution_date) {
            $rule->is_active = false;
        }
        $request->user()->recurringRules()->save($rule);

        return response()->json(['data' => $this->resource($rule)], $creating ? 201 : 200);
    }

    public function destroy(Request $request, string $recurring_rule)
    {
        $request->user()->recurringRules()->findOrFail($recurring_rule)->delete();

        return response()->noContent();
    }
}
