<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminEventResource;
use App\Http\Resources\EventDocumentationResource;
use App\Models\Event;
use App\Models\EventDocumentation;
use App\Services\EventAdminService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class EventAdminController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private EventAdminService $eventAdminService) {}

    public function index(Request $request)
    {
        $query = Event::query()->withCount('documentation');

        if ($request->search) {
            $query->where('title', 'like', "%{$request->search}%");
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $this->applySorting($query, $request, ['title', 'status', 'starts_at', 'created_at'], 'starts_at');

        return $this->paginated($query->paginate($request->per_page ?? 10), AdminEventResource::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'status' => ['sometimes', 'in:upcoming,ongoing,completed'],
            'is_public' => ['sometimes', 'boolean'],
        ]);

        return (new AdminEventResource($this->eventAdminService->create($validated, $request->user())))->response()->setStatusCode(201);
    }

    public function show(Event $event)
    {
        return new AdminEventResource($event->loadCount('documentation'));
    }

    public function update(Request $request, Event $event)
    {
        $this->authorize('update', $event);

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:200'],
            'description' => ['sometimes', 'nullable', 'string'],
            'starts_at' => ['sometimes', 'date'],
            'ends_at' => ['sometimes', 'nullable', 'date', 'after:starts_at'],
            'status' => ['sometimes', 'in:upcoming,ongoing,completed'],
            'is_public' => ['sometimes', 'boolean'],
        ]);

        return new AdminEventResource($this->eventAdminService->update($event, $validated));
    }

    public function destroy(Event $event)
    {
        $this->authorize('delete', $event);
        $event->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function storeDocumentation(Request $request, Event $event)
    {
        $validated = $request->validate([
            'photo' => ['required', 'image', 'max:2048'],
            'media_type' => ['required', 'in:foto,video'],
            'caption' => ['nullable', 'string', 'max:255'],
        ]);

        $doc = $this->eventAdminService->addDocumentation($event, $validated['photo'], $validated['media_type'], $validated['caption'] ?? null);

        return (new EventDocumentationResource($doc))->response()->setStatusCode(201);
    }

    public function destroyDocumentation(EventDocumentation $documentation)
    {
        $this->authorize('delete', $documentation->event);

        $documentation->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
