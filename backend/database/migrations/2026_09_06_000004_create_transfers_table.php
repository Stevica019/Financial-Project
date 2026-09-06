<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('source_account_id')->constrained('accounts')->restrictOnDelete();
            $table->foreignId('destination_account_id')->constrained('accounts')->restrictOnDelete();
            $table->bigInteger('amount');
            $table->date('date');
            $table->string('description', 255)->nullable();
            $table->timestamps();
            $table->index(['user_id', 'date', 'id']);
            $table->index(['source_account_id', 'date']);
            $table->index(['destination_account_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transfers');
    }
};
