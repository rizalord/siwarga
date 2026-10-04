<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AnonymousSuggestion extends Model
{
    protected $fillable = ['content', 'status'];

    protected $attributes = ['status' => 'new'];
}
