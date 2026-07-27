<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('bills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('house_id')->constrained();
            $table->foreignId('resident_id')->constrained();
            $table->foreignId('due_type_id')->constrained();
            $table->date('period_start');
            $table->date('period_end');
            $table->decimal('amount_due', 12, 2);
            $table->enum('status', ['lunas', 'belum_lunas'])->default('belum_lunas');
            $table->timestamp('generated_at')->nullable();
            $table->foreignId('generated_by')->nullable()->constrained('users');
            $table->softDeletes();
            $table->timestamps();
            $table->unique(['house_id', 'due_type_id', 'period_start'], 'bills_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bills');
    }
};
