<?php

namespace Tests\Unit;

use App\Models\House;
use App\Models\Resident;
use App\Services\ResidentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ResidentServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_cannot_delete_resident_with_active_house()
    {
        $resident = Resident::factory()->create();
        $house = House::factory()->create();
        $house->houseResidents()->create([
            'resident_id' => $resident->id,
            'start_date' => '2026-01-01',
        ]);

        $this->expectException(ValidationException::class);

        (new ResidentService)->delete($resident);
    }

    public function test_can_delete_resident_without_active_house()
    {
        $resident = Resident::factory()->create();

        (new ResidentService)->delete($resident);

        $this->assertSoftDeleted($resident);
    }

    public function test_deletable_ids_excludes_residents_with_active_house()
    {
        $freeResident = Resident::factory()->create();
        $placedResident = Resident::factory()->create();
        $house = House::factory()->create();
        $house->houseResidents()->create([
            'resident_id' => $placedResident->id,
            'start_date' => '2026-01-01',
        ]);

        $deletableIds = (new ResidentService)->deletableIds([$freeResident->id, $placedResident->id]);

        $this->assertEquals([$freeResident->id], $deletableIds->all());
    }
}
