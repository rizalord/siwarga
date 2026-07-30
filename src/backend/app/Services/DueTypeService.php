<?php

namespace App\Services;

use App\Models\DueType;

class DueTypeService
{
    public function create(array $data): DueType
    {
        return DueType::create($data);
    }

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
