<?php

namespace Tests\Unit;

use App\Models\DueType;
use App\Models\House;
use App\Models\Resident;
use App\Services\BillGenerationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillGenerationServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_generates_bills_for_occupied_houses()
    {
        $dueType = DueType::factory()->create(['amount' => 100000, 'billing_cycle' => 'bulanan']);
        $house = House::factory()->create(['status' => 'dihuni']);
        $resident = Resident::factory()->create();
        $house->houseResidents()->create([
            'resident_id' => $resident->id,
            'start_date' => '2026-01-01',
        ]);

        $service = new BillGenerationService;
        $bills = $service->generate(1, 2026);

        $this->assertCount(1, $bills);
        $this->assertEquals(100000, $bills->first()->amount_due);
    }

    public function test_skips_empty_houses()
    {
        DueType::factory()->create();
        House::factory()->create(['status' => 'kosong']);

        $service = new BillGenerationService;
        $bills = $service->generate(1, 2026);

        $this->assertCount(0, $bills);
    }

    public function test_skips_houses_without_active_resident()
    {
        DueType::factory()->create();
        House::factory()->create(['status' => 'dihuni']);
        // No active resident assigned

        $service = new BillGenerationService;
        $bills = $service->generate(1, 2026);

        $this->assertCount(0, $bills);
    }

    public function test_skips_residents_whose_occupancy_starts_after_the_billed_period()
    {
        DueType::factory()->create(['amount' => 100000, 'billing_cycle' => 'bulanan']);
        $house = House::factory()->create(['status' => 'dihuni']);
        $resident = Resident::factory()->create();
        $house->houseResidents()->create([
            'resident_id' => $resident->id,
            'start_date' => '2026-09-01',
        ]);

        $service = new BillGenerationService;
        $bills = $service->generate(7, 2026);

        $this->assertCount(0, $bills);
    }

    public function test_flexible_due_type_uses_custom_period_and_amount()
    {
        $dueType = DueType::factory()->create(['amount' => 15000, 'billing_cycle' => 'fleksibel']);
        $house = House::factory()->create(['status' => 'dihuni']);
        $resident = Resident::factory()->create();
        $house->houseResidents()->create([
            'resident_id' => $resident->id,
            'start_date' => '2026-01-01',
        ]);

        $service = new BillGenerationService;
        $bills = $service->generateFlexible(
            $dueType->id,
            \Carbon\Carbon::parse('2026-08-01'),
            \Carbon\Carbon::parse('2026-08-31'),
            100000,
        );

        $this->assertCount(1, $bills);
        $this->assertEquals(100000, $bills->first()->amount_due);
        $this->assertEquals('2026-08-01', $bills->first()->period_start->toDateString());
        $this->assertEquals('2026-08-31', $bills->first()->period_end->toDateString());
        $this->assertEquals($dueType->id, $bills->first()->due_type_id);
    }

    public function test_is_idempotent()
    {
        $dueType = DueType::factory()->create(['amount' => 100000, 'billing_cycle' => 'bulanan']);
        $house = House::factory()->create(['status' => 'dihuni']);
        $resident = Resident::factory()->create();
        $house->houseResidents()->create([
            'resident_id' => $resident->id,
            'start_date' => '2026-01-01',
        ]);

        $service = new BillGenerationService;
        $service->generate(1, 2026);
        $bills = $service->generate(1, 2026);

        $this->assertCount(0, $bills);
        $this->assertDatabaseCount('bills', 1);
    }
}
