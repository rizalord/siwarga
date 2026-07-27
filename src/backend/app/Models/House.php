<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class House extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['house_number', 'address', 'status'];

    protected function casts(): array
    {
        return ['status' => 'string'];
    }

    public function residents()
    {
        return $this->belongsToMany(Resident::class, 'house_residents')
            ->withPivot(['start_date', 'end_date'])
            ->withTimestamps();
    }

    public function currentResident()
    {
        return $this->belongsToMany(Resident::class, 'house_residents')
            ->withPivot(['start_date', 'end_date'])
            ->wherePivotNull('end_date');
    }

    public function houseResidents()
    {
        return $this->hasMany(HouseResident::class);
    }
}
