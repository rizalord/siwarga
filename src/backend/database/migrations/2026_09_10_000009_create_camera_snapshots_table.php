<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('camera_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('camera_id')->constrained('cameras');
            $table->string('file_path', 255);
            $table->string('mime', 50);
            $table->unsignedBigInteger('size_bytes');
            $table->string('event_type', 20)->default('motion');
            $table->dateTime('captured_at')->nullable();
            $table->string('source_hash', 64)->unique();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['camera_id', 'captured_at'], 'snapshots_camera_captured');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('camera_snapshots');
    }
};
