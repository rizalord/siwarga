<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicEventResource;
use App\Models\Event;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PublicEventController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $events = Event::query()
            ->where('is_public', true)
            ->orderBy('starts_at')
            ->limit(50)
            ->get();

        return PublicEventResource::collection($events);
    }

    public function show(string $slug): PublicEventResource
    {
        $event = Event::query()
            ->where('slug', $slug)
            ->where('is_public', true)
            ->with('documentation')
            ->firstOrFail();

        return new PublicEventResource($event);
    }
}
