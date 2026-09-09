<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('facility_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('facility_id')->constrained('facilities');
            $table->foreignId('booked_by')->constrained('users');
            $table->foreignId('event_id')->nullable()->constrained('events');
            $table->dateTime('start_at');
            $table->dateTime('end_at');
            $table->string('status', 20)->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->index(['facility_id', 'start_at', 'end_at'], 'facility_bookings_schedule');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facility_bookings');
    }
};
