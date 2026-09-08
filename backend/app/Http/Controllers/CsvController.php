<?php

namespace App\Http\Controllers;

use App\Services\ActivityBrowser;
use App\Services\ActivityCsv;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CsvController extends Controller
{
    public function export(Request $request)
    {
        $options = $request->validate(['scope' => ['sometimes', Rule::in(['transactions', 'transfers', 'history'])], 'history_account_id' => ['sometimes', 'integer'], 'template' => ['sometimes', 'boolean']]);
        $accountId = isset($options['history_account_id']) ? $request->user()->accounts()->findOrFail($options['history_account_id'])->id : null;
        $query = ActivityBrowser::filtered($request, $options['scope'] ?? 'history', $accountId);

        return response()->streamDownload(function () use ($request, $query, $options) {
            $output = fopen('php://output', 'w');
            fwrite($output, "\xEF\xBB\xBF");
            fputcsv($output, ActivityCsv::HEADER, ',', '"', '', "\r\n");
            if (! ($options['template'] ?? false)) {
                foreach ($query->cursor() as $row) {
                    fputcsv($output, ActivityCsv::row($row, $request->user()->currency ?? ''), ',', '"', '', "\r\n");
                }
            }
            fclose($output);
        }, 'finance-activity.csv', ['Content-Type' => 'text/csv; charset=UTF-8', 'Cache-Control' => 'no-store']);
    }

    public function preview(Request $request)
    {
        $request->validate(['file' => ['required', 'file', 'max:2048']]);
        $contents = $request->file('file')->get();
        $rows = ActivityCsv::parse($contents);
        $validated = ActivityCsv::validateRows($request->user(), $rows);
        $token = (string) Str::uuid();
        $hash = hash('sha256', json_encode($rows, JSON_THROW_ON_ERROR));
        Cache::put('csv-preview:'.$request->user()->id.':'.$token, ['rows' => $rows, 'hash' => $hash], now()->addMinutes(30));
        $duplicates = 0;
        $seen = [];
        foreach ($validated as $row) {
            $key = json_encode($row);
            if (isset($seen[$key]) || $this->existing($request, $row)) {
                $duplicates++;
            }
            $seen[$key] = true;
        }

        return response()->json(['token' => $token, 'total' => count($rows), 'duplicates' => $duplicates, 'already_imported' => DB::table('csv_imports')->where('user_id', $request->user()->id)->where('file_hash', $hash)->exists(), 'rows' => array_slice($rows, 0, 20)]);
    }

    private function existing(Request $request, array $row): bool
    {
        $query = $row['kind'] === 'transfer' ? $request->user()->transfers() : $request->user()->transactions();
        foreach ($row['data'] as $field => $value) {
            if ($field === 'date') {
                $query->whereDate($field, $value);
            } elseif (in_array($field, ['description', 'notes']) && ($value === null || $value === '')) {
                $query->where(fn ($q) => $q->whereNull($field)->orWhere($field, ''));
            } else {
                $query->where($field, $value);
            }
        }

        return $query->exists();
    }

    public function store(Request $request)
    {
        // Keep the transaction inside the controller: Laravel's routing pipeline can
        // render exceptions into responses before the outer write-lock middleware sees them.
        return DB::transaction(fn () => $this->confirm($request));
    }

    private function confirm(Request $request)
    {
        $data = $request->validate(['token' => ['required', 'uuid']]);
        $preview = Cache::get('csv-preview:'.$request->user()->id.':'.$data['token']);
        if (! $preview) {
            throw ValidationException::withMessages(['file' => 'This preview expired or is unavailable. Choose the file and preview again.']);
        }
        // FinanceWriteLock serializes confirmation with all other writes by this user.
        $receipt = DB::table('csv_imports')->where('user_id', $request->user()->id)->where('file_hash', $preview['hash'])->first();
        if ($receipt) {
            return response()->json(['imported' => 0, 'skipped' => count($preview['rows']), 'already_imported' => true]);
        }
        $rows = ActivityCsv::validateRows($request->user(), $preview['rows']);
        $imported = 0;
        $skipped = 0;
        foreach ($rows as $row) {
            if ($this->existing($request, $row)) {
                $skipped++;

                continue;
            }
            $relation = $row['kind'] === 'transfer' ? $request->user()->transfers() : $request->user()->transactions();
            $relation->create($row['data']);
            $imported++;
        }
        DB::table('csv_imports')->insert(['user_id' => $request->user()->id, 'file_hash' => $preview['hash'], 'imported' => $imported, 'skipped' => $skipped, 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(compact('imported', 'skipped'));
    }
}
