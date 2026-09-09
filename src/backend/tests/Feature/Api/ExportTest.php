<?php

namespace Tests\Feature\Api;

use App\Models\Bill;
use App\Models\DueType;
use App\Models\Expense;
use App\Models\House;
use App\Models\Payment;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExportTest extends TestCase
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

        $resident = Resident::factory()->create();
        $house = House::factory()->create();
        $house->residents()->attach($resident->id, ['start_date' => now()->subMonth()]);
        $dueType = DueType::factory()->create();
        $bill = Bill::factory()->create([
            'house_id' => $house->id, 'resident_id' => $resident->id,
            'due_type_id' => $dueType->id, 'amount_due' => 50000, 'status' => 'belum_lunas',
        ]);
        Payment::factory()->create(['bill_id' => $bill->id, 'amount_paid' => 50000]);
        Expense::factory()->create();
    }

    public function test_monthly_pdf_download()
    {
        $response = $this->actingAs($this->admin)->get('/api/reports/monthly/'.now()->year.'/'.now()->month.'/pdf');

        $response->assertStatus(200)->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $response->streamedContent());
    }

    public function test_summary_pdf_download()
    {
        $this->actingAs($this->admin)->get('/api/reports/summary/'.now()->year.'/pdf')
            ->assertStatus(200)->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_excel_exports_download_with_correct_mime()
    {
        foreach (['residents', 'houses', 'bills', 'payments', 'expenses'] as $dataset) {
            $this->actingAs($this->admin)->get("/api/exports/{$dataset}/xlsx")
                ->assertStatus(200)
                ->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        }
    }

    public function test_backup_json_has_all_domains_without_passwords()
    {
        $backup = $this->actingAs($this->admin)->getJson('/api/backup/json')
            ->assertStatus(200)->assertJsonStructure(['data' => ['meta', 'domains']])->json('data');

        foreach (['residents', 'houses', 'bills', 'payments', 'expenses', 'users'] as $domain) {
            $this->assertArrayHasKey($domain, $backup['domains']);
        }

        $this->assertStringNotContainsString('password', json_encode($backup['domains']['users']));
    }

    public function test_warga_cannot_export_or_backup()
    {
        $this->actingAs($this->warga)->get('/api/reports/monthly/'.now()->year.'/'.now()->month.'/pdf')
            ->assertStatus(403);
        $this->actingAs($this->warga)->get('/api/exports/bills/xlsx')->assertStatus(403);
        $this->actingAs($this->warga)->getJson('/api/backup/json')->assertStatus(403);
    }

    public function test_export_rejects_invalid_year()
    {
        $this->actingAs($this->admin)->get('/api/reports/monthly/1999/1/pdf')
            ->assertStatus(422);
    }
}
