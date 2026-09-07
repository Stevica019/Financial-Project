<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\MonthlyReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function show(Request $request)
    {
        $data = $request->validate(['month' => ['sometimes', 'required', 'date_format:Y-m', 'regex:/^[1-9][0-9]{3}-(0[1-9]|1[0-2])$/D']]);

        return DB::transaction(function () use ($request, $data) {
            $user = User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();

            return response()->json(MonthlyReport::summary($user, $data['month'] ?? now($user->timezone ?? 'UTC')->format('Y-m')));
        });
    }
}
