<?php

namespace Tests\Unit;

use App\Models\Bill;
use App\Models\House;
use App\Models\Resident;
use App\Services\HouseService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class HouseServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_cannot_delete_house_with_active_resident()
    {
        $house = House::factory()->create();
        $resident = Resident::factory()->create();
        $house->houseResidents()->create([
            'resident_id' => $resident->id,
            'start_date' => '2026-01-01',
        ]);

        $this->expectException(ValidationException::class);

        (new HouseService)->delete($house);
    }

    public function test_cannot_delete_house_with_bill_history()
    {
        $house = House::factory()->create();
        Bill::factory()->create(['house_id' => $house->id]);

        $this->expectException(ValidationException::class);

        (new HouseService)->delete($house);
    }

    public function test_can_delete_house_without_history()
    {
        $house = House::factory()->create();

        (new HouseService)->delete($house);

        $this->assertSoftDeleted($house);
    }

    public function test_assign_resident_closes_previous_assignment_and_marks_house_occupied()
    {
        $house = House::factory()->create(['status' => 'kosong']);
        $firstResident = Resident::factory()->create();
        $house->houseResidents()->create([
            'resident_id' => $firstResident->id,
            'start_date' => '2026-01-01',
        ]);

        $secondResident = Resident::factory()->create();
        (new HouseService)->assignResident($house, $secondResident->id, '2026-02-01', null);

        $this->assertEquals('2026-02-01', $house->houseResidents()->where('resident_id', $firstResident->id)->first()->end_date->toDateString());
        $this->assertDatabaseHas('house_residents', [
            'house_id' => $house->id,
            'resident_id' => $secondResident->id,
            'end_date' => null,
        ]);
        $this->assertEquals('dihuni', $house->fresh()->status);
    }

    public function test_vacate_resident_without_active_assignment_throws()
    {
        $house = House::factory()->create();

        $this->expectException(ValidationException::class);

        (new HouseService)->vacateResident($house, null);
    }
}
