<?php

namespace App\Http\Controllers;

use App\Http\Resources\AccountResource;
use App\Models\User;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AccountController extends Controller
{
    public function index(Request $request)
    {
        return AccountResource::collection($request->user()->accounts()->orderBy('name')->orderBy('id')->get());
    }

    public function show(Request $request, string $account)
    {
        return new AccountResource($request->user()->accounts()->findOrFail($account));
    }

    public function store(Request $request)
    {
        $account = DB::transaction(function () use ($request) {
            $user = User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            if (! $user->currency || ! $user->timezone) {
                throw ValidationException::withMessages(['currency' => 'Choose your currency and timezone in Settings before creating an account.']);
            }
            $data = $this->validated($request, $user, false);
            $account = $user->accounts()->create($data);
            $user->currency_locked = true;
            $user->save();

            return $account->fresh();
        });

        return (new AccountResource($account))->response()->setStatusCode(201);
    }

    public function update(Request $request, string $account)
    {
        $account = $request->user()->accounts()->findOrFail($account);
        $data = $this->validated($request, $request->user(), true);
        if (isset($data['opening_date']) && ($account->recurringRules()->where('start_date', '<', $data['opening_date'])->exists() || $account->transactions()->where('date', '<', $data['opening_date'])->exists() || $account->transfers()->where('date', '<', $data['opening_date'])->exists())) {
            throw ValidationException::withMessages(['opening_date' => 'Opening date cannot be later than existing activity.']);
        }
        $account->update($data);
        if (! $account->is_active) {
            $account->recurringRules()->update(['is_active' => false]);
        }

        return new AccountResource($account);
    }

    public function destroy(Request $request, string $account)
    {
        $account = $request->user()->accounts()->findOrFail($account);
        if ($account->recurringRules()->exists() || $account->transactions()->exists() || $account->transfers()->exists()) {
            throw ValidationException::withMessages(['account' => 'This account has activity. Archive it to preserve its history.']);
        }
        $account->delete();

        return response()->noContent();
    }

    private function validated(Request $request, User $user, bool $partial): array
    {
        $required = $partial ? 'sometimes' : 'required';
        $data = $request->validate([
            'name' => [$required, 'required', 'string', 'max:100'],
            'type' => [$required, 'required', Rule::in(config('finance.account_types'))],
            'opening_balance' => [$required, 'required', 'string', 'regex:'.Money::INPUT_PATTERN],
            'opening_date' => [$required, 'required', 'date_format:Y-m-d', 'before_or_equal:'.now($user->timezone ?? 'UTC')->toDateString()],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'is_active' => ['sometimes', 'boolean'],
        ], ['opening_balance.regex' => 'Enter an amount with a dot and at most two decimal places (up to 12 whole-number digits).']);
        if (isset($data['opening_balance'])) {
            $data['opening_balance'] = Money::toMinor($data['opening_balance']);
        }

        return $data;
    }
}
