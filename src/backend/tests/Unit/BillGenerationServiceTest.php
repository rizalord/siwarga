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
        $dueType = DueType::factory()->create(['amount' => 100000]);
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

    public function test_is_idempotent()
    {
        $dueType = DueType::factory()->create(['amount' => 100000]);
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
