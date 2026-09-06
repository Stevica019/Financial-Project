<?php

namespace Tests\Feature;

use Symfony\Component\Process\Process;
use Tests\TestCase;

class RecurringConcurrencyTest extends TestCase
{
    public function test_two_workers_generate_each_occurrence_once_on_a_shared_database(): void
    {
        $database = tempnam(sys_get_temp_dir(), 'finance-recurring-');
        $env = ['APP_ENV' => 'testing', 'APP_CONFIG_CACHE' => $database.'.config.php', 'DB_CONNECTION' => 'sqlite', 'DB_DATABASE' => $database, 'DB_URL' => '', 'CACHE_STORE' => 'array', 'SESSION_DRIVER' => 'array'];
        $workers = [];
        $bootstrap = 'require "vendor/autoload.php"; $app = require "bootstrap/app.php"; $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap(); ';
        try {
            (new Process([PHP_BINARY, 'artisan', 'migrate', '--force', '--no-interaction'], base_path(), $env))->mustRun();
            $seed = <<<'PHP'
                $user = App\Models\User::factory()->create(['currency' => 'EUR', 'timezone' => 'UTC']);
                $account = $user->accounts()->create(['name' => 'Bank', 'type' => 'checking', 'opening_balance' => 0, 'opening_date' => '2024-01-01', 'is_active' => true]);
                $category = $user->categories()->create(['name' => 'Pay', 'name_key' => 'pay', 'type' => 'income']);
                $user->recurringRules()->create(['account_id' => $account->id, 'category_id' => $category->id, 'type' => 'income', 'amount' => 101, 'description' => 'Pay', 'frequency' => 'daily', 'start_date' => '2024-01-01', 'next_execution_date' => '2024-01-01', 'end_date' => '2024-02-29', 'is_active' => true]);
                PHP;
            (new Process([PHP_BINARY, '-r', $bootstrap.$seed], base_path(), $env))->mustRun();
            $workers = [new Process([PHP_BINARY, 'artisan', 'finance:process-recurring'], base_path(), $env), new Process([PHP_BINARY, 'artisan', 'finance:process-recurring'], base_path(), $env)];
            foreach ($workers as $worker) {
                $worker->start();
            }
            foreach ($workers as $worker) {
                $worker->wait();
                $this->assertTrue($worker->isSuccessful(), $worker->getOutput().$worker->getErrorOutput());
            }
            $verify = new Process([PHP_BINARY, '-r', $bootstrap.'echo json_encode([App\Models\Transaction::count(), Illuminate\Support\Facades\DB::table("recurring_occurrences")->count(), App\Models\Transaction::sum("amount"), App\Models\RecurringRule::first()->next_execution_date]);'], base_path(), $env);
            $verify->mustRun();
            $this->assertEquals([60, 60, 6060, null], json_decode($verify->getOutput(), true));
            (new Process([PHP_BINARY, 'artisan', 'migrate:rollback', '--step=1', '--force', '--no-interaction'], base_path(), $env))->mustRun();
            $preserved = new Process([PHP_BINARY, '-r', $bootstrap.'echo App\Models\Transaction::count();'], base_path(), $env);
            $preserved->mustRun();
            $this->assertSame('60', $preserved->getOutput());
            (new Process([PHP_BINARY, 'artisan', 'migrate', '--force', '--no-interaction'], base_path(), $env))->mustRun();
        } finally {
            foreach ($workers as $worker) {
                if ($worker->isRunning()) {
                    $worker->stop();
                }
            }
            foreach ([$database, $database.'-wal', $database.'-shm', $database.'-journal'] as $file) {
                if (is_file($file)) {
                    unlink($file);
                }
            }
        }
    }
}
