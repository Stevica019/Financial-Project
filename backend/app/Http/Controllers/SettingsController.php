<?php

namespace App\Http\Controllers;

use App\Models\User;
use DateTimeZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user(),
            'currencies' => config('finance.currencies'),
            'timezones' => DateTimeZone::listIdentifiers(),
            'account_types' => config('finance.account_types'),
            'today' => now($request->user()->timezone ?? 'UTC')->toDateString(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'currency' => ['required', Rule::in(config('finance.currencies'))],
            'timezone' => ['required', 'string', Rule::in(DateTimeZone::listIdentifiers())],
        ]);
        $user = DB::transaction(function () use ($request, $data) {
            $user = User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            if ($user->currency_locked && $data['currency'] !== $user->currency) {
                throw ValidationException::withMessages(['currency' => 'Currency cannot change after your first account is created.']);
            }
            if ($data['currency'] !== $user->currency && $user->savingsGoals()->exists()) {
                throw ValidationException::withMessages(['currency' => 'Currency cannot change while savings goals exist.']);
            }
            $user->currency = $data['currency'];
            $user->timezone = $data['timezone'];
            $user->save();

            return $user;
        });

        return response()->json($user);
    }
}
