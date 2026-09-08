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
        Schema::create('residents', function (Blueprint $table) {
            $table->id();
            $table->string('full_name', 150);
            $table->string('ktp_photo_path', 255)->nullable();
            $table->enum('status', ['kontrak', 'tetap']);
            $table->string('phone_number', 20)->nullable();
            $table->enum('marital_status', ['menikah', 'belum_menikah']);
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('residents');
    }
};
