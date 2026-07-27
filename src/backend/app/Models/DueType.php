<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DueType extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['name', 'amount', 'billing_cycle'];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'billing_cycle' => 'string',
        ];
    }
}
