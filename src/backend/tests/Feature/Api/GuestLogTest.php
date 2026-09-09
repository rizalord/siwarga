<?php

namespace Tests\Feature\Api;

use App\Models\GuestLog;
use App\Models\House;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GuestLogTest extends TestCase
{
    use RefreshDatabase;

    protected User $satpam;

    protected User $warga;

    protected House $house;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->satpam = User::factory()->create();
        $this->satpam->roles()->attach(Role::where('name', 'satpam')->first()->id);
        $this->satpam->load('roles.permissions');

        $this->warga = User::factory()->create();
        $this->warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $this->warga->load('roles.permissions');

        $this->house = House::factory()->create();
    }

    public function test_warga_pre_register_gets_qr_token()
    {
        $response = $this->actingAs($this->warga)->postJson('/api/guest-logs', [
            'guest_name' => 'Budi Tamu',
            'house_id' => $this->house->id,
            'visit_date' => now()->toDateString(),
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'registered')
            ->assertJsonStructure(['data' => ['qr_token']]);
    }

    public function test_satpam_walk_in_checks_in_directly()
    {
        $response = $this->actingAs($this->satpam)->postJson('/api/guest-logs', [
            'guest_name' => 'Kurir Paket',
            'house_id' => $this->house->id,
        ]);

        $response->assertStatus(201)->assertJsonPath('data.status', 'checked_in');
    }

    public function test_check_in_out_transitions()
    {
        $log = GuestLog::factory()->create([
            'house_id' => $this->house->id,
            'registered_by' => $this->warga->id,
            'status' => 'registered',
        ]);

        $this->actingAs($this->satpam)->postJson("/api/guest-logs/{$log->id}/check-in")
            ->assertStatus(200)->assertJsonPath('data.status', 'checked_in');

        $this->actingAs($this->satpam)->postJson("/api/guest-logs/{$log->id}/check-out")
            ->assertStatus(200)->assertJsonPath('data.status', 'checked_out');
    }

    public function test_double_check_in_fails()
    {
        $log = GuestLog::factory()->create([
            'house_id' => $this->house->id,
            'status' => 'checked_in',
        ]);

        $this->actingAs($this->satpam)->postJson("/api/guest-logs/{$log->id}/check-in")
            ->assertStatus(422);
    }

    public function test_warga_cannot_check_in_and_sees_only_own()
    {
        $other = User::factory()->create();
        GuestLog::factory()->create(['house_id' => $this->house->id, 'registered_by' => $other->id]);
        $own = GuestLog::factory()->create(['house_id' => $this->house->id, 'registered_by' => $this->warga->id]);

        $this->actingAs($this->warga)->postJson("/api/guest-logs/{$own->id}/check-in")->assertStatus(403);

        $this->actingAs($this->warga)->getJson('/api/guest-logs')
            ->assertStatus(200)->assertJsonCount(1, 'data');
    }
}
