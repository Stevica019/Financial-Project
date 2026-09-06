<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->bigInteger('amount');
            $table->date('month');
            $table->timestamps();
            $table->unique(['user_id', 'category_id', 'month']);
        });
        Schema::create('recurring_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('account_id')->constrained()->restrictOnDelete();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->string('type', 10);
            $table->bigInteger('amount');
            $table->string('description');
            $table->text('notes')->nullable();
            $table->string('frequency', 10);
            $table->date('start_date');
            $table->date('next_execution_date')->nullable();
            $table->date('end_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['is_active', 'next_execution_date']);
        });
        // A durable receipt survives correction/deletion of the generated entry.
        Schema::create('recurring_occurrences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recurring_rule_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->unique(['recurring_rule_id', 'date']);
        });
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('recurring_rule_id')->nullable()->constrained()->nullOnDelete();
            $table->date('scheduled_date')->nullable();
            $table->unique(['recurring_rule_id', 'scheduled_date']);
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropUnique(['recurring_rule_id', 'scheduled_date']);
            $table->dropConstrainedForeignId('recurring_rule_id');
            $table->dropColumn('scheduled_date');
        });
        Schema::dropIfExists('recurring_occurrences');
        Schema::dropIfExists('recurring_rules');
        Schema::dropIfExists('budgets');
    }
};
