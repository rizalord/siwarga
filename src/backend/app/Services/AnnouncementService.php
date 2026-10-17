<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\User;
use Illuminate\Support\Str;

class AnnouncementService
{
    public function __construct(private HtmlSanitizer $htmlSanitizer) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, User $user): Announcement
    {
        $data['content'] = $this->htmlSanitizer->sanitizeValue($data['content']);
        $data['slug'] = $this->generateUniqueSlug(is_string($data['title']) ? $data['title'] : '');
        $data['created_by'] = $user->id;

        $targetHouseIds = IdList::from($data['target_house_ids'] ?? []);
        unset($data['target_house_ids']);

        $announcement = Announcement::create($data);
        $this->syncTargets($announcement, $targetHouseIds);

        return $announcement->refresh()->load('targets');
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Announcement $announcement, array $data): Announcement
    {
        if (array_key_exists('content', $data)) {
            $data['content'] = $this->htmlSanitizer->sanitizeValue($data['content']);
        }

        if (array_key_exists('title', $data) && $data['title'] !== $announcement->title) {
            $data['slug'] = $this->generateUniqueSlug(is_string($data['title']) ? $data['title'] : '', $announcement->id);
        }

        $targetHouseIds = null;
        if (array_key_exists('target_house_ids', $data)) {
            $targetHouseIds = IdList::from($data['target_house_ids']);
            unset($data['target_house_ids']);
        }

        $announcement->update($data);

        if ($targetHouseIds !== null) {
            $this->syncTargets($announcement, $targetHouseIds);
        }

        return $announcement->refresh()->load('targets');
    }

    public function delete(Announcement $announcement): void
    {
        $announcement->delete();
    }

    /**
     * @param  array<int, int>  $houseIds
     */
    private function syncTargets(Announcement $announcement, array $houseIds): void
    {
        $announcement->targets()->delete();

        foreach ($houseIds as $houseId) {
            $announcement->targets()->create(['house_id' => $houseId]);
        }
    }

    private function generateUniqueSlug(string $title, ?int $excludeId = null): string
    {
        $base = Str::slug($title);
        $slug = $base;
        $suffix = 2;

        while (
            Announcement::withTrashed()
                ->where('slug', $slug)
                ->when($excludeId, fn ($query) => $query->where('id', '!=', $excludeId))
                ->exists()
        ) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
