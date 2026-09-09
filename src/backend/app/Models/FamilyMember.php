<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class FamilyMember extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'house_id', 'name', 'relationship', 'nik', 'birth_date', 'phone',
    ];

    protected function casts(): array
    {
        return ['birth_date' => 'date'];
    }

    public function house(): BelongsTo
    {
        return $this->belongsTo(House::class);
    }
}
