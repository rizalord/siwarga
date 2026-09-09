<?php

namespace Tests\Feature\Api;

use App\Models\House;
use App\Models\Resident;
use App\Models\Role;
use App\Models\Ticket;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TicketTest extends TestCase
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

        $resident = Resident::factory()->create();
        $house = House::factory()->create();
        $house->residents()->attach($resident->id, ['start_date' => now()->subMonth()]);

        $this->warga = User::factory()->create(['resident_id' => $resident->id]);
        $this->warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $this->warga->load('roles.permissions');
    }

    public function test_warga_can_report_ticket_with_auto_house()
    {
        $response = $this->actingAs($this->warga)->postJson('/api/tickets', [
            'title' => 'Lampu Jalan Mati',
            'description' => '<p>Gang 3 gelap.</p>',
            'category' => 'kerusakan fasilitas',
        ]);

        $response->assertStatus(201)->assertJsonPath('data.title', 'Lampu Jalan Mati');
        $this->assertDatabaseHas('tickets', ['title' => 'Lampu Jalan Mati', 'reported_by' => $this->warga->id]);
        $this->assertNotNull($response->json('data.house_id'));
    }

    public function test_warga_cannot_view_others_ticket_but_admin_can_list_all()
    {
        $mine = Ticket::factory()->create(['reported_by' => $this->warga->id]);
        $theirs = Ticket::factory()->create();

        $this->actingAs($this->warga)->getJson("/api/tickets/{$theirs->id}")->assertStatus(403);
        $this->actingAs($this->warga)->getJson("/api/tickets/{$mine->id}")->assertStatus(200);

        $this->actingAs($this->admin)->getJson('/api/tickets')->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }

    public function test_status_moves_forward_only()
    {
        $ticket = Ticket::factory()->create(['reported_by' => $this->warga->id, 'status' => 'open']);

        $this->actingAs($this->admin)->postJson("/api/tickets/{$ticket->id}/status", ['status' => 'in_progress'])
            ->assertStatus(200)->assertJsonPath('data.status', 'in_progress');

        // Skip ahead is rejected, backwards is rejected.
        $this->actingAs($this->admin)->postJson("/api/tickets/{$ticket->fresh()->id}/status", ['status' => 'open'])
            ->assertStatus(422);

        $open = Ticket::factory()->create(['reported_by' => $this->warga->id, 'status' => 'open']);
        $this->actingAs($this->admin)->postJson("/api/tickets/{$open->id}/status", ['status' => 'resolved'])
            ->assertStatus(422);
    }

    public function test_warga_cannot_change_status_or_assign()
    {
        $ticket = Ticket::factory()->create(['reported_by' => $this->warga->id]);

        $this->actingAs($this->warga)->postJson("/api/tickets/{$ticket->id}/status", ['status' => 'in_progress'])
            ->assertStatus(403);
        $this->actingAs($this->warga)->postJson("/api/tickets/{$ticket->id}/assign", ['assigned_to' => $this->admin->id])
            ->assertStatus(403);
    }

    public function test_admin_can_assign_pic()
    {
        $ticket = Ticket::factory()->create(['reported_by' => $this->warga->id]);

        $this->actingAs($this->admin)->postJson("/api/tickets/{$ticket->id}/assign", ['assigned_to' => $this->admin->id])
            ->assertStatus(200)->assertJsonPath('data.assigned_to', $this->admin->id);
    }

    public function test_comments_are_append_only_and_scoped()
    {
        $mine = Ticket::factory()->create(['reported_by' => $this->warga->id]);
        $theirs = Ticket::factory()->create();

        $this->actingAs($this->warga)->postJson("/api/tickets/{$mine->id}/comments", ['comment' => '<p>Kapan diperbaiki?</p>'])
            ->assertStatus(201);
        $this->actingAs($this->warga)->postJson("/api/tickets/{$theirs->id}/comments", ['comment' => 'x'])
            ->assertStatus(403);
    }

    public function test_attachments_enforce_count_and_type_limits()
    {
        Storage::fake('public');
        $ticket = Ticket::factory()->create(['reported_by' => $this->warga->id]);
        $photo = fn () => UploadedFile::fake()->image('lampu.jpg', 800, 600)->size(500);

        for ($i = 0; $i < 3; $i++) {
            $this->actingAs($this->warga)->postJson("/api/tickets/{$ticket->id}/attachments", ['photo' => $photo()])
                ->assertStatus(201);
        }

        // 4th photo rejected.
        $this->actingAs($this->warga)->postJson("/api/tickets/{$ticket->id}/attachments", ['photo' => $photo()])
            ->assertStatus(422);

        // Non-image rejected.
        $other = Ticket::factory()->create(['reported_by' => $this->warga->id]);
        $this->actingAs($this->warga)->postJson("/api/tickets/{$other->id}/attachments", [
            'photo' => UploadedFile::fake()->create('doc.txt', 100, 'text/plain'),
        ])->assertStatus(422);
    }
}
