<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinanceWriteLock
{
    public function handle(Request $request, Closure $next)
    {
        if ($request->isMethodSafe()) {
            return $next($request);
        }

        // Serialize each owner's writes so reference checks and activity writes agree.
        return DB::transaction(function () use ($request, $next) {
            User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();

            return $next($request);
        });
    }
}
