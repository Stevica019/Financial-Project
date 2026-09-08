<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('csv_imports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('file_hash', 64);
            $table->unsignedInteger('imported');
            $table->unsignedInteger('skipped');
            $table->timestamps();
            $table->unique(['user_id', 'file_hash']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('csv_imports');
    }
};
