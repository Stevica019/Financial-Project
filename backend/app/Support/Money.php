<?php

namespace App\Support;

use InvalidArgumentException;

class Money
{
    public const INPUT_PATTERN = '/^-?\d{1,12}(?:\.\d{1,2})?$/D';

    public static function toMinor(string $amount): int
    {
        if (! preg_match(self::INPUT_PATTERN, $amount)) {
            throw new InvalidArgumentException('Invalid money amount.');
        }
        $negative = str_starts_with($amount, '-');
        [$whole, $fraction] = array_pad(explode('.', ltrim($amount, '-')), 2, '');
        $minor = ((int) $whole * 100) + (int) str_pad($fraction, 2, '0');

        return $negative ? -$minor : $minor;
    }

    public static function decimal(int $minor): string
    {
        return ($minor < 0 ? '-' : '').intdiv(abs($minor), 100).'.'.str_pad((string) (abs($minor) % 100), 2, '0', STR_PAD_LEFT);
    }
}
