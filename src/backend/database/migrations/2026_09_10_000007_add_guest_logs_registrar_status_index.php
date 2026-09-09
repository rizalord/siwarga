<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('guest_logs', function (Blueprint $table) {
            $table->index(['registered_by', 'status'], 'guest_logs_registrar_status');
        });
    }

    public function down(): void
    {
        Schema::table('guest_logs', fn (Blueprint $table) => $table->dropIndex('guest_logs_registrar_status'));
    }
};
