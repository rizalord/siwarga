<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_loans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained('assets');
            $table->foreignId('borrowed_by')->constrained('users');
            $table->integer('quantity')->default(1);
            $table->string('status', 20)->default('pending');
            $table->timestamp('borrowed_at')->nullable();
            $table->timestamp('returned_at')->nullable();
            $table->timestamps();
            $table->index(['asset_id', 'status'], 'asset_loans_schedule');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_loans');
    }
};
