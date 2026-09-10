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
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CameraController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private HtmlSanitizer $htmlSanitizer,
        private CameraIngestService $ingest,
    ) {}

    public function index(Request $request)
    {
        $query = Camera::query()->withCount('snapshots');

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        $this->applySorting($query, $request, ['name', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), CameraResource::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'location' => ['nullable', 'string', 'max:255'],
            'ftp_user' => ['required', 'string', 'max:64', 'unique:cameras,ftp_user'],
            'camera_type' => ['required', Rule::in([Camera::TYPE_TAPO, Camera::TYPE_SIMULATOR])],
            'stream_url' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        foreach (['name', 'location'] as $field) {
            if (array_key_exists($field, $validated) && $validated[$field] !== null) {
                $validated[$field] = $this->htmlSanitizer->sanitize($validated[$field]);
            }
        }

        return (new CameraResource(Camera::create($validated)))->response()->setStatusCode(201);
    }

    public function show(Camera $camera)
    {
        return new CameraResource($camera->loadCount('snapshots'));
    }

    public function update(Request $request, Camera $camera)
    {
        $this->authorize('update', $camera);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'ftp_user' => ['sometimes', 'string', 'max:64', Rule::unique('cameras', 'ftp_user')->ignore($camera->id)],
            'camera_type' => ['sometimes', Rule::in([Camera::TYPE_TAPO, Camera::TYPE_SIMULATOR])],
            'stream_url' => ['sometimes', 'nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        foreach (['name', 'location'] as $field) {
            if (array_key_exists($field, $validated) && $validated[$field] !== null) {
                $validated[$field] = $this->htmlSanitizer->sanitize($validated[$field]);
            }
        }

        $camera->update($validated);

        return new CameraResource($camera->fresh()->loadCount('snapshots'));
    }

    public function destroy(Camera $camera)
    {
        $this->authorize('delete', $camera);
        $camera->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function simulate(Request $request, Camera $camera)
    {
        abort_unless(app()->environment('local', 'testing'), 403, 'Simulasi hanya di non-production.');
        $this->authorize('update', $camera);

        if (! $camera->is_active) {
            abort(422, 'Kamera nonaktif.');
        }

        $validated = $request->validate([
            'count' => ['sometimes', 'integer', 'min:1', 'max:5'],
        ]);

        $count = $validated['count'] ?? 1;

        $this->ingest->writeSimulatedFiles($camera, $count);
        $this->ingest->ingest($camera->id, CameraSnapshot::EVENT_SIMULATED);

        $snapshots = $camera->snapshots()->latest('id')->take($count)->with('camera')->get();

        return CameraSnapshotResource::collection($snapshots)->response()->setStatusCode(201);
    }
}
