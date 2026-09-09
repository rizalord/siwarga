<?php

namespace App\Http\Resources;

use App\Models\HouseResident;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FamilyMemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $canSeeNik = $user !== null
            && ($user->hasPermission('family-members.manage') || $this->isOwnHouse($user));

        return [
            'id' => $this->id,
            'house_id' => $this->house_id,
            'house_number' => $this->house?->house_number,
            'name' => $this->name,
            'relationship' => $this->relationship,
            'nik' => $canSeeNik ? $this->nik : null,
            'birth_date' => $this->birth_date,
            'phone' => $this->phone,
            'created_at' => $this->created_at,
        ];
    }

    private function isOwnHouse(User $user): bool
    {
        if ($user->resident_id === null) {
            return false;
        }

        return HouseResident::where('resident_id', $user->resident_id)
            ->whereNull('end_date')
            ->where('house_id', $this->house_id)
            ->exists();
    }
}
