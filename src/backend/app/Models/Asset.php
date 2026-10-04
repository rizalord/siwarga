<?php

namespace App\Models;

use Database\Factories\AssetFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Asset extends Model
{
    /** @use HasFactory<AssetFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = ['name', 'quantity', 'condition'];

    /**
     * @return HasMany<AssetLoan, $this>
     */
    public function loans(): HasMany
    {
        return $this->hasMany(AssetLoan::class);
    }
}
