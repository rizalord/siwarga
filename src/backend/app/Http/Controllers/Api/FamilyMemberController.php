<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\FamilyMemberResource;
use App\Models\FamilyMember;
use App\Models\HouseResident;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FamilyMemberController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $user = $request->user();
        $query = FamilyMember::query()->with('house:id,house_number');

        if (! $user->hasPermission('family-members.manage')) {
            $query->where('house_id', $this->ownHouseId($user));
        } elseif ($request->filled('house_id')) {
            $query->where('house_id', $request->house_id);
        }

        if ($request->filled('relationship')) {
            $query->where('relationship', $request->relationship);
        }

        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        $this->applySorting($query, $request, ['name', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), FamilyMemberResource::class);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $validated = $this->validateMember($request);

        // Non-managers can only add to their own house — ignore forged house_id.
        $validated['house_id'] = $user->hasPermission('family-members.manage')
            ? ($validated['house_id'] ?? $this->ownHouseId($user))
            : $this->ownHouseId($user);

        abort_if($validated['house_id'] === null, 422, 'Akun Anda tidak terhubung ke rumah mana pun.');

        return (new FamilyMemberResource(FamilyMember::create($validated)->load('house')))->response()->setStatusCode(201);
    }

    public function show(FamilyMember $familyMember)
    {
        $this->authorize('view', $familyMember);

        return new FamilyMemberResource($familyMember->load('house'));
    }

    public function update(Request $request, FamilyMember $familyMember)
    {
        $this->authorize('update', $familyMember);

        $validated = $this->validateMember($request, true);
        unset($validated['house_id']);
        $familyMember->update($validated);

        return new FamilyMemberResource($familyMember->fresh('house'));
    }

    public function destroy(FamilyMember $familyMember)
    {
        $this->authorize('delete', $familyMember);
        $familyMember->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateMember(Request $request, bool $sometimes = false): array
    {
        $sometimesRule = $sometimes ? 'sometimes' : '';

        return $request->validate([
            'house_id' => [$sometimesRule, 'nullable', 'integer', 'exists:houses,id'],
            'name' => [$sometimesRule, 'required', 'string', 'max:100'],
            'relationship' => [$sometimesRule, 'required', Rule::in([
                'kepala_keluarga', 'pasangan', 'anak', 'orang_tua', 'famili_lain', 'pembantu', 'kontrak',
            ])],
            'nik' => [$sometimesRule, 'nullable', 'string', 'max:20'],
            'birth_date' => [$sometimesRule, 'nullable', 'date'],
            'phone' => [$sometimesRule, 'nullable', 'string', 'max:30'],
        ]);
    }

    private function ownHouseId($user): ?int
    {
        if ($user->resident_id === null) {
            return null;
        }

        return HouseResident::where('resident_id', $user->resident_id)
            ->whereNull('end_date')
            ->value('house_id');
    }
}
