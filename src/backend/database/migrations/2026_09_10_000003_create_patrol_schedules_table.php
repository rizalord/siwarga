<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patrol_schedules', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('shift', 20);
            $table->string('personnel_name', 100);
            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->string('area', 100)->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['date', 'shift'], 'patrol_schedules_date_shift');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patrol_schedules');
    }
};
