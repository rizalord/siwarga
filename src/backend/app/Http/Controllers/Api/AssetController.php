<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AssetResource;
use App\Models\Asset;
use App\Services\AssetService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class AssetController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private AssetService $assetService) {}

    public function index(Request $request)
    {
        $query = Asset::query();

        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        $this->applySorting($query, $request, ['name', 'quantity', 'created_at']);

        $assets = $query->paginate($request->per_page ?? 10);

        $assets->getCollection()->transform(fn (Asset $asset) => tap($asset, function (Asset $a): void {
            $a->available = $this->assetService->available($a);
        }));

        return $this->paginated($assets, AssetResource::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'quantity' => ['required', 'integer', 'min:0'],
            'condition' => ['sometimes', 'in:baik,rusak_ringan,rusak_berat'],
        ]);

        $asset = Asset::create($validated);
        $asset->available = $this->assetService->available($asset);

        return (new AssetResource($asset))->response()->setStatusCode(201);
    }

    public function show(Asset $asset)
    {
        $asset->available = $this->assetService->available($asset);

        return new AssetResource($asset);
    }

    public function update(Request $request, Asset $asset)
    {
        $this->authorize('update', $asset);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:150'],
            'quantity' => ['sometimes', 'integer', 'min:0'],
            'condition' => ['sometimes', 'in:baik,rusak_ringan,rusak_berat'],
        ]);

        $asset->update($validated);
        $asset->available = $this->assetService->available($asset->fresh());

        return new AssetResource($asset);
    }

    public function destroy(Asset $asset)
    {
        $this->authorize('delete', $asset);
        $asset->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
