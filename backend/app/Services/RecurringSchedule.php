<?php

namespace App\Services;

use App\Models\RecurringRule;
use Carbon\CarbonImmutable;

class RecurringSchedule
{
    public static function onOrAfter(RecurringRule $rule, string $date): ?string
    {
        $anchor = CarbonImmutable::parse($rule->start_date, 'UTC')->startOfDay();
        $target = CarbonImmutable::parse(max($date, $rule->start_date), 'UTC')->startOfDay();
        $offset = match ($rule->frequency) {
            'daily' => (int) $anchor->diffInDays($target),
            'weekly' => intdiv((int) $anchor->diffInDays($target), 7),
            'monthly' => ($target->year - $anchor->year) * 12 + $target->month - $anchor->month,
            'yearly' => $target->year - $anchor->year,
        };
        do {
            $candidate = match ($rule->frequency) {
                'daily' => $anchor->addDays($offset),
                'weekly' => $anchor->addWeeks($offset),
                'monthly' => $anchor->addMonthsNoOverflow($offset),
                'yearly' => $anchor->addYearsNoOverflow($offset),
            };
            $offset++;
        } while ($candidate->lt($target));
        $result = $candidate->toDateString();

        return $candidate->year > 9999 || ($rule->end_date && $result > $rule->end_date) ? null : $result;
    }
}
