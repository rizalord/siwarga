<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CameraResource;
use App\Http\Resources\CameraSnapshotResource;
use App\Models\Camera;
use App\Models\CameraSnapshot;
use App\Services\CameraIngestService;
use App\Services\HtmlSanitizer;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CameraController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private HtmlSanitizer $htmlSanitizer,
        private CameraIngestService $ingest,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Camera::query()->withCount('snapshots');

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->search) {
            $query->where('name', 'like', "%{$request->string('search')}%");
        }

        $this->applySorting($query, $request, ['name', 'created_at']);

        return $this->paginated($query->paginate($request->integer('per_page') ?: 10), CameraResource::class);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validate($request, [
            'name' => ['required', 'string', 'max:100'],
            'location' => ['nullable', 'string', 'max:255'],
            'ftp_user' => ['required', 'string', 'max:64', 'unique:cameras,ftp_user'],
            'camera_type' => ['required', Rule::in([Camera::TYPE_TAPO, Camera::TYPE_SIMULATOR])],
            'stream_url' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        foreach (['name', 'location'] as $field) {
            if (isset($validated[$field]) && is_string($validated[$field])) {
                $validated[$field] = $this->htmlSanitizer->sanitize($validated[$field]);
            }
        }

        return (new CameraResource(Camera::create($validated)))->response()->setStatusCode(201);
    }

    public function show(Camera $camera): CameraResource
    {
        return new CameraResource($camera->loadCount('snapshots'));
    }

    public function update(Request $request, Camera $camera): CameraResource
    {
        $this->authorize('update', $camera);

        $validated = $this->validate($request, [
            'name' => ['sometimes', 'string', 'max:100'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'ftp_user' => ['sometimes', 'string', 'max:64', Rule::unique('cameras', 'ftp_user')->ignore($camera->id)],
            'camera_type' => ['sometimes', Rule::in([Camera::TYPE_TAPO, Camera::TYPE_SIMULATOR])],
            'stream_url' => ['sometimes', 'nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        foreach (['name', 'location'] as $field) {
            if (isset($validated[$field]) && is_string($validated[$field])) {
                $validated[$field] = $this->htmlSanitizer->sanitize($validated[$field]);
            }
        }

        $camera->update($validated);

        return new CameraResource($camera->refresh()->loadCount('snapshots'));
    }

    public function destroy(Camera $camera): JsonResponse
    {
        $this->authorize('delete', $camera);
        $camera->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function simulate(Request $request, Camera $camera): JsonResponse
    {
        abort_unless(app()->environment('local', 'testing'), 403, 'Simulasi hanya di non-production.');
        $this->authorize('update', $camera);

        if (! $camera->is_active) {
            abort(422, 'Kamera nonaktif.');
        }

        $this->validate($request, [
            'count' => ['sometimes', 'integer', 'min:1', 'max:5'],
        ]);

        $count = $request->integer('count', 1);

        $this->ingest->writeSimulatedFiles($camera, $count);
        $this->ingest->ingest($camera->id, CameraSnapshot::EVENT_SIMULATED);

        $snapshots = $camera->snapshots()->latest('id')->take($count)->with('camera')->get();

        return CameraSnapshotResource::collection($snapshots)->response()->setStatusCode(201);
    }
}
