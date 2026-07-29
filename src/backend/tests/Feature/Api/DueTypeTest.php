<?php

namespace Tests\Feature\Api;

use App\Models\Bill;
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

    protected User $warga;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->user = User::factory()->create();
        $this->user->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->user->load('roles.permissions');

        $this->warga = User::factory()->create();
        $this->warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $this->warga->load('roles.permissions');
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

    public function test_can_filter_due_types_by_trashed_mode()
    {
        DueType::factory()->create(['name' => 'Iuran Aktif']);
        $deletedDueType = DueType::factory()->create(['name' => 'Iuran Terhapus']);
        $deletedDueType->delete();

        $this->getJson('/api/due-types')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Iuran Aktif');

        $this->getJson('/api/due-types?trashed=with')
            ->assertStatus(200)
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['name' => 'Iuran Aktif'])
            ->assertJsonFragment(['name' => 'Iuran Terhapus']);

        $this->getJson('/api/due-types?trashed=only')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Iuran Terhapus');
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

    public function test_can_restore_a_soft_deleted_due_type()
    {
        $dueType = DueType::factory()->create(['name' => 'Restore Due Type']);
        $dueType->delete();

        $this->postJson("/api/due-types/{$dueType->id}/restore")
            ->assertStatus(200)
            ->assertJsonPath('data.id', $dueType->id)
            ->assertJsonPath('data.deleted_at', null);

        $this->assertDatabaseHas('due_types', ['id' => $dueType->id, 'deleted_at' => null]);
    }

    public function test_can_force_delete_a_soft_deleted_due_type()
    {
        $dueType = DueType::factory()->create(['name' => 'Force Due Type']);
        $dueType->delete();

        $this->deleteJson("/api/due-types/{$dueType->id}/force-delete")
            ->assertStatus(200)
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', 'Deleted permanently');

        $this->assertDatabaseMissing('due_types', ['id' => $dueType->id]);
    }

    public function test_can_bulk_restore_due_types()
    {
        $dueTypes = DueType::factory()->count(2)->create();
        $dueTypes->each->delete();

        $this->postJson('/api/due-types/bulk-restore', [
            'ids' => $dueTypes->modelKeys(),
        ])
            ->assertStatus(200)
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', '2 data berhasil dipulihkan');

        $this->assertDatabaseHas('due_types', ['id' => $dueTypes[0]->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('due_types', ['id' => $dueTypes[1]->id, 'deleted_at' => null]);
    }

    public function test_can_bulk_force_delete_due_types()
    {
        $dueTypes = DueType::factory()->count(2)->create();
        $dueTypes->each->delete();

        $this->postJson('/api/due-types/bulk-force-delete', [
            'ids' => $dueTypes->modelKeys(),
        ])
            ->assertStatus(200)
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', '2 data berhasil dihapus permanen');

        $this->assertDatabaseMissing('due_types', ['id' => $dueTypes[0]->id]);
        $this->assertDatabaseMissing('due_types', ['id' => $dueTypes[1]->id]);
    }

    public function test_bulk_force_delete_due_types_returns_validation_error_when_a_due_type_is_still_referenced()
    {
        $dueType = DueType::factory()->create();
        Bill::factory()->create(['due_type_id' => $dueType->id]);
        $dueType->delete();

        $this->postJson('/api/due-types/bulk-force-delete', [
            'ids' => [$dueType->id],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('ids');

        $this->assertDatabaseHas('due_types', ['id' => $dueType->id]);
    }

    public function test_warga_cannot_restore_or_permanently_delete_due_types()
    {
        $dueType = DueType::factory()->create();
        $dueType->delete();

        $this->actingAs($this->warga)
            ->postJson("/api/due-types/{$dueType->id}/restore")
            ->assertStatus(403);

        $this->actingAs($this->warga)
            ->deleteJson("/api/due-types/{$dueType->id}/force-delete")
            ->assertStatus(403);

        $this->actingAs($this->warga)
            ->postJson('/api/due-types/bulk-restore', ['ids' => [$dueType->id]])
            ->assertStatus(403);

        $this->actingAs($this->warga)
            ->postJson('/api/due-types/bulk-force-delete', ['ids' => [$dueType->id]])
            ->assertStatus(403);
    }

    public function test_bulk_restore_and_force_delete_validate_ids_payload_for_due_types()
    {
        foreach (['/api/due-types/bulk-restore', '/api/due-types/bulk-force-delete'] as $uri) {
            $this->postJson($uri, ['ids' => []])
                ->assertStatus(422)
                ->assertJsonValidationErrors('ids');

            $this->postJson($uri, ['ids' => ['invalid']])
                ->assertStatus(422)
                ->assertJsonValidationErrors('ids.0');
        }
    }
}
