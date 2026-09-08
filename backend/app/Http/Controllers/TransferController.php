<?php

namespace App\Http\Controllers;

use App\Http\Resources\ActivityResource;
use App\Http\Resources\TransferResource;
use App\Services\ActivityBrowser;
use App\Services\ActivityValidation;
use Illuminate\Http\Request;

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
        $transfer = $request->user()->transfers()->create(ActivityValidation::transfer($request));

        return (new TransferResource($transfer))->response()->setStatusCode(201);
    }

    public function update(Request $request, string $transfer)
    {
        $transfer = $request->user()->transfers()->findOrFail($transfer);
        $transfer->update(ActivityValidation::transfer($request, $transfer));

        return new TransferResource($transfer);
    }

    public function destroy(Request $request, string $transfer)
    {
        $request->user()->transfers()->findOrFail($transfer)->delete();

        return response()->noContent();
    }
}
