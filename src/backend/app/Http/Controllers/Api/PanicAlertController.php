<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PanicAlertResource;
use App\Models\PanicAlert;
use App\Services\PanicAlertService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PanicAlertController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private PanicAlertService $panicAlertService) {}

    public function index(Request $request): JsonResponse
    {
        $user = $this->authUser($request);
        $query = PanicAlert::query()->with(['reporter:id,name', 'house:id,house_number', 'handler:id,name']);

        if (! $user->hasPermission('panic-alerts.handle')) {
            $query->where('reporter_id', $user->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $this->applySorting($query, $request, ['created_at', 'status']);

        return $this->paginated($query->paginate($request->integer('per_page') ?: 10), PanicAlertResource::class);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validate($request, [
            'location_note' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string'],
        ]);

        $alert = $this->panicAlertService->report($validated, $this->authUser($request));

        return (new PanicAlertResource($alert))->response()->setStatusCode(201);
    }

    public function show(PanicAlert $panicAlert): PanicAlertResource
    {
        $this->authorize('view', $panicAlert);

        return new PanicAlertResource($panicAlert->load(['reporter', 'house', 'handler']));
    }

    public function handle(PanicAlert $panicAlert): PanicAlertResource
    {
        $this->authorize('handle', $panicAlert);

        return new PanicAlertResource($this->panicAlertService->handle($panicAlert, $this->authUser()));
    }

    public function resolve(PanicAlert $panicAlert): PanicAlertResource
    {
        $this->authorize('handle', $panicAlert);

        return new PanicAlertResource($this->panicAlertService->resolve($panicAlert, $this->authUser()));
    }

    public function cancel(PanicAlert $panicAlert): PanicAlertResource
    {
        $this->authorize('cancel', $panicAlert);

        return new PanicAlertResource($this->panicAlertService->cancel($panicAlert, $this->authUser()));
    }
}
