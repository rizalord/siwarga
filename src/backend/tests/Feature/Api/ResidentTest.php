<?php

namespace Tests\Feature\Api;

use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResidentTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->user = User::factory()->create();
        $this->user->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->user->load('roles.permissions');
        $this->actingAs($this->user);
    }

    public function test_can_list_residents()
    {
        Resident::factory()->count(3)->create();

        $response = $this->getJson('/api/residents');

        $response->assertStatus(200)->assertJsonCount(3, 'data');
    }

    public function test_can_create_resident()
    {
        $data = [
            'full_name' => 'Test',
            'status' => 'tetap',
            'phone_number' => '08123456789',
            'marital_status' => 'menikah',
        ];

        $response = $this->postJson('/api/residents', $data);

        $response->assertStatus(201)->assertJsonPath('data.full_name', 'Test');
    }

    public function test_validates_required_fields()
    {
        $response = $this->postJson('/api/residents', []);

        $response->assertStatus(422);
    }

    public function test_can_soft_delete_resident()
    {
        $resident = Resident::factory()->create();

        $this->deleteJson("/api/residents/{$resident->id}");

        $this->assertSoftDeleted($resident);
    }
}
