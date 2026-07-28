<?php

namespace Tests\Feature\Api;

use App\Models\DueType;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DueTypeTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->user = User::factory()->create();
        $this->user->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->user->load('roles.permissions');
        $this->actingAs($this->user);
    }

    public function test_can_list_due_types()
    {
        DueType::factory()->count(3)->create();

        $response = $this->getJson('/api/due-types');

        $response->assertStatus(200)->assertJsonCount(3, 'data');
    }

    public function test_can_search_due_types_by_name()
    {
        DueType::factory()->create(['name' => 'Iuran Satpam']);
        DueType::factory()->create(['name' => 'Iuran Kebersihan']);

        $response = $this->getJson('/api/due-types?search=Satpam');

        $response->assertStatus(200)->assertJsonCount(1, 'data');
    }

    public function test_can_create_due_type()
    {
        $data = ['name' => 'Iuran Kebersihan', 'amount' => 50000, 'billing_cycle' => 'bulanan'];

        $response = $this->postJson('/api/due-types', $data);

        $response->assertStatus(201)->assertJsonPath('data.name', 'Iuran Kebersihan');
    }

    public function test_validates_required_due_type_fields()
    {
        $response = $this->postJson('/api/due-types', []);

        $response->assertStatus(422);
    }

    public function test_can_show_due_type()
    {
        $dueType = DueType::factory()->create();

        $response = $this->getJson("/api/due-types/{$dueType->id}");

        $response->assertStatus(200);
    }

    public function test_can_update_due_type()
    {
        $dueType = DueType::factory()->create();

        $response = $this->putJson("/api/due-types/{$dueType->id}", ['amount' => 75000]);

        $response->assertStatus(200)->assertJsonPath('data.amount', 75000);
    }

    public function test_can_soft_delete_due_type()
    {
        $dueType = DueType::factory()->create();

        $this->deleteJson("/api/due-types/{$dueType->id}");

        $this->assertSoftDeleted($dueType);
    }

    public function test_can_sort_due_types_by_amount()
    {
        DueType::factory()->create(['amount' => 100000]);
        DueType::factory()->create(['amount' => 50000]);

        $response = $this->getJson('/api/due-types?sort=amount&order=asc');

        $response->assertStatus(200);
        $this->assertEquals(50000, $response->json('data.0.amount'));
        $this->assertEquals(100000, $response->json('data.1.amount'));
    }

    public function test_can_bulk_delete_due_types()
    {
        $dueTypes = DueType::factory()->count(3)->create();

        $response = $this->postJson('/api/due-types/bulk-delete', [
            'ids' => $dueTypes->pluck('id')->take(2)->toArray(),
        ]);

        $response->assertStatus(200);
        $this->assertSoftDeleted($dueTypes[0]);
        $this->assertSoftDeleted($dueTypes[1]);
        $this->assertDatabaseHas('due_types', ['id' => $dueTypes[2]->id, 'deleted_at' => null]);
    }
}
