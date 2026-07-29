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

    public function test_soft_deleted_expense_category_does_not_appear_in_list()
    {
        $category = ExpenseCategory::factory()->create(['name' => 'Keamanan']);
        $category->delete();
        ExpenseCategory::factory()->create(['name' => 'Kebersihan']);

        $response = $this->actingAs($this->admin)->getJson('/api/expense-categories');

        $response->assertStatus(200)->assertJsonCount(1, 'data');
        $response->assertJsonMissing(['name' => 'Keamanan']);
    }

    public function test_trashed_with_returns_active_and_soft_deleted_expense_categories()
    {
        ExpenseCategory::factory()->create(['name' => 'Aktif']);
        $deleted = ExpenseCategory::factory()->create(['name' => 'Terhapus']);
        $deleted->delete();

        $response = $this->actingAs($this->admin)->getJson('/api/expense-categories?trashed=with');

        $response->assertStatus(200)->assertJsonCount(2, 'data');
        $response->assertJsonFragment(['name' => 'Aktif']);
        $response->assertJsonFragment(['name' => 'Terhapus']);
    }

    public function test_trashed_only_returns_only_soft_deleted_expense_categories()
    {
        ExpenseCategory::factory()->create(['name' => 'Aktif']);
        $deleted = ExpenseCategory::factory()->create(['name' => 'Terhapus']);
        $deleted->delete();

        $response = $this->actingAs($this->admin)->getJson('/api/expense-categories?trashed=only');

        $response->assertStatus(200)->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.name', 'Terhapus');
    }

    public function test_absent_or_invalid_trashed_filter_returns_only_active_expense_categories()
    {
        ExpenseCategory::factory()->create(['name' => 'Aktif']);
        $deleted = ExpenseCategory::factory()->create(['name' => 'Terhapus']);
        $deleted->delete();

        $this->actingAs($this->admin)
            ->getJson('/api/expense-categories')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Aktif');

        $this->actingAs($this->admin)
            ->getJson('/api/expense-categories?trashed=invalid')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Aktif');
    }

    public function test_bulk_restore_returns_the_restored_count()
    {
        $categories = ExpenseCategory::factory()->count(2)->create();
        $categories->each->delete();

        $response = $this->actingAs($this->admin)->postJson('/api/expense-categories/bulk-restore', [
            'ids' => $categories->pluck('id')->toArray(),
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', '2 data berhasil dipulihkan');
        $this->assertDatabaseHas('expense_categories', ['id' => $categories[0]->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('expense_categories', ['id' => $categories[1]->id, 'deleted_at' => null]);
    }

    public function test_bulk_force_delete_returns_the_permanently_removed_count()
    {
        $categories = ExpenseCategory::factory()->count(2)->create();
        $categories->each->delete();

        $response = $this->actingAs($this->admin)->postJson('/api/expense-categories/bulk-force-delete', [
            'ids' => $categories->pluck('id')->toArray(),
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', '2 data berhasil dihapus permanen');
        $this->assertDatabaseMissing('expense_categories', ['id' => $categories[0]->id]);
        $this->assertDatabaseMissing('expense_categories', ['id' => $categories[1]->id]);
    }

    public function test_bulk_force_delete_returns_validation_error_when_a_category_is_still_referenced()
    {
        $category = ExpenseCategory::factory()->create();
        Expense::factory()->create(['category_id' => $category->id]);
        $category->delete();

        $response = $this->actingAs($this->admin)->postJson('/api/expense-categories/bulk-force-delete', [
            'ids' => [$category->id],
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('ids');
        $this->assertDatabaseHas('expense_categories', ['id' => $category->id]);
    }

    public function test_can_restore_a_soft_deleted_expense_category()
    {
        $category = ExpenseCategory::factory()->create(['name' => 'Keamanan']);
        $category->delete();

        $response = $this->actingAs($this->admin)->postJson("/api/expense-categories/{$category->id}/restore");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $category->id)
            ->assertJsonPath('data.name', 'Keamanan')
            ->assertJsonPath('data.deleted_at', null);
        $this->assertDatabaseHas('expense_categories', ['id' => $category->id, 'deleted_at' => null]);
    }

    public function test_can_force_delete_a_soft_deleted_expense_category()
    {
        $category = ExpenseCategory::factory()->create(['name' => 'Keamanan']);
        $category->delete();

        $response = $this->actingAs($this->admin)->deleteJson("/api/expense-categories/{$category->id}/force-delete");

        $response->assertStatus(200)
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', 'Deleted permanently');
        $this->assertDatabaseMissing('expense_categories', ['id' => $category->id]);
    }

    public function test_creating_expense_category_with_duplicate_name_fails_validation()
    {
        ExpenseCategory::factory()->create(['name' => 'Keamanan']);

        $response = $this->actingAs($this->admin)->postJson('/api/expense-categories', [
            'name' => 'Keamanan',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('name');
    }

    public function test_creating_expense_category_with_name_of_soft_deleted_category_fails_validation()
    {
        $category = ExpenseCategory::factory()->create(['name' => 'Keamanan']);
        $category->delete();

        $response = $this->actingAs($this->admin)->postJson('/api/expense-categories', [
            'name' => 'Keamanan',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('name');
    }

    public function test_updating_expense_category_to_keep_its_own_name_succeeds()
    {
        $category = ExpenseCategory::factory()->create(['name' => 'Keamanan']);

        $response = $this->actingAs($this->admin)->putJson("/api/expense-categories/{$category->id}", [
            'name' => 'Keamanan',
        ]);

        $response->assertStatus(200)->assertJsonPath('data.name', 'Keamanan');
    }

    public function test_updating_expense_category_to_duplicate_name_fails_validation()
    {
        ExpenseCategory::factory()->create(['name' => 'Keamanan']);
        $category = ExpenseCategory::factory()->create(['name' => 'Kebersihan']);

        $response = $this->actingAs($this->admin)->putJson("/api/expense-categories/{$category->id}", [
            'name' => 'Keamanan',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('name');
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

    public function test_warga_cannot_restore_expense_category()
    {
        $category = ExpenseCategory::factory()->create(['name' => 'Keamanan']);
        $category->delete();

        $response = $this->actingAs($this->warga)->postJson("/api/expense-categories/{$category->id}/restore");

        $response->assertStatus(403);
    }

    public function test_warga_cannot_force_delete_expense_category()
    {
        $category = ExpenseCategory::factory()->create(['name' => 'Keamanan']);
        $category->delete();

        $response = $this->actingAs($this->warga)->deleteJson("/api/expense-categories/{$category->id}/force-delete");

        $response->assertStatus(403);
    }

    public function test_warga_cannot_bulk_restore_expense_categories()
    {
        $categories = ExpenseCategory::factory()->count(2)->create();
        $categories->each->delete();

        $response = $this->actingAs($this->warga)->postJson('/api/expense-categories/bulk-restore', [
            'ids' => $categories->pluck('id')->toArray(),
        ]);

        $response->assertStatus(403);
    }

    public function test_warga_cannot_bulk_force_delete_expense_categories()
    {
        $categories = ExpenseCategory::factory()->count(2)->create();
        $categories->each->delete();

        $response = $this->actingAs($this->warga)->postJson('/api/expense-categories/bulk-force-delete', [
            'ids' => $categories->pluck('id')->toArray(),
        ]);

        $response->assertStatus(403);
    }
}
