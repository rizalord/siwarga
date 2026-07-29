<?php

namespace Tests\Feature\Api;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExpenseCategoryTest extends TestCase
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

    public function test_can_list_expense_categories()
    {
        ExpenseCategory::factory()->count(3)->create();

        $response = $this->actingAs($this->admin)->getJson('/api/expense-categories');

        $response->assertStatus(200)->assertJsonCount(3, 'data');
    }

    public function test_can_search_expense_categories_by_name()
    {
        ExpenseCategory::factory()->create(['name' => 'Keamanan']);
        ExpenseCategory::factory()->create(['name' => 'Kebersihan']);

        $response = $this->actingAs($this->admin)->getJson('/api/expense-categories?search=Keamanan');

        $response->assertStatus(200)->assertJsonCount(1, 'data');
    }

    public function test_can_create_expense_category()
    {
        $response = $this->actingAs($this->admin)->postJson('/api/expense-categories', [
            'name' => 'Keamanan',
        ]);

        $response->assertStatus(201)->assertJsonPath('data.name', 'Keamanan');
    }

    public function test_validates_required_expense_category_fields()
    {
        $response = $this->actingAs($this->admin)->postJson('/api/expense-categories', []);

        $response->assertStatus(422);
    }

    public function test_can_show_expense_category()
    {
        $category = ExpenseCategory::factory()->create();

        $response = $this->actingAs($this->admin)->getJson("/api/expense-categories/{$category->id}");

        $response->assertStatus(200)->assertJsonPath('data.id', $category->id);
    }

    public function test_can_update_expense_category()
    {
        $category = ExpenseCategory::factory()->create(['name' => 'Lama']);

        $response = $this->actingAs($this->admin)->putJson("/api/expense-categories/{$category->id}", [
            'name' => 'Baru',
        ]);

        $response->assertStatus(200)->assertJsonPath('data.name', 'Baru');
    }

    public function test_can_soft_delete_unused_expense_category()
    {
        $category = ExpenseCategory::factory()->create();

        $this->actingAs($this->admin)->deleteJson("/api/expense-categories/{$category->id}");

        $this->assertSoftDeleted($category);
    }

    public function test_can_soft_delete_expense_category_even_when_referenced_by_an_expense()
    {
        $category = ExpenseCategory::factory()->create();
        Expense::factory()->create(['category_id' => $category->id]);

        $response = $this->actingAs($this->admin)->deleteJson("/api/expense-categories/{$category->id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted($category);
    }

    public function test_can_bulk_delete_expense_categories()
    {
        $categories = ExpenseCategory::factory()->count(3)->create();

        $response = $this->actingAs($this->admin)->postJson('/api/expense-categories/bulk-delete', [
            'ids' => $categories->pluck('id')->take(2)->toArray(),
        ]);

        $response->assertStatus(200);
        $this->assertSoftDeleted($categories[0]);
        $this->assertSoftDeleted($categories[1]);
        $this->assertDatabaseHas('expense_categories', ['id' => $categories[2]->id, 'deleted_at' => null]);
    }

    public function test_warga_cannot_manage_expense_categories()
    {
        $response = $this->actingAs($this->warga)->postJson('/api/expense-categories', [
            'name' => 'Keamanan',
        ]);

        $response->assertStatus(403);
    }

    public function test_warga_cannot_view_expense_categories()
    {
        $response = $this->actingAs($this->warga)->getJson('/api/expense-categories');

        $response->assertStatus(403);
    }
}
