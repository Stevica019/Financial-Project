<?php

namespace App\Http\Controllers;

use App\Http\Resources\ActivityResource;
use App\Http\Resources\TransactionResource;
use App\Services\ActivityBrowser;
use App\Services\ActivityValidation;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        return ActivityResource::collection(ActivityBrowser::page($request));
    }

    public function history(Request $request, string $account)
    {
        $account = $request->user()->accounts()->findOrFail($account);

        return ActivityResource::collection(ActivityBrowser::page($request, 'history', $account->id));
    }

    public function show(Request $request, string $transaction)
    {
        return new TransactionResource($request->user()->transactions()->with(['account', 'category'])->findOrFail($transaction));
    }

    public function store(Request $request)
    {
        $entry = $request->user()->transactions()->create(ActivityValidation::transaction($request));

        return (new TransactionResource($entry->load(['account', 'category'])))->response()->setStatusCode(201);
    }

    public function update(Request $request, string $transaction)
    {
        $entry = $request->user()->transactions()->findOrFail($transaction);
        $entry->update(ActivityValidation::transaction($request, $entry));

        return new TransactionResource($entry->load(['account', 'category']));
    }

    public function destroy(Request $request, string $transaction)
    {
        $request->user()->transactions()->findOrFail($transaction)->delete();

        return response()->noContent();
    }
}
