<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ForumPostResource;
use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Services\ForumService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class ForumPostController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private ForumService $forumService) {}

    public function index(Request $request, ForumThread $thread)
    {
        $query = $thread->posts()->with('user:id,name')->orderBy('id');

        return $this->paginated($query->paginate($request->per_page ?? 20), ForumPostResource::class);
    }

    public function store(Request $request, ForumThread $thread)
    {
        $validated = $request->validate([
            'content' => ['required', 'string', 'max:5000'],
        ]);

        $post = $this->forumService->createPost($thread, $validated['content'], $request->user());

        return (new ForumPostResource($post->load('user')))->response()->setStatusCode(201);
    }

    public function destroy(ForumPost $post)
    {
        $this->authorize('delete', $post);

        $this->forumService->deletePost($post);

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
