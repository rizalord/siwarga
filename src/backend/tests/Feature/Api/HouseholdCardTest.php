<?php

namespace Tests\Feature\Api;

use App\Models\FamilyMember;
use App\Models\House;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HouseholdCardTest extends TestCase
{
    use RefreshDatabase;

    public function test_card_and_public_verify_expose_no_nik()
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $resident = Resident::factory()->create();
        $house = House::factory()->create(['house_number' => 'A-01', 'address' => 'Jl. Mawar 1']);
        $house->residents()->attach($resident->id, ['start_date' => now()->subMonth()]);
        FamilyMember::factory()->create([
            'house_id' => $house->id,
            'name' => 'Bapak KK',
            'relationship' => 'kepala_keluarga',
            'nik' => '1234567890123456',
        ]);

        $warga = User::factory()->create(['resident_id' => $resident->id]);
        $warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $warga->load('roles.permissions');

        $card = $this->actingAs($warga)->getJson('/api/households/card')
            ->assertStatus(200)
            ->assertJsonPath('data.head_name', 'Bapak KK')
            ->assertJsonStructure(['data' => ['verify_token']])
            ->json('data');

        $this->getJson("/api/public/households/{$card['verify_token']}")
            ->assertStatus(200)
            ->assertJsonPath('data.head_name', 'Bapak KK')
            ->assertJsonPath('data.address', 'Jl. Mawar 1')
            ->assertJsonMissing(['nik' => '1234567890123456']);

        $this->getJson('/api/public/households/999.invalid')->assertStatus(404);
    }
}
