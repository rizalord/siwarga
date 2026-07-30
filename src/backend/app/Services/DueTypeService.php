<?php

namespace App\Services;

use App\Models\DueType;

class DueTypeService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): DueType
    {
        return DueType::create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(DueType $dueType, array $data): DueType
    {
        $dueType->update($data);

        return $dueType;
    }

    public function delete(DueType $dueType): void
    {
        $dueType->delete();
    }
}
