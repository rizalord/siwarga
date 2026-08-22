<?php

namespace Tests\Unit;

use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ForumModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_thread_has_many_posts()
    {
        $thread = ForumThread::factory()->create();
        ForumPost::factory()->count(2)->create(['thread_id' => $thread->id]);

        $this->assertCount(2, $thread->posts);
    }

    public function test_post_belongs_to_user()
    {
        $user = User::factory()->create();
        $post = ForumPost::factory()->create(['user_id' => $user->id]);

        $this->assertTrue($post->user->is($user));
    }

    public function test_thread_soft_deletes()
    {
        $thread = ForumThread::factory()->create();

        $thread->delete();

        $this->assertSoftDeleted($thread);
    }

    public function test_post_soft_deletes()
    {
        $post = ForumPost::factory()->create();

        $post->delete();

        $this->assertSoftDeleted($post);
    }
}
