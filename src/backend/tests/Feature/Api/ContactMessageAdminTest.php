<?php

namespace Tests\Feature\Api;

use App\Models\ContactMessage;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContactMessageAdminTest extends TestCase
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

    public function test_admin_can_list_contact_messages()
    {
        ContactMessage::factory()->count(2)->create();

        $response = $this->actingAs($this->admin)->getJson('/api/contact-messages');

        $response->assertStatus(200)->assertJsonCount(2, 'data');
    }

    public function test_admin_can_view_a_contact_message()
    {
        $message = ContactMessage::factory()->create(['name' => 'Budi']);

        $response = $this->actingAs($this->admin)->getJson("/api/contact-messages/{$message->id}");

        $response->assertStatus(200)->assertJsonPath('data.name', 'Budi');
    }

    public function test_admin_can_mark_a_message_as_read()
    {
        $message = ContactMessage::factory()->create(['status' => 'new']);

        $response = $this->actingAs($this->admin)->postJson("/api/contact-messages/{$message->id}/mark-read");

        $response->assertStatus(200)->assertJsonPath('data.status', 'read');
        $this->assertDatabaseHas('contact_messages', ['id' => $message->id, 'status' => 'read']);
    }

    public function test_warga_cannot_list_contact_messages()
    {
        $response = $this->actingAs($this->warga)->getJson('/api/contact-messages');

        $response->assertStatus(403);
    }
}
