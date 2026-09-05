<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));

Route::get('/user', function (Request $request) {
    return response()->json($request->user());
})->middleware('auth:sanctum');
