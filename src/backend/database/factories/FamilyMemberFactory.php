<?php

namespace Database\Factories;

use App\Models\FamilyMember;
use App\Models\House;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FamilyMember>
 */
class FamilyMemberFactory extends Factory
{
    protected $model = FamilyMember::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'house_id' => House::factory(),
            'name' => $this->faker->name(),
            'relationship' => 'anak',
            'nik' => null,
            'birth_date' => null,
            'phone' => null,
        ];
    }
}
