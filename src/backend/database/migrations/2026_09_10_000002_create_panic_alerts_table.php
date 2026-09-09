<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('panic_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reporter_id')->constrained('users');
            $table->foreignId('house_id')->nullable()->constrained('houses');
            $table->string('location_note', 255)->nullable();
            $table->text('note')->nullable();
            $table->string('status', 20)->default('active');
            $table->foreignId('handler_id')->nullable()->constrained('users');
            $table->dateTime('handled_at')->nullable();
            $table->dateTime('resolved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['reporter_id', 'status'], 'panic_alerts_reporter_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('panic_alerts');
    }
};
