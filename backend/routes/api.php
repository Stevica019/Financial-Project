<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\RecurringRuleController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SavingsGoalController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\TransferController;
use App\Http\Middleware\FinanceWriteLock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));

Route::get('/user', function (Request $request) {
    return response()->json($request->user());
})->middleware('auth:sanctum');

Route::middleware(['auth:sanctum', FinanceWriteLock::class])->group(function () {
    Route::apiResource('savings-goals', SavingsGoalController::class)->except(['show']);
    Route::get('/reports', [ReportController::class, 'show']);
    Route::apiResource('budgets', BudgetController::class)->except(['show']);
    Route::apiResource('recurring-rules', RecurringRuleController::class)->except(['show']);
    Route::get('/dashboard', [DashboardController::class, 'show']);
    Route::get('/settings', [SettingsController::class, 'show']);
    Route::put('/settings', [SettingsController::class, 'update']);
    Route::apiResource('accounts', AccountController::class);
    Route::apiResource('categories', CategoryController::class);
    Route::get('accounts/{account}/history', [TransactionController::class, 'history']);
    Route::apiResource('transactions', TransactionController::class);
    Route::apiResource('transfers', TransferController::class);
});
