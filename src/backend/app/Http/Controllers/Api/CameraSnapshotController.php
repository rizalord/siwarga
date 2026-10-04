<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CameraSnapshotResource;
use App\Models\CameraAccessLog;
use App\Models\CameraSnapshot;
use App\Services\ConfigValue;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CameraSnapshotController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request): JsonResponse
    {
        $query = CameraSnapshot::query()->with('camera:id,name');

        if ($request->filled('camera_id')) {
            $query->where('camera_id', $request->camera_id);
        }

        if ($request->filled('event_type')) {
            $query->where('event_type', $request->event_type);
        }

        if ($request->filled('date')) {
            $query->whereDate('captured_at', $request->string('date')->toString());
        }

        $this->applySorting($query, $request, ['captured_at', 'created_at']);

        return $this->paginated($query->paginate($request->integer('per_page') ?: 10), CameraSnapshotResource::class);
    }

    public function show(Request $request, CameraSnapshot $cameraSnapshot): CameraSnapshotResource
    {
        $this->authorize('view', $cameraSnapshot);

        CameraAccessLog::create([
            'snapshot_id' => $cameraSnapshot->id,
            'user_id' => $this->authUser($request)->id,
            'viewed_at' => now(),
        ]);

        return new CameraSnapshotResource($cameraSnapshot->load('camera'));
    }

    public function destroy(CameraSnapshot $cameraSnapshot): JsonResponse
    {
        $this->authorize('delete', $cameraSnapshot);

        Storage::disk('public')->delete($cameraSnapshot->file_path);

        try {
            $basename = basename($cameraSnapshot->file_path);

            if (preg_match('/^[0-9a-f]{64}-(.+)$/', $basename, $matches)) {
                $basename = $matches[1];
            }

            $disk = Storage::disk('public');
            $inbox = trim(ConfigValue::string('cctv.inbox_path', 'ftp-inbox'), '/');

            foreach ($disk->allFiles($inbox) as $file) {
                if (is_string($file) && str_ends_with($file, '/.done/'.$basename)) {
                    $disk->delete($file);
                }
            }
        } catch (\Throwable) {
            // Best-effort: never fail the request on .done/ cleanup.
        }

        $cameraSnapshot->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
