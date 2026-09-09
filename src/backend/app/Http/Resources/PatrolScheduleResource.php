<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PatrolScheduleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'date' => $this->date,
            'shift' => $this->shift,
            'personnel_name' => $this->personnel_name,
            'user_id' => $this->user_id,
            'area' => $this->area,
            'note' => $this->note,
            'created_at' => $this->created_at,
        ];
    }
}
