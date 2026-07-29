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

class ExpenseTest extends TestCase
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

    public function test_can_list_expenses()
    {
        Expense::factory()->count(3)->create();

        $response = $this->getJson('/api/expenses');

        $response->assertStatus(200)->assertJsonCount(3, 'data');
    }

    public function test_can_filter_expenses_by_month_year_category_and_search()
    {
        $satpam = ExpenseCategory::factory()->create(['name' => 'Satpam']);
        $kebersihan = ExpenseCategory::factory()->create(['name' => 'Kebersihan']);

        Expense::factory()->create([
            'category_id' => $satpam->id,
            'description' => 'Gaji satpam bulan ini',
            'expense_date' => '2026-01-15',
        ]);
        Expense::factory()->create([
            'category_id' => $kebersihan->id,
            'expense_date' => '2026-02-15',
        ]);

        $this->getJson('/api/expenses?month=1&year=2026')
            ->assertStatus(200)->assertJsonCount(1, 'data');

        $this->getJson("/api/expenses?category_id={$satpam->id}")
            ->assertStatus(200)->assertJsonCount(1, 'data');

        $this->getJson('/api/expenses?search=Gaji')
            ->assertStatus(200)->assertJsonCount(1, 'data');
    }

    public function test_can_create_expense()
    {
        $category = ExpenseCategory::factory()->create(['name' => 'Listrik']);

        $response = $this->postJson('/api/expenses', [
            'category_id' => $category->id,
            'description' => 'Tagihan listrik Januari',
            'amount' => 500000,
            'expense_date' => '2026-01-10',
        ]);

        $response->assertStatus(201)->assertJsonPath('data.category.id', $category->id);
    }

    public function test_validates_required_expense_fields()
    {
        $response = $this->postJson('/api/expenses', []);

        $response->assertStatus(422);
    }

    public function test_validates_category_id_must_exist()
    {
        $response = $this->postJson('/api/expenses', [
            'category_id' => 999999,
            'amount' => 100000,
            'expense_date' => '2026-01-10',
        ]);

        $response->assertStatus(422);
    }

    public function test_can_show_expense()
    {
        $expense = Expense::factory()->create();

        $response = $this->getJson("/api/expenses/{$expense->id}");

        $response->assertStatus(200);
    }

    public function test_can_update_expense()
    {
        $expense = Expense::factory()->create(['amount' => 250000]);

        $response = $this->putJson("/api/expenses/{$expense->id}", ['amount' => 300000]);

        $response->assertStatus(200)->assertJsonPath('data.amount', 300000);
    }

    public function test_can_soft_delete_expense()
    {
        $expense = Expense::factory()->create();

        $this->deleteJson("/api/expenses/{$expense->id}");

        $this->assertSoftDeleted($expense);
    }

    public function test_can_sort_expenses_by_amount()
    {
        Expense::factory()->create(['amount' => 200000]);
        Expense::factory()->create(['amount' => 100000]);

        $response = $this->getJson('/api/expenses?sort=amount&order=asc');

        $response->assertStatus(200);
        $this->assertEquals(100000, $response->json('data.0.amount'));
        $this->assertEquals(200000, $response->json('data.1.amount'));
    }

    public function test_expense_still_shows_category_name_after_category_is_soft_deleted()
    {
        $category = ExpenseCategory::factory()->create(['name' => 'Keamanan']);
        $expense = Expense::factory()->create(['category_id' => $category->id]);

        $category->delete();

        $response = $this->getJson("/api/expenses/{$expense->id}");

        $response->assertStatus(200)->assertJsonPath('data.category.name', 'Keamanan');
    }

    public function test_can_bulk_delete_expenses()
    {
        $expenses = Expense::factory()->count(3)->create();

        $response = $this->postJson('/api/expenses/bulk-delete', [
            'ids' => $expenses->pluck('id')->take(2)->toArray(),
        ]);

        $response->assertStatus(200);
        $this->assertSoftDeleted($expenses[0]);
        $this->assertSoftDeleted($expenses[1]);
        $this->assertDatabaseHas('expenses', ['id' => $expenses[2]->id, 'deleted_at' => null]);
    }
}
