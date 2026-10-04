<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ForumPostResource;
use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Services\ForumService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ForumPostController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private ForumService $forumService) {}

    public function index(Request $request, ForumThread $thread): JsonResponse
    {
        $query = $thread->posts()->with('user:id,name')->orderBy('id');

        return $this->paginated($query->paginate($request->integer('per_page') ?: 20), ForumPostResource::class);
    }

    public function store(Request $request, ForumThread $thread): JsonResponse
    {
        $this->validate($request, [
            'content' => ['required', 'string', 'max:5000'],
        ]);

        $post = $this->forumService->createPost($thread, $request->string('content')->toString(), $this->authUser($request));

        return (new ForumPostResource($post->load('user')))->response()->setStatusCode(201);
    }

    public function destroy(ForumPost $post): JsonResponse
    {
        $this->authorize('delete', $post);

        $this->forumService->deletePost($post);

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
