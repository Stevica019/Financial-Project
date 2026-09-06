<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\FinancialDashboard;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function show(Request $request)
    {
        $data = $request->validate(['month' => ['sometimes', 'required', 'date_format:Y-m', 'regex:/^[1-9][0-9]{3}-(0[1-9]|1[0-2])$/D']]);

        // Share the writers' per-owner lock so all dashboard sections describe the same activity.
        return DB::transaction(function () use ($request, $data) {
            $user = User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $month = $data['month'] ?? now($user->timezone ?? 'UTC')->format('Y-m');

            return response()->json(FinancialDashboard::summary($user, $month));
        });
    }
}
