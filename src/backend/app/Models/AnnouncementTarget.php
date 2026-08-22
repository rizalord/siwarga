<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnnouncementTarget extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'announcement_targets';

    protected $fillable = ['announcement_id', 'house_id'];

    public function announcement(): BelongsTo
    {
        return $this->belongsTo(Announcement::class);
    }

    public function house(): BelongsTo
    {
        return $this->belongsTo(House::class);
    }
}
