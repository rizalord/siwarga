<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AnnouncementResource;
use App\Jobs\SendAnnouncementWhatsappJob;
use App\Models\Announcement;
use App\Policies\AnnouncementPolicy;
use App\Services\AnnouncementService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AnnouncementController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private AnnouncementService $announcementService,
        private AnnouncementPolicy $announcementPolicy,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Announcement::query()->with('targets');

        if ($request->search) {
            $query->where('title', 'like', "%{$request->string('search')}%");
        }

        if ($request->filled('category')) {
            is_array($request->category)
                ? $query->whereIn('category', $request->category)
                : $query->where('category', $request->category);
        }

        $this->applySorting($query, $request, ['title', 'category', 'published_at', 'created_at']);

        return $this->paginated($query->paginate($request->integer('per_page') ?: 10), AnnouncementResource::class);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validate($request, [
            'title' => ['required', 'string', 'max:200'],
            'content' => ['required', 'string'],
            'category' => ['required', 'in:darurat,umum,kegiatan,keuangan'],
            'is_public' => ['sometimes', 'boolean'],
            'published_at' => ['nullable', 'date'],
            'target_house_ids' => ['sometimes', 'array'],
            'target_house_ids.*' => ['integer', 'exists:houses,id'],
        ]);

        $this->ensureCanManageCategory($request, $request->string('category')->toString());

        $announcement = $this->announcementService->create($validated, $this->authUser($request));

        return (new AnnouncementResource($announcement))->response()->setStatusCode(201);
    }

    public function show(Announcement $announcement): AnnouncementResource
    {
        $announcement->load('targets');

        return new AnnouncementResource($announcement);
    }

    public function update(Request $request, Announcement $announcement): AnnouncementResource
    {
        $this->authorize('update', $announcement);

        $validated = $this->validate($request, [
            'title' => ['sometimes', 'string', 'min:1', 'max:200'],
            'content' => ['sometimes', 'nullable', 'string'],
            'category' => ['sometimes', 'in:darurat,umum,kegiatan,keuangan'],
            'is_public' => ['sometimes', 'boolean'],
            'published_at' => ['nullable', 'date'],
            'target_house_ids' => ['sometimes', 'array'],
            'target_house_ids.*' => ['integer', 'exists:houses,id'],
        ]);

        if (array_key_exists('category', $validated)) {
            $this->ensureCanManageCategory($request, $request->string('category')->toString());
        }

        $announcement = $this->announcementService->update($announcement, $validated);

        return new AnnouncementResource($announcement);
    }

    public function destroy(Request $request, Announcement $announcement): JsonResponse
    {
        $this->authorize('delete', $announcement);

        $this->announcementService->delete($announcement);

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function publish(Announcement $announcement): JsonResponse
    {
        $this->authorize('publish', $announcement);

        if ($announcement->published_at === null) {
            $announcement->update(['published_at' => now()]);
        }

        SendAnnouncementWhatsappJob::dispatch($announcement);

        return response()->json(['data' => null, 'message' => 'Pengumuman sedang dikirim ke WhatsApp warga']);
    }

    /**
     * Blocks a Bendahara from creating/moving an announcement into a
     * category they aren't allowed to manage. Admin is never blocked.
     */
    private function ensureCanManageCategory(Request $request, string $category): void
    {
        if (! $this->announcementPolicy->canManageCategory($this->authUser($request), $category)) {
            throw ValidationException::withMessages([
                'category' => ['Bendahara hanya dapat mengelola pengumuman kategori keuangan.'],
            ]);
        }
    }
}
