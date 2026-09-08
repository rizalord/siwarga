<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Announcement extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['title', 'slug', 'content', 'category', 'is_public', 'published_at', 'created_by'];

    protected $casts = [
        'is_public' => 'boolean',
        'published_at' => 'datetime',
    ];

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function targets(): HasMany
    {
        return $this->hasMany(AnnouncementTarget::class);
    }

    public function reads(): HasMany
    {
        return $this->hasMany(AnnouncementRead::class);
    }

    /**
     * Published announcements visible to the given user: broadcasts plus
     * those targeted at the user's current houses. Holders of
     * announcements.manage (admin) bypass the target filter.
     */
    public function scopeVisibleToWarga(Builder $query, User $user): Builder
    {
        $query->whereNotNull('published_at');

        if ($user->hasPermission('announcements.manage')) {
            return $query;
        }

        $houseIds = HouseResident::where('resident_id', $user->resident_id)
            ->whereNull('end_date')
            ->pluck('house_id');

        return $query->where(function (Builder $q) use ($houseIds): void {
            $q->whereDoesntHave('targets')
                ->orWhereHas('targets', fn (Builder $t) => $t->whereIn('house_id', $houseIds));
        });
    }
}
