<?php

namespace Tests\Feature\Api;

use App\Jobs\SendPanicWhatsappJob;
use App\Models\House;
use App\Models\PanicAlert;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class PanicAlertTest extends TestCase
{
    use RefreshDatabase;

    protected User $satpam;

    protected User $warga;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->satpam = User::factory()->create();
        $this->satpam->roles()->attach(Role::where('name', 'satpam')->first()->id);
        $this->satpam->load('roles.permissions');

        $resident = Resident::factory()->create();
        $house = House::factory()->create();
        $house->residents()->attach($resident->id, ['start_date' => now()->subMonth()]);
        $this->warga = User::factory()->create(['resident_id' => $resident->id]);
        $this->warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $this->warga->load('roles.permissions');
    }

    public function test_warga_can_report_and_staff_get_notified()
    {
        Queue::fake();

        $response = $this->actingAs($this->warga)->postJson('/api/panic-alerts', [
            'note' => 'Ada orang mencurigakan di blok A',
        ]);

        $response->assertStatus(201)->assertJsonPath('data.status', 'active');
        $this->assertDatabaseHas('notifications', ['notifiable_id' => $this->satpam->id]);
        Queue::assertPushed(SendPanicWhatsappJob::class);
    }

    public function test_second_active_alert_is_rejected()
    {
        PanicAlert::factory()->create(['reporter_id' => $this->warga->id, 'status' => 'active']);

        $this->actingAs($this->warga)->postJson('/api/panic-alerts', ['note' => 'Lagi'])
            ->assertStatus(422);
    }

    public function test_handle_resolve_flow_notifies_reporter()
    {
        $alert = PanicAlert::factory()->create(['reporter_id' => $this->warga->id, 'status' => 'active']);

        $this->actingAs($this->satpam)->postJson("/api/panic-alerts/{$alert->id}/handle")
            ->assertStatus(200)->assertJsonPath('data.status', 'handled');

        $this->actingAs($this->satpam)->postJson("/api/panic-alerts/{$alert->id}/resolve")
            ->assertStatus(200)->assertJsonPath('data.status', 'resolved');

        $this->assertDatabaseHas('notifications', ['notifiable_id' => $this->warga->id]);
    }

    public function test_warga_cannot_handle_but_can_cancel_own()
    {
        $alert = PanicAlert::factory()->create(['reporter_id' => $this->warga->id, 'status' => 'active']);

        $this->actingAs($this->warga)->postJson("/api/panic-alerts/{$alert->id}/handle")->assertStatus(403);
        $this->actingAs($this->warga)->postJson("/api/panic-alerts/{$alert->id}/cancel")
            ->assertStatus(200)->assertJsonPath('data.status', 'cancelled');
    }

    public function test_resolve_requires_handled_first()
    {
        $alert = PanicAlert::factory()->create(['reporter_id' => $this->warga->id, 'status' => 'active']);

        $this->actingAs($this->satpam)->postJson("/api/panic-alerts/{$alert->id}/resolve")
            ->assertStatus(422);
    }
}
