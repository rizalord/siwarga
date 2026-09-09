<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bill_id')->constrained('bills');
            $table->foreignId('user_id')->constrained('users');
            $table->string('provider', 30);
            $table->string('channel', 30);
            $table->decimal('amount', 12, 2);
            $table->string('status', 30)->default('pending');
            $table->string('reference', 100)->unique();
            $table->string('idempotency_key', 100)->unique();
            $table->string('pay_code', 255)->nullable();
            $table->dateTime('expires_at')->nullable();
            $table->string('proof_path', 255)->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users');
            $table->dateTime('verified_at')->nullable();
            $table->string('rejection_reason', 255)->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['user_id', 'status'], 'payment_trx_user_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_transactions');
    }
};
