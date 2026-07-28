<?php

namespace Tests\Feature\Api;

use App\Models\ActivityLog;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $this->admin = User::factory()->create();
        $this->admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->admin->load('roles.permissions');
        $this->actingAs($this->admin);
    }

    public function test_creating_a_resident_records_an_activity_log()
    {
        $this->postJson('/api/residents', [
            'full_name' => 'Budi Santoso',
            'status' => 'tetap',
            'phone_number' => '08123456789',
            'marital_status' => 'menikah',
        ])->assertStatus(201);

        $this->assertDatabaseHas('activity_logs', [
            'action' => 'created',
            'subject_type' => 'Resident',
            'user_id' => $this->admin->id,
        ]);
    }

    public function test_updating_a_resident_records_before_after_changes()
    {
        $resident = Resident::create([
            'full_name' => 'Budi Santoso',
            'status' => 'tetap',
            'phone_number' => '08123456789',
            'marital_status' => 'menikah',
        ]);

        $this->putJson("/api/residents/{$resident->id}", [
            'full_name' => 'Budi S.',
        ])->assertStatus(200);

        $log = ActivityLog::where('action', 'updated')->where('subject_id', $resident->id)->first();

        $this->assertNotNull($log);
        $this->assertSame('Budi Santoso', $log->changes['before']['full_name']);
        $this->assertSame('Budi S.', $log->changes['after']['full_name']);
    }

    public function test_deleting_a_resident_records_an_activity_log()
    {
        $resident = Resident::create([
            'full_name' => 'Budi Santoso',
            'status' => 'tetap',
            'phone_number' => '08123456789',
            'marital_status' => 'menikah',
        ]);

        $this->deleteJson("/api/residents/{$resident->id}")->assertStatus(200);

        $this->assertDatabaseHas('activity_logs', [
            'action' => 'deleted',
            'subject_type' => 'Resident',
            'subject_id' => $resident->id,
        ]);
    }

    public function test_login_records_an_activity_log()
    {
        $this->postJson('/api/auth/login', [
            'email' => $this->admin->email,
            'password' => 'password',
        ])->assertStatus(200);

        $this->assertDatabaseHas('activity_logs', [
            'action' => 'login',
            'user_id' => $this->admin->id,
        ]);
    }

    public function test_can_list_activity_logs()
    {
        ActivityLog::record('created', 'Menambahkan Penghuni: Test');

        $response = $this->getJson('/api/activity-logs');

        $response->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, count($response->json('data')));
    }

    public function test_can_filter_activity_logs_by_action()
    {
        ActivityLog::record('login', 'Login: Test');
        ActivityLog::record('created', 'Menambahkan Penghuni: Test');

        $response = $this->getJson('/api/activity-logs?action=login');

        $response->assertStatus(200);
        collect($response->json('data'))->each(
            fn ($log) => $this->assertSame('login', $log['action'])
        );
    }

    public function test_non_admin_cannot_view_activity_logs()
    {
        $warga = User::factory()->create();
        $warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $warga->load('roles.permissions');

        $response = $this->actingAs($warga)->getJson('/api/activity-logs');

        $response->assertStatus(403);
    }

    public function test_frontend_can_track_a_page_view()
    {
        $response = $this->postJson('/api/activity-logs/track', [
            'path' => '/residents',
            'title' => 'Penghuni',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('activity_logs', [
            'action' => 'navigate',
            'user_id' => $this->admin->id,
            'url' => '/residents',
        ]);
    }
}
