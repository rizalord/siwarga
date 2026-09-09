<?php

namespace Tests\Feature\Api;

use App\Models\PatrolSchedule;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PatrolScheduleTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $warga;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->admin = User::factory()->create();
        $this->admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->admin->load('roles.permissions');

        $this->warga = User::factory()->create();
        $this->warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $this->warga->load('roles.permissions');
    }

    public function test_admin_can_crud_patrol_schedules()
    {
        $created = $this->actingAs($this->admin)->postJson('/api/patrol-schedules', [
            'date' => now()->addDay()->toDateString(),
            'shift' => 'malam',
            'personnel_name' => 'Pak Joko',
            'area' => 'Blok A',
        ])->assertStatus(201)->assertJsonPath('data.shift', 'malam')->json('data');

        // Duplicate shift on the same date fails.
        $this->actingAs($this->admin)->postJson('/api/patrol-schedules', [
            'date' => now()->addDay()->toDateString(),
            'shift' => 'malam',
            'personnel_name' => 'Pak Budi',
        ])->assertStatus(422);

        $this->actingAs($this->admin)->putJson("/api/patrol-schedules/{$created['id']}", [
            'personnel_name' => 'Pak Joko S.',
        ])->assertStatus(200);

        $this->actingAs($this->admin)->deleteJson("/api/patrol-schedules/{$created['id']}")
            ->assertStatus(200);
        $this->assertSoftDeleted('patrol_schedules', ['id' => $created['id']]);
    }

    public function test_warga_can_view_but_not_manage()
    {
        PatrolSchedule::factory()->create();

        $this->actingAs($this->warga)->getJson('/api/patrol-schedules')->assertStatus(200);
        $this->actingAs($this->warga)->postJson('/api/patrol-schedules', [
            'date' => now()->toDateString(),
            'shift' => 'pagi',
            'personnel_name' => 'X',
        ])->assertStatus(403);
    }
}
