<?php

namespace Tests\Feature\Api;

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

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

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
}
