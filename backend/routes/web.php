<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Authentication always uses the web session and CSRF middleware.
Route::prefix('api')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:registration');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
});
