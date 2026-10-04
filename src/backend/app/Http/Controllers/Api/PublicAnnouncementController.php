<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicAnnouncementResource;
use App\Models\Announcement;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PublicAnnouncementController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $announcements = Announcement::query()
            ->where('is_public', true)
            ->where('published_at', '<=', now())
            ->orderByDesc('published_at')
            ->limit(50)
            ->get();

        return PublicAnnouncementResource::collection($announcements);
    }

    public function show(string $slug): PublicAnnouncementResource
    {
        $announcement = Announcement::query()
            ->where('slug', $slug)
            ->where('is_public', true)
            ->where('published_at', '<=', now())
            ->firstOrFail();

        return new PublicAnnouncementResource($announcement);
    }
}
