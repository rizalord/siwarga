<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FamilyMember;
use App\Models\House;
use App\Models\HouseResident;
use Illuminate\Http\Request;

class HouseholdCardController extends Controller
{
    public function show(Request $request)
    {
        $houseId = HouseResident::where('resident_id', $request->user()->resident_id)
            ->whereNull('end_date')
            ->value('house_id');

        abort_if($houseId === null, 422, 'Akun Anda tidak terhubung ke rumah mana pun.');

        $house = House::findOrFail($houseId);

        return response()->json([
            'data' => [
                'house_id' => $house->id,
                'house_number' => $house->house_number,
                'address' => $house->address,
                'head_name' => $this->headName($house->id),
                'member_count' => FamilyMember::where('house_id', $house->id)->count(),
                'verify_token' => $this->sign($house->id),
            ],
        ]);
    }

    public function verify(string $token)
    {
        $parts = explode('.', $token, 2);

        if (count($parts) !== 2 || ! ctype_digit($parts[0])) {
            abort(404);
        }

        $house = House::find($parts[0]);

        if ($house === null || ! hash_equals($this->sign($house->id), $token)) {
            abort(404);
        }

        return response()->json([
            'data' => [
                'house_number' => $house->house_number,
                'address' => $house->address,
                'head_name' => $this->headName($house->id),
            ],
        ]);
    }

    private function sign(int $houseId): string
    {
        return $houseId.'.'.hash_hmac('sha256', "household:{$houseId}", config('app.key'));
    }

    private function headName(int $houseId): string
    {
        return FamilyMember::where('house_id', $houseId)
            ->orderByRaw("relationship = 'kepala_keluarga' DESC")
            ->orderBy('id')
            ->value('name') ?? '—';
    }
}
