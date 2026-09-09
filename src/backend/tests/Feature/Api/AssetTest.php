<?php

namespace Tests\Feature\Api;

use App\Models\Asset;
use App\Models\AssetLoan;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssetTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $warga;

    protected Asset $chairs;

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

        $this->chairs = Asset::factory()->create(['name' => 'Kursi Lipat', 'quantity' => 10]);
    }

    public function test_warga_can_request_loan_and_admin_approves_within_stock()
    {
        $loan = $this->actingAs($this->warga)->postJson('/api/asset-loans', [
            'asset_id' => $this->chairs->id, 'quantity' => 4,
        ])->assertStatus(201)->assertJsonPath('data.status', 'pending')->json('data');

        $this->actingAs($this->admin)->postJson("/api/asset-loans/{$loan['id']}/approve")
            ->assertStatus(200)->assertJsonPath('data.status', 'approved');

        $this->actingAs($this->warga)->getJson('/api/assets')->assertStatus(200)
            ->assertJsonPath('data.0.available', 6);
    }

    public function test_approve_beyond_available_stock_fails()
    {
        $first = AssetLoan::create(['asset_id' => $this->chairs->id, 'borrowed_by' => $this->warga->id, 'quantity' => 8, 'status' => 'pending']);
        $second = AssetLoan::create(['asset_id' => $this->chairs->id, 'borrowed_by' => $this->warga->id, 'quantity' => 5, 'status' => 'pending']);

        $this->actingAs($this->admin)->postJson("/api/asset-loans/{$first->id}/approve")->assertStatus(200);
        $this->actingAs($this->admin)->postJson("/api/asset-loans/{$second->id}/approve")->assertStatus(422);
    }

    public function test_reject_and_return_flows()
    {
        $loan = AssetLoan::create(['asset_id' => $this->chairs->id, 'borrowed_by' => $this->warga->id, 'quantity' => 2, 'status' => 'pending']);

        $this->actingAs($this->admin)->postJson("/api/asset-loans/{$loan->id}/reject")
            ->assertStatus(200)->assertJsonPath('data.status', 'rejected');

        $again = AssetLoan::create(['asset_id' => $this->chairs->id, 'borrowed_by' => $this->warga->id, 'quantity' => 2, 'status' => 'pending']);
        $this->actingAs($this->admin)->postJson("/api/asset-loans/{$again->id}/approve")->assertStatus(200);
        $this->actingAs($this->admin)->postJson("/api/asset-loans/{$again->id}/return")
            ->assertStatus(200)->assertJsonPath('data.status', 'returned');

        $this->actingAs($this->warga)->getJson('/api/assets')->assertStatus(200)
            ->assertJsonPath('data.0.available', 10);
    }

    public function test_warga_cannot_review_loans()
    {
        $loan = AssetLoan::create(['asset_id' => $this->chairs->id, 'borrowed_by' => $this->warga->id, 'quantity' => 1, 'status' => 'pending']);

        $this->actingAs($this->warga)->postJson("/api/asset-loans/{$loan->id}/approve")->assertStatus(403);
    }

    public function test_admin_can_crud_assets()
    {
        $created = $this->actingAs($this->admin)->postJson('/api/assets', [
            'name' => 'Sound System', 'quantity' => 2, 'condition' => 'baik',
        ])->assertStatus(201)->json('data');

        $this->actingAs($this->admin)->putJson("/api/assets/{$created['id']}", ['quantity' => 3])
            ->assertStatus(200);
        $this->actingAs($this->admin)->deleteJson("/api/assets/{$created['id']}")->assertStatus(200);
        $this->assertSoftDeleted('assets', ['id' => $created['id']]);
    }
}
