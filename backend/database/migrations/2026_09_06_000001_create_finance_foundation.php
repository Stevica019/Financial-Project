<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('currency', 3)->nullable();
            $table->string('timezone', 100)->nullable();
            $table->boolean('currency_locked')->default(false);
        });
        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('name', 100);
            $table->string('type', 30);
            $table->bigInteger('opening_balance');
            $table->date('opening_date');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['user_id', 'is_active']);
        });
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('name', 100);
            $table->string('name_key', 100);
            $table->string('type', 10);
            $table->timestamps();
            $table->unique(['user_id', 'type', 'name_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
        Schema::dropIfExists('accounts');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn(['currency', 'timezone', 'currency_locked']));
    }
};
