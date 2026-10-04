<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WargaAnnouncementResource;
use App\Models\Announcement;
use App\Models\AnnouncementRead;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WargaAnnouncementController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request): JsonResponse
    {
        $user = $this->authUser($request);
        $query = Announcement::query()
            ->visibleToWarga($user)
            ->with(['reads' => fn (Relation $q) => $q->where('user_id', $user->id)]);

        if ($request->search) {
            $query->where('title', 'like', "%{$request->string('search')}%");
        }

        if ($request->filled('category')) {
            is_array($request->category)
                ? $query->whereIn('category', $request->category)
                : $query->where('category', $request->category);
        }

        $this->applySorting($query, $request, ['title', 'category', 'published_at', 'created_at'], 'published_at');

        return $this->paginated($query->paginate($request->integer('per_page') ?: 10), WargaAnnouncementResource::class);
    }

    public function show(Request $request, Announcement $announcement): WargaAnnouncementResource
    {
        $this->authorize('viewForWarga', $announcement);

        $user = $this->authUser($request);

        if (! $user->hasPermission('announcements.manage')) {
            try {
                AnnouncementRead::updateOrCreate(
                    ['announcement_id' => $announcement->id, 'user_id' => $user->id],
                    ['read_at' => now()]
                );
            } catch (\Throwable $exception) {
                Log::warning('WargaAnnouncementController: failed to record read receipt', [
                    'announcement_id' => $announcement->id,
                    'user_id' => $user->id,
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        $announcement->load(['reads' => fn (Relation $q) => $q->where('user_id', $user->id)]);

        return new WargaAnnouncementResource($announcement);
    }
}
