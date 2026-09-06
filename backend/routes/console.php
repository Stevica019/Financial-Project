<?php

use App\Services\RecurringProcessor;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('finance:process-recurring {--limit=100 : Maximum occurrences per run}', function () {
    $limit = filter_var($this->option('limit'), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 10000]]);
    if ($limit === false) {
        $this->error('Limit must be between 1 and 10000.');

        return 1;
    }
    $count = app(RecurringProcessor::class)->run($limit);
    $this->info("Processed {$count} recurring occurrences.");

    return 0;
})->purpose('Generate due recurring income and expenses safely');

Schedule::command('finance:process-recurring')->everyMinute()->withoutOverlapping(10);
