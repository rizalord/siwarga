<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $query = ActivityLog::query()->with('user:id,name,email');

        if ($request->filled('action')) {
            is_array($request->action)
                ? $query->whereIn('action', $request->action)
                : $query->where('action', $request->action);
        }

        if ($request->filled('subject_type')) {
            is_array($request->subject_type)
                ? $query->whereIn('subject_type', $request->subject_type)
                : $query->where('subject_type', $request->subject_type);
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->search) {
            $query->where('description', 'like', "%{$request->search}%");
        }

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

        $label = $validated['title'] ?? $validated['path'];

        ActivityLog::record('navigate', "Membuka halaman: {$label}", null, [], url: $validated['path']);

        return response()->json(['data' => null]);
    }
}
