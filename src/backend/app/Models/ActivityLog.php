<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    protected $fillable = [
        'user_id', 'action', 'subject_type', 'subject_id',
        'description', 'changes', 'ip_address', 'user_agent', 'url',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'changes' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Record an activity for the currently authenticated user (if any).
     *
     * @param  array<string, mixed>  $changes
     */
    public static function record(string $action, string $description, ?Model $subject = null, array $changes = [], ?int $actorId = null, ?string $url = null): self
    {
        $request = request();

        return static::create([
            'user_id' => $actorId ?? auth()->id(),
            'action' => $action,
            'subject_type' => $subject ? class_basename($subject) : null,
            'subject_id' => $subject?->getKey(),
            'description' => $description,
            'changes' => $changes ?: null,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'url' => $url ?? $request?->header('referer'),
        ]);
    }
}
