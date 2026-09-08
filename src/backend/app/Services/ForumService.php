<?php

namespace App\Services;

use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ForumService
{
    public function __construct(private HtmlSanitizer $htmlSanitizer) {}

    public function createThread(string $title, User $user): ForumThread
    {
        return ForumThread::create(['title' => $title, 'created_by' => $user->id]);
    }

    public function deleteThread(ForumThread $thread): void
    {
        DB::transaction(function () use ($thread): void {
            $thread->posts()->delete();
            $thread->delete();
        });
    }

    public function createPost(ForumThread $thread, string $content, User $user): ForumPost
    {
        return $thread->posts()->create([
            'user_id' => $user->id,
            'content' => $this->htmlSanitizer->sanitize($content),
        ]);
    }

    public function deletePost(ForumPost $post): void
    {
        $post->delete();
    }
}
