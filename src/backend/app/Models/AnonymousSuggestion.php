<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AnonymousSuggestion extends Model
{
    use HasFactory;

    protected $fillable = ['content', 'status'];

    protected $attributes = ['status' => 'new'];
}
