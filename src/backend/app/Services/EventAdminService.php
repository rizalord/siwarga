<?php

namespace App\Services;

use App\Models\Event;
use App\Models\EventDocumentation;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class EventAdminService
{
    public function __construct(private HtmlSanitizer $htmlSanitizer) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, User $user): Event
    {
        if (array_key_exists('description', $data) && $data['description'] !== null) {
            $data['description'] = $this->htmlSanitizer->sanitize($data['description']);
        }

        $data['slug'] = $this->uniqueSlug($data['title']);
        $data['created_by'] = $user->id;

        return Event::create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Event $event, array $data): Event
    {
        if (array_key_exists('description', $data) && $data['description'] !== null) {
            $data['description'] = $this->htmlSanitizer->sanitize($data['description']);
        }

        if (array_key_exists('title', $data) && $data['title'] !== $event->title) {
            $data['slug'] = $this->uniqueSlug($data['title'], $event->id);
        }

        $event->update($data);

        return $event->fresh('documentation');
    }

    public function addDocumentation(Event $event, UploadedFile $file, string $mediaType, ?string $caption): EventDocumentation
    {
        if ($event->documentation()->count() >= 5) {
            throw ValidationException::withMessages(['photo' => ['Maksimal 5 dokumentasi per kegiatan.']]);
        }

        return $event->documentation()->create([
            'media_type' => $mediaType,
            'file_path' => $file->store('event-documentation', 'public'),
            'caption' => $caption,
        ]);
    }

    private function uniqueSlug(string $title, ?int $exceptId = null): string
    {
        $base = Str::slug($title);
        $slug = $base;
        $suffix = 2;

        while (Event::withTrashed()->where('slug', $slug)->when($exceptId, fn ($query) => $query->where('id', '!=', $exceptId))->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
