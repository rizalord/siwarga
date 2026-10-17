<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('camera_access_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('snapshot_id')->constrained('camera_snapshots');
            $table->foreignId('user_id')->constrained('users');
            $table->dateTime('viewed_at')->useCurrent();
            $table->index(['snapshot_id', 'user_id'], 'access_snapshot_user');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('camera_access_logs');
    }
};
