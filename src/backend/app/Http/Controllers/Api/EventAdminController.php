<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminEventResource;
use App\Http\Resources\EventDocumentationResource;
use App\Models\Event;
use App\Models\EventDocumentation;
use App\Services\EventAdminService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EventAdminController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private EventAdminService $eventAdminService) {}

    public function index(Request $request): JsonResponse
    {
        $query = Event::query()->withCount('documentation');

        if ($request->search) {
            $query->where('title', 'like', "%{$request->string('search')}%");
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $this->applySorting($query, $request, ['title', 'status', 'starts_at', 'created_at'], 'starts_at');

        return $this->paginated($query->paginate($request->integer('per_page') ?: 10), AdminEventResource::class);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validate($request, [
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'status' => ['sometimes', 'in:upcoming,ongoing,completed'],
            'is_public' => ['sometimes', 'boolean'],
        ]);

        return (new AdminEventResource($this->eventAdminService->create($validated, $this->authUser($request))))->response()->setStatusCode(201);
    }

    public function show(Event $event): AdminEventResource
    {
        return new AdminEventResource($event->loadCount('documentation'));
    }

    public function update(Request $request, Event $event): AdminEventResource
    {
        $this->authorize('update', $event);

        $validated = $this->validate($request, [
            'title' => ['sometimes', 'string', 'max:200'],
            'description' => ['sometimes', 'nullable', 'string'],
            'starts_at' => ['sometimes', 'date'],
            'ends_at' => ['sometimes', 'nullable', 'date', 'after:starts_at'],
            'status' => ['sometimes', 'in:upcoming,ongoing,completed'],
            'is_public' => ['sometimes', 'boolean'],
        ]);

        return new AdminEventResource($this->eventAdminService->update($event, $validated));
    }

    public function destroy(Event $event): JsonResponse
    {
        $this->authorize('delete', $event);
        $event->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function documentation(Event $event): AnonymousResourceCollection
    {
        return EventDocumentationResource::collection(
            $event->documentation()->orderBy('id')->get()
        );
    }

    public function storeDocumentation(Request $request, Event $event): JsonResponse
    {
        $this->validate($request, [
            'photo' => ['required', 'image', 'max:2048'],
            'media_type' => ['required', 'in:foto,video'],
            'caption' => ['nullable', 'string', 'max:255'],
        ]);

        $doc = $this->eventAdminService->addDocumentation($event, $this->uploadedFile($request, 'photo'), $request->string('media_type')->toString(), $this->optionalString($request, 'caption'));

        return (new EventDocumentationResource($doc))->response()->setStatusCode(201);
    }

    public function destroyDocumentation(EventDocumentation $documentation): JsonResponse
    {
        $this->authorize('delete', $documentation->event);

        $this->eventAdminService->deleteDocumentation($documentation);

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
