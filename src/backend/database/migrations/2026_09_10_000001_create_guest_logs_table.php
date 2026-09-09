<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guest_logs', function (Blueprint $table) {
            $table->id();
            $table->string('guest_name', 100);
            $table->string('purpose', 255)->nullable();
            $table->foreignId('house_id')->constrained('houses');
            $table->string('plate_number', 20)->nullable();
            $table->foreignId('registered_by')->nullable()->constrained('users');
            $table->string('qr_token', 64)->nullable()->unique();
            $table->date('visit_date')->nullable();
            $table->string('status', 20)->default('registered');
            $table->dateTime('checked_in_at')->nullable();
            $table->dateTime('checked_out_at')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->softDeletes();
            $table->index(['house_id', 'visit_date'], 'guest_logs_house_visit');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guest_logs');
    }
};
