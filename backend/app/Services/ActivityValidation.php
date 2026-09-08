<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\Transfer;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ActivityValidation
{
    public static function transaction(Request $request, ?Transaction $entry = null): array
    {
        $required = $entry ? 'sometimes' : 'required';
        $data = $request->validate([
            'account_id' => [$required, 'required', 'integer'],
            'category_id' => [$required, 'required', 'integer'],
            'type' => [$required, 'required', Rule::in(['income', 'expense'])],
            'amount' => [$required, 'required', 'string', 'regex:'.Money::INPUT_PATTERN],
            'date' => [$required, 'required', 'date_format:Y-m-d', 'before_or_equal:'.now($request->user()->timezone ?? 'UTC')->toDateString()],
            'description' => [$required, 'required', 'string', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ], ['amount.regex' => 'Enter a positive amount with a dot and at most two decimal places (up to 12 whole-number digits).']);
        if (isset($data['amount'])) {
            $data['amount'] = Money::toMinor($data['amount']);
            if ($data['amount'] <= 0) {
                throw ValidationException::withMessages(['amount' => 'Amount must be greater than zero.']);
            }
        }
        $account = $request->user()->accounts()->find($data['account_id'] ?? $entry?->account_id);
        $category = $request->user()->categories()->find($data['category_id'] ?? $entry?->category_id);
        $errors = [];
        if (! $account) {
            $errors['account_id'] = 'Choose one of your accounts.';
        } elseif (! $account->is_active && $account->id !== $entry?->account_id) {
            $errors['account_id'] = 'New activity cannot be added to an archived account.';
        } elseif (($data['date'] ?? $entry?->date->format('Y-m-d')) < $account->opening_date->format('Y-m-d')) {
            $errors['date'] = 'Activity cannot be earlier than the account opening date.';
        }
        if (! $category || $category->type !== ($data['type'] ?? $entry?->type)) {
            $errors['category_id'] = 'Choose one of your categories matching the entry type.';
        }
        if ($errors) {
            throw ValidationException::withMessages($errors);
        }

        return $data;
    }

    public static function transfer(Request $request, ?Transfer $transfer = null): array
    {
        $required = $transfer ? 'sometimes' : 'required';
        $data = $request->validate([
            'source_account_id' => [$required, 'required', 'integer'],
            'destination_account_id' => [$required, 'required', 'integer'],
            'amount' => [$required, 'required', 'string', 'regex:'.Money::INPUT_PATTERN],
            'date' => [$required, 'required', 'date_format:Y-m-d', 'before_or_equal:'.now($request->user()->timezone ?? 'UTC')->toDateString()],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
        ], ['amount.regex' => 'Enter a positive amount with a dot and at most two decimal places (up to 12 whole-number digits).']);
        if (isset($data['amount'])) {
            $data['amount'] = Money::toMinor($data['amount']);
            if ($data['amount'] <= 0) {
                throw ValidationException::withMessages(['amount' => 'Amount must be greater than zero.']);
            }
        }
        $errors = [];
        foreach (['source_account_id', 'destination_account_id'] as $field) {
            $account = $request->user()->accounts()->find($data[$field] ?? $transfer?->$field);
            if (! $account) {
                $errors[$field] = 'Choose one of your accounts.';
            } elseif (! $account->is_active && $account->id !== $transfer?->$field) {
                $errors[$field] = 'New activity cannot be added to an archived account.';
            } elseif (($data['date'] ?? $transfer?->date->format('Y-m-d')) < $account->opening_date->format('Y-m-d')) {
                $errors['date'] = 'Transfer date cannot be earlier than either account opening date.';
            }
        }
        if (($data['source_account_id'] ?? $transfer?->source_account_id) == ($data['destination_account_id'] ?? $transfer?->destination_account_id)) {
            $errors['destination_account_id'] = 'Choose a different destination account.';
        }
        if ($errors) {
            throw ValidationException::withMessages($errors);
        }

        return $data;
    }
}
