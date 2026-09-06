<?php

namespace App\Http\Controllers;

use App\Http\Resources\ActivityResource;
use App\Http\Resources\TransferResource;
use App\Models\Transfer;
use App\Services\ActivityBrowser;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TransferController extends Controller
{
    public function index(Request $request)
    {
        return ActivityResource::collection(ActivityBrowser::page($request, 'transfers'));
    }

    public function show(Request $request, string $transfer)
    {
        return new TransferResource($request->user()->transfers()->findOrFail($transfer));
    }

    public function store(Request $request)
    {
        $transfer = $request->user()->transfers()->create($this->validated($request));

        return (new TransferResource($transfer))->response()->setStatusCode(201);
    }

    public function update(Request $request, string $transfer)
    {
        $transfer = $request->user()->transfers()->findOrFail($transfer);
        $transfer->update($this->validated($request, $transfer));

        return new TransferResource($transfer);
    }

    public function destroy(Request $request, string $transfer)
    {
        $request->user()->transfers()->findOrFail($transfer)->delete();

        return response()->noContent();
    }

    private function validated(Request $request, ?Transfer $transfer = null): array
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
