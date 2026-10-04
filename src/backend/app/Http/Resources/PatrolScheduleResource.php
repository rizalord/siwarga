<?php

namespace App\Http\Resources;

use App\Models\PatrolSchedule;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PatrolSchedule
 */
class PatrolScheduleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
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
