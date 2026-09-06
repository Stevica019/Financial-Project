<?php

namespace App\Http\Controllers;

use App\Http\Resources\TransactionResource;
use App\Models\Transaction;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        return TransactionResource::collection($request->user()->transactions()->with(['account', 'category'])->orderByDesc('date')->orderByDesc('id')->get());
    }

    public function history(Request $request, string $account)
    {
        $account = $request->user()->accounts()->findOrFail($account);

        return TransactionResource::collection($account->transactions()->with(['account', 'category'])->orderByDesc('date')->orderByDesc('id')->get());
    }

    public function show(Request $request, string $transaction)
    {
        return new TransactionResource($request->user()->transactions()->with(['account', 'category'])->findOrFail($transaction));
    }

    public function store(Request $request)
    {
        $entry = $request->user()->transactions()->create($this->validated($request));

        return (new TransactionResource($entry->load(['account', 'category'])))->response()->setStatusCode(201);
    }

    public function update(Request $request, string $transaction)
    {
        $entry = $request->user()->transactions()->findOrFail($transaction);
        $entry->update($this->validated($request, $entry));

        return new TransactionResource($entry->load(['account', 'category']));
    }

    public function destroy(Request $request, string $transaction)
    {
        $request->user()->transactions()->findOrFail($transaction)->delete();

        return response()->noContent();
    }

    private function validated(Request $request, ?Transaction $entry = null): array
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
}
