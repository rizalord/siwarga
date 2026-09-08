<?php

namespace Tests\Feature\Api;

use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ForumTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $warga;

    protected User $otherWarga;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->admin = User::factory()->create();
        $this->admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->admin->load('roles.permissions');

        foreach (['warga', 'otherWarga'] as $prop) {
            $user = User::factory()->create();
            $user->roles()->attach(Role::where('name', 'warga')->first()->id);
            $user->load('roles.permissions');
            $this->{$prop} = $user;
        }
    }

    public function test_warga_can_create_thread_and_post()
    {
        $thread = $this->actingAs($this->warga)->postJson('/api/forum-threads', [
            'title' => 'Jadwal Ronda Baru',
        ])->assertStatus(201)->assertJsonPath('data.title', 'Jadwal Ronda Baru')->json('data');

        $this->actingAs($this->otherWarga)->postJson("/api/forum-threads/{$thread['id']}/posts", [
            'content' => '<p>Setuju!</p>',
        ])->assertStatus(201)->assertJsonPath('data.content', '<p>Setuju!</p>');
    }

    public function test_post_content_is_sanitized()
    {
        $thread = ForumThread::create(['title' => 'T', 'created_by' => $this->warga->id]);

        $response = $this->actingAs($this->warga)->postJson("/api/forum-threads/{$thread->id}/posts", [
            'content' => '<p>Halo</p><script>alert(1)</script>',
        ]);

        $response->assertStatus(201);
        $this->assertStringNotContainsString('<script>', $response->json('data.content'));
    }

    public function test_warga_can_delete_own_thread_but_not_others()
    {
        $mine = ForumThread::create(['title' => 'Milikku', 'created_by' => $this->warga->id]);
        $theirs = ForumThread::create(['title' => 'Milik Orang', 'created_by' => $this->otherWarga->id]);

        $this->actingAs($this->warga)->deleteJson("/api/forum-threads/{$mine->id}")->assertStatus(200);
        $this->actingAs($this->warga)->deleteJson("/api/forum-threads/{$theirs->id}")->assertStatus(403);
    }

    public function test_deleting_thread_soft_deletes_its_posts()
    {
        $thread = ForumThread::create(['title' => 'T', 'created_by' => $this->warga->id]);
        $post = ForumPost::create(['thread_id' => $thread->id, 'user_id' => $this->warga->id, 'content' => '<p>A</p>']);

        $this->actingAs($this->admin)->deleteJson("/api/forum-threads/{$thread->id}")->assertStatus(200);

        $this->assertSoftDeleted('forum_threads', ['id' => $thread->id]);
        $this->assertSoftDeleted('forum_posts', ['id' => $post->id]);
    }

    public function test_admin_can_delete_any_post()
    {
        $thread = ForumThread::create(['title' => 'T', 'created_by' => $this->warga->id]);
        $post = ForumPost::create(['thread_id' => $thread->id, 'user_id' => $this->warga->id, 'content' => '<p>A</p>']);

        $this->actingAs($this->admin)->deleteJson("/api/forum-posts/{$post->id}")->assertStatus(200);
        $this->assertSoftDeleted('forum_posts', ['id' => $post->id]);
    }

    public function test_thread_list_includes_posts_count()
    {
        $thread = ForumThread::create(['title' => 'Ramai', 'created_by' => $this->warga->id]);
        ForumPost::create(['thread_id' => $thread->id, 'user_id' => $this->warga->id, 'content' => '<p>A</p>']);

        $this->actingAs($this->warga)->getJson('/api/forum-threads')->assertStatus(200)
            ->assertJsonPath('data.0.posts_count', 1);
    }
}
