<?php

namespace App\Models;

use Database\Factories\AnnouncementTargetFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnnouncementTarget extends Model
{
    /** @use HasFactory<AnnouncementTargetFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $table = 'announcement_targets';

    protected $fillable = ['announcement_id', 'house_id'];

    /**
     * @return BelongsTo<Announcement, $this>
     */
    public function announcement(): BelongsTo
    {
        return $this->belongsTo(Announcement::class);
    }

    /**
     * @return BelongsTo<House, $this>
     */
    public function house(): BelongsTo
    {
        return $this->belongsTo(House::class);
    }
}
