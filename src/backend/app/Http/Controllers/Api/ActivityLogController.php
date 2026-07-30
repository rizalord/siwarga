<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function __construct(private ActivityLogService $activityLogService) {}

    public function index(Request $request)
    {
        $query = $this->activityLogService->filter($request);

        $this->applySorting($query, $request, ['created_at', 'action'], 'created_at', 'desc');

        return $this->paginated($query->paginate($request->per_page ?? 15), ActivityLogResource::class);
    }

    /**
     * Record a client-side navigation event (page view) reported by the SPA.
     */
    public function track(Request $request)
    {
        $validated = $request->validate([
            'path' => 'required|string|max:255',
            'title' => 'nullable|string|max:255',
        ]);

        $this->activityLogService->track($validated['path'], $validated['title'] ?? null);

        return response()->json(['data' => null]);
    }
}
