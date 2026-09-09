<?php

namespace Tests\Feature\Api;

use App\Jobs\SendTicketWhatsappJob;
use App\Models\Role;
use App\Models\Ticket;
use App\Models\User;
use App\Notifications\TicketStatusUpdated;
use App\Services\WahaService;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class TicketNotificationTest extends TestCase
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

    public function test_status_change_notifies_reporter_and_dispatches_wa_job()
    {
        Queue::fake();
        $ticket = Ticket::factory()->create(['reported_by' => $this->warga->id, 'status' => 'open']);

        $this->actingAs($this->admin)->postJson("/api/tickets/{$ticket->id}/status", ['status' => 'in_progress'])
            ->assertStatus(200);

        $this->assertDatabaseHas('notifications', [
            'notifiable_id' => $this->warga->id,
            'notifiable_type' => User::class,
        ]);
        Queue::assertPushed(SendTicketWhatsappJob::class);
    }

    public function test_status_change_succeeds_even_without_reporter_phone()
    {
        $ticket = Ticket::factory()->create(['reported_by' => $this->warga->id, 'status' => 'open']);

        $this->actingAs($this->admin)->postJson("/api/tickets/{$ticket->id}/status", ['status' => 'in_progress'])
            ->assertStatus(200);
        $this->assertEquals('in_progress', $ticket->fresh()->status);
    }

    public function test_wa_job_skips_silently_when_no_phone_number()
    {
        Http::fake();
        $ticket = Ticket::factory()->create(['reported_by' => $this->warga->id]);

        (new SendTicketWhatsappJob($ticket->id, 'open', 'in_progress'))->handle(app(WahaService::class));

        Http::assertNothingSent();
    }

    public function test_user_can_list_and_read_own_notifications()
    {
        $this->warga->notify(new TicketStatusUpdated(1, 'Lampu Mati', 'open', 'in_progress', 'Admin RT'));

        $this->actingAs($this->warga)->getJson('/api/notifications')->assertStatus(200)
            ->assertJsonCount(1, 'data');

        $id = $this->warga->notifications()->first()->id;
        $this->actingAs($this->warga)->postJson("/api/notifications/{$id}/read")->assertStatus(200);
        $this->assertNotNull($this->warga->notifications()->first()->fresh()->read_at);

        $this->warga->notify(new TicketStatusUpdated(1, 'Lampu Mati', 'open', 'in_progress', 'Admin RT'));
        $this->actingAs($this->warga)->postJson('/api/notifications/read-all')->assertStatus(200);
        $this->assertEquals(0, $this->warga->unreadNotifications()->count());
    }
}
