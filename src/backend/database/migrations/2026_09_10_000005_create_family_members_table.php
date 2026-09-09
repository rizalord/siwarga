<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('family_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('house_id')->constrained('houses');
            $table->string('name', 100);
            $table->string('relationship', 30);
            $table->string('nik', 20)->nullable();
            $table->date('birth_date')->nullable();
            $table->string('phone', 30)->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['house_id', 'relationship'], 'family_members_house_relation');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('family_members');
    }
};
