<?php

namespace App\Services;

use App\Models\User;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ActivityCsv
{
    public const HEADER = ['type', 'date', 'amount', 'currency', 'account_id', 'category_id', 'source_account_id', 'destination_account_id', 'description', 'notes', 'account_name', 'category_name', 'source_account_name', 'destination_account_name'];

    // Prefix formula-like text and existing apostrophes so our importer can reverse it exactly.
    public static function safeText(?string $value): string
    {
        $value ??= '';

        return preg_match('/^(?:\s*[=+@\-]|[\t\r\n\x00-\x1f]|\')/u', $value) ? "'".$value : $value;
    }

    public static function row(object $row, string $currency): array
    {
        return array_map(fn ($field) => match ($field) {
            'amount' => Money::decimal((int) $row->amount),
            'currency' => $currency,
            'description', 'notes', 'account_name', 'category_name', 'source_account_name', 'destination_account_name' => self::safeText($row->$field),
            default => $row->$field ?? '',
        }, self::HEADER);
    }

    public static function parse(string $contents): array
    {
        if (! mb_check_encoding($contents, 'UTF-8') || str_contains($contents, "\0")) {
            throw ValidationException::withMessages(['file' => 'Choose a UTF-8 CSV file without null bytes.']);
        }
        $stream = fopen('php://temp', 'r+');
        fwrite($stream, preg_replace('/^\xEF\xBB\xBF/', '', $contents));
        rewind($stream);
        try {
            $header = fgetcsv($stream, null, ',', '"', '');
            if ($header !== self::HEADER) {
                throw ValidationException::withMessages(['file' => 'The columns must match the downloadable CSV template, in the same order.']);
            }
            $rows = [];
            while (($values = fgetcsv($stream, null, ',', '"', '')) !== false) {
                if ($values === [null]) {
                    continue;
                }
                if (count($rows) >= 1000 || count($values) !== count($header)) {
                    throw ValidationException::withMessages(['file' => 'Use at most 1000 records and the same number of columns on every row.']);
                }
                $row = array_combine($header, $values);
                foreach (['description', 'notes', 'account_name', 'category_name', 'source_account_name', 'destination_account_name'] as $field) {
                    if (str_starts_with($row[$field], "'") && self::safeText(substr($row[$field], 1)) === $row[$field]) {
                        $row[$field] = substr($row[$field], 1);
                    }
                }
                $rows[] = $row;
            }
            if (! $rows) {
                throw ValidationException::withMessages(['file' => 'The file contains no activity to import.']);
            }

            return $rows;
        } finally {
            fclose($stream);
        }
    }

    public static function validateRows(User $user, array $rows): array
    {
        $validated = [];
        $errors = [];
        foreach ($rows as $index => $row) {
            try {
                if (! $user->currency || $row['currency'] !== $user->currency) {
                    throw ValidationException::withMessages(['currency' => 'Currency must match your settings.']);
                }
                $transfer = $row['type'] === 'transfer';
                $fields = $transfer ? ['source_account_id', 'destination_account_id', 'amount', 'date', 'description'] : ['account_id', 'category_id', 'type', 'amount', 'date', 'description', 'notes'];
                $unused = $transfer ? ['account_id', 'category_id', 'notes'] : ['source_account_id', 'destination_account_id'];
                foreach ($unused as $field) {
                    if ($row[$field] !== '') {
                        throw ValidationException::withMessages([$field => 'Leave this column blank for this activity type.']);
                    }
                }
                $request = Request::create('/', 'POST', array_intersect_key($row, array_flip($fields)));
                $request->setUserResolver(fn () => $user);
                $data = $transfer ? ActivityValidation::transfer($request) : ActivityValidation::transaction($request);
                if (array_key_exists('notes', $data) && $data['notes'] === '') {
                    $data['notes'] = null;
                }
                if ($transfer && $data['description'] === '') {
                    $data['description'] = null;
                }
                $validated[] = ['kind' => $transfer ? 'transfer' : 'transaction', 'data' => $data];
            } catch (ValidationException $exception) {
                foreach ($exception->errors() as $field => $messages) {
                    $errors['row_'.($index + 2).'.'.$field] = $messages;
                }
                if (count($errors) >= 50) {
                    break;
                }
            }
        }
        if ($errors) {
            throw ValidationException::withMessages($errors);
        }

        return $validated;
    }
}
