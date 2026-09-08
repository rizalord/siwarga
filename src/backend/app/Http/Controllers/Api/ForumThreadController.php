<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ForumThreadResource;
use App\Models\ForumThread;
use App\Services\ForumService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class ForumThreadController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private ForumService $forumService) {}

    public function index(Request $request)
    {
        $query = ForumThread::query()->with('createdBy:id,name')->withCount('posts');

        if ($request->search) {
            $query->where('title', 'like', "%{$request->search}%");
        }

        $this->applySorting($query, $request, ['title', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), ForumThreadResource::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
        ]);

        $thread = $this->forumService->createThread($validated['title'], $request->user());

        return (new ForumThreadResource($thread->load('createdBy')))->response()->setStatusCode(201);
    }

    public function show(ForumThread $thread)
    {
        return new ForumThreadResource($thread->load('createdBy')->loadCount('posts'));
    }

    public function destroy(ForumThread $thread)
    {
        $this->authorize('delete', $thread);

        $this->forumService->deleteThread($thread);

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
