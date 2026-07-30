<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class ActivityLogService
{
    /**
     * @return Builder<ActivityLog>
     */
    // Sole exception to Services not touching Request: decomposing these 6 optional filter params into scalars would be worse than accepting the Request here.
    public function filter(Request $request): Builder
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

        return $query;
    }

    public function track(string $path, ?string $title): void
    {
        $label = $title ?? $path;

        ActivityLog::record('navigate', "Membuka halaman: {$label}", null, [], url: $path);
    }
}
