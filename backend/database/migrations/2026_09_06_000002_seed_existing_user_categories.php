<?php

use App\Services\DefaultCategories;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->select('id')->chunkById(100, function ($users) {
            foreach ($users as $user) {
                DefaultCategories::seed($user->id);
            }
        });
    }

    public function down(): void
    {
        // Keep user-owned categories; they may have been edited or referenced since seeding.
    }
};
