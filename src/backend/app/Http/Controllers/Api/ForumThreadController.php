<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ForumThreadResource;
use App\Models\ForumThread;
use App\Services\ForumService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ForumThreadController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private ForumService $forumService) {}

    public function index(Request $request): JsonResponse
    {
        $query = ForumThread::query()->with('createdBy:id,name')->withCount('posts');

        if ($request->search) {
            $query->where('title', 'like', "%{$request->string('search')}%");
        }

        $this->applySorting($query, $request, ['title', 'created_at']);

        return $this->paginated($query->paginate($request->integer('per_page') ?: 10), ForumThreadResource::class);
    }

    public function store(Request $request): JsonResponse
    {
        $this->validate($request, [
            'title' => ['required', 'string', 'max:200'],
        ]);

        $thread = $this->forumService->createThread($request->string('title')->toString(), $this->authUser($request));

        return (new ForumThreadResource($thread->load('createdBy')))->response()->setStatusCode(201);
    }

    public function show(ForumThread $thread): ForumThreadResource
    {
        return new ForumThreadResource($thread->load('createdBy')->loadCount('posts'));
    }

    public function destroy(ForumThread $thread): JsonResponse
    {
        $this->authorize('delete', $thread);

        $this->forumService->deleteThread($thread);

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
