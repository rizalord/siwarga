<?php

namespace Tests\Feature\Api;

use App\Models\House;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ResidentTest extends TestCase
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

    public function test_can_list_residents()
    {
        Resident::factory()->count(3)->create();

        $response = $this->getJson('/api/residents');

        $response->assertStatus(200)->assertJsonCount(3, 'data');
    }

    public function test_can_filter_residents_by_status_and_search()
    {
        Resident::factory()->create(['status' => 'tetap', 'full_name' => 'Budi Santoso', 'phone_number' => '081111111111']);
        Resident::factory()->create(['status' => 'kontrak', 'full_name' => 'Ani Wijaya', 'phone_number' => '082222222222']);

        $this->getJson('/api/residents?status=kontrak')
            ->assertStatus(200)->assertJsonCount(1, 'data');

        $this->getJson('/api/residents?search=Budi')
            ->assertStatus(200)->assertJsonCount(1, 'data');

        $this->getJson('/api/residents?search=082222222222')
            ->assertStatus(200)->assertJsonCount(1, 'data');
    }

    public function test_can_filter_residents_by_trashed_mode()
    {
        Resident::factory()->create(['full_name' => 'Resident Aktif']);
        $deletedResident = Resident::factory()->create(['full_name' => 'Resident Terhapus']);
        $deletedResident->delete();

        $this->getJson('/api/residents')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.full_name', 'Resident Aktif');

        $this->getJson('/api/residents?trashed=with')
            ->assertStatus(200)
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['full_name' => 'Resident Aktif'])
            ->assertJsonFragment(['full_name' => 'Resident Terhapus']);

        $this->getJson('/api/residents?trashed=only')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.full_name', 'Resident Terhapus');
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

    public function test_can_upload_and_retrieve_ktp_photo(): void
    {
        Storage::fake('public');

        $data = [
            'full_name' => 'Test Foto',
            'status' => 'tetap',
            'phone_number' => '08123456789',
            'marital_status' => 'menikah',
            'ktp_photo' => UploadedFile::fake()->image('ktp.jpg'),
        ];

        $response = $this->postJson('/api/residents', $data);

        $response->assertStatus(201);
        $resident = Resident::first();
        Storage::disk('public')->assertExists($resident->ktp_photo_path);

        $show = $this->getJson("/api/residents/{$resident->id}");
        $show->assertStatus(200);
        $this->assertNotNull($show->json('data.ktp_photo_url'));
        $this->assertStringContainsString($resident->ktp_photo_path, $show->json('data.ktp_photo_url'));
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

    public function test_cannot_delete_resident_actively_assigned_to_a_house()
    {
        $resident = Resident::factory()->create();
        $house = House::factory()->create();
        $house->houseResidents()->create([
            'resident_id' => $resident->id,
            'start_date' => '2026-01-01',
        ]);

        $response = $this->deleteJson("/api/residents/{$resident->id}");

        $response->assertStatus(422);
        $this->assertDatabaseHas('residents', ['id' => $resident->id, 'deleted_at' => null]);
    }

    public function test_can_sort_residents_by_full_name()
    {
        Resident::factory()->create(['full_name' => 'Zulkifli']);
        Resident::factory()->create(['full_name' => 'Ani']);

        $response = $this->getJson('/api/residents?sort=full_name&order=asc');

        $response->assertStatus(200);
        $this->assertEquals('Ani', $response->json('data.0.full_name'));
        $this->assertEquals('Zulkifli', $response->json('data.1.full_name'));
    }

    public function test_can_bulk_delete_residents()
    {
        $residents = Resident::factory()->count(3)->create();

        $response = $this->postJson('/api/residents/bulk-delete', [
            'ids' => $residents->pluck('id')->take(2)->toArray(),
        ]);

        $response->assertStatus(200);
        $this->assertSoftDeleted($residents[0]);
        $this->assertSoftDeleted($residents[1]);
        $this->assertDatabaseHas('residents', ['id' => $residents[2]->id, 'deleted_at' => null]);
    }

    public function test_can_restore_a_soft_deleted_resident()
    {
        $resident = Resident::factory()->create(['full_name' => 'Budi Restore']);
        $resident->delete();

        $this->postJson("/api/residents/{$resident->id}/restore")
            ->assertStatus(200)
            ->assertJsonPath('data.id', $resident->id)
            ->assertJsonPath('data.deleted_at', null);

        $this->assertDatabaseHas('residents', ['id' => $resident->id, 'deleted_at' => null]);
    }

    public function test_can_force_delete_a_soft_deleted_resident()
    {
        $resident = Resident::factory()->create(['full_name' => 'Budi Force Delete']);
        $resident->delete();

        $this->deleteJson("/api/residents/{$resident->id}/force-delete")
            ->assertStatus(200)
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', 'Deleted permanently');

        $this->assertDatabaseMissing('residents', ['id' => $resident->id]);
    }

    public function test_can_bulk_restore_residents()
    {
        $residents = Resident::factory()->count(2)->create();
        $residents->each->delete();

        $this->postJson('/api/residents/bulk-restore', [
            'ids' => $residents->modelKeys(),
        ])
            ->assertStatus(200)
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', '2 data berhasil dipulihkan');

        $this->assertDatabaseHas('residents', ['id' => $residents[0]->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('residents', ['id' => $residents[1]->id, 'deleted_at' => null]);
    }

    public function test_can_bulk_force_delete_residents()
    {
        $residents = Resident::factory()->count(2)->create();
        $residents->each->delete();

        $this->postJson('/api/residents/bulk-force-delete', [
            'ids' => $residents->modelKeys(),
        ])
            ->assertStatus(200)
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', '2 data berhasil dihapus permanen');

        $this->assertDatabaseMissing('residents', ['id' => $residents[0]->id]);
        $this->assertDatabaseMissing('residents', ['id' => $residents[1]->id]);
    }

    public function test_warga_cannot_restore_or_permanently_delete_residents()
    {
        $resident = Resident::factory()->create();
        $resident->delete();

        $this->actingAs($this->warga)
            ->postJson("/api/residents/{$resident->id}/restore")
            ->assertStatus(403);

        $this->actingAs($this->warga)
            ->deleteJson("/api/residents/{$resident->id}/force-delete")
            ->assertStatus(403);

        $this->actingAs($this->warga)
            ->postJson('/api/residents/bulk-restore', ['ids' => [$resident->id]])
            ->assertStatus(403);

        $this->actingAs($this->warga)
            ->postJson('/api/residents/bulk-force-delete', ['ids' => [$resident->id]])
            ->assertStatus(403);
    }

    public function test_bulk_restore_and_force_delete_validate_ids_payload_for_residents()
    {
        foreach (['/api/residents/bulk-restore', '/api/residents/bulk-force-delete'] as $uri) {
            $this->postJson($uri, ['ids' => []])
                ->assertStatus(422)
                ->assertJsonValidationErrors('ids');

            $this->postJson($uri, ['ids' => ['invalid']])
                ->assertStatus(422)
                ->assertJsonValidationErrors('ids.0');
        }
    }
}
