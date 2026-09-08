<?php

namespace Tests\Unit;

use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Models\Role;
use App\Models\User;
use App\Policies\ForumPostPolicy;
use App\Policies\ForumThreadPolicy;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ForumPolicyTest extends TestCase
{
    use RefreshDatabase;

    protected function actingUser(string $role): User
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $user = User::factory()->create();
        $user->roles()->attach(Role::where('name', $role)->first()->id);
        $user->load('roles.permissions');

        return $user;
    }

    public function test_warga_can_create_and_delete_own_but_not_others()
    {
        $warga = $this->actingUser('warga');
        $other = User::factory()->create();
        $threadPolicy = new ForumThreadPolicy;
        $postPolicy = new ForumPostPolicy;

        $this->assertTrue($threadPolicy->viewAny($warga));
        $this->assertTrue($threadPolicy->create($warga));

        $mine = ForumThread::factory()->make(['created_by' => $warga->id]);
        $theirs = ForumThread::factory()->make(['created_by' => $other->id]);
        $this->assertTrue($threadPolicy->delete($warga, $mine));
        $this->assertFalse($threadPolicy->delete($warga, $theirs));

        $myPost = ForumPost::factory()->make(['user_id' => $warga->id]);
        $theirPost = ForumPost::factory()->make(['user_id' => $other->id]);
        $this->assertTrue($postPolicy->delete($warga, $myPost));
        $this->assertFalse($postPolicy->delete($warga, $theirPost));
    }

    public function test_admin_can_delete_any_thread_or_post()
    {
        $admin = $this->actingUser('admin');
        $other = User::factory()->create();

        $this->assertTrue((new ForumThreadPolicy)->delete($admin, ForumThread::factory()->make(['created_by' => $other->id])));
        $this->assertTrue((new ForumPostPolicy)->delete($admin, ForumPost::factory()->make(['user_id' => $other->id])));
    }
}
