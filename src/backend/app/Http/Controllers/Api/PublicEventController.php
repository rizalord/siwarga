<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicEventResource;
use App\Models\Event;

class PublicEventController extends Controller
{
    public function index()
    {
        $events = Event::query()
            ->where('is_public', true)
            ->orderBy('starts_at')
            ->get();

        return PublicEventResource::collection($events);
    }

    public function show(string $slug)
    {
        $event = Event::query()
            ->where('slug', $slug)
            ->where('is_public', true)
            ->with('documentation')
            ->firstOrFail();

        return new PublicEventResource($event);
    }
}
