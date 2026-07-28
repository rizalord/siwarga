<?php

namespace Tests\Feature\Api;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RbacTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $bendahara;

    private User $warga;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->admin = User::factory()->create(['name' => 'Admin']);
        $this->admin->roles()->attach(Role::where('name', 'admin')->first()->id);

        $this->bendahara = User::factory()->create(['name' => 'Bendahara']);
        $this->bendahara->roles()->attach(Role::where('name', 'bendahara')->first()->id);

        $this->warga = User::factory()->create(['name' => 'Warga']);
        $this->warga->roles()->attach(Role::where('name', 'warga')->first()->id);
    }

    public function test_warga_cannot_create_resident(): void
    {
        $response = $this->actingAs($this->warga)
            ->postJson('/api/residents', [
                'full_name' => 'Test',
                'status' => 'tetap',
                'phone_number' => '08123456789',
                'marital_status' => 'menikah',
            ]);

        $response->assertStatus(403);
    }

    public function test_warga_cannot_create_due_type(): void
    {
        $response = $this->actingAs($this->warga)
            ->postJson('/api/due-types', [
                'name' => 'Test',
                'amount' => 10000,
                'billing_cycle' => 'bulanan',
            ]);

        $response->assertStatus(403);
    }

    public function test_bendahara_cannot_manage_users(): void
    {
        $response = $this->actingAs($this->bendahara)
            ->getJson('/api/users');

        $response->assertStatus(403);
    }

    public function test_warga_cannot_generate_bills(): void
    {
        $response = $this->actingAs($this->warga)
            ->postJson('/api/bills/generate', [
                'month' => 7,
                'year' => 2026,
            ]);

        $response->assertStatus(403);
    }

    public function test_warga_can_view_bills(): void
    {
        $response = $this->actingAs($this->warga)
            ->getJson('/api/bills');

        $response->assertStatus(200);
    }

    public function test_admin_can_manage_users(): void
    {
        $response = $this->actingAs($this->admin)
            ->getJson('/api/users');

        $response->assertStatus(200);
    }

    public function test_bendahara_can_view_reports(): void
    {
        $response = $this->actingAs($this->bendahara)
            ->getJson('/api/reports/summary/2026');

        $response->assertStatus(200);
    }
}
