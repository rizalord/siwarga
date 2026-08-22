<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventDocumentation extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'event_documentation';

    protected $fillable = ['event_id', 'media_type', 'file_path', 'caption'];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }
}
