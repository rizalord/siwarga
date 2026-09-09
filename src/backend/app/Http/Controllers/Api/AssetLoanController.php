<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AssetLoanResource;
use App\Models\AssetLoan;
use App\Services\AssetService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class AssetLoanController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private AssetService $assetService) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $query = AssetLoan::query()->with(['asset:id,name', 'borrower:id,name']);

        if (! $user->hasPermission('asset-loans.review')) {
            $query->where('borrowed_by', $user->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $this->applySorting($query, $request, ['created_at', 'status']);

        return $this->paginated($query->paginate($request->per_page ?? 10), AssetLoanResource::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'asset_id' => ['required', 'integer', 'exists:assets,id'],
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        $loan = $this->assetService->request($validated, $request->user());

        return (new AssetLoanResource($loan->load(['asset', 'borrower'])))->response()->setStatusCode(201);
    }

    public function show(AssetLoan $loan)
    {
        $this->authorize('view', $loan);

        return new AssetLoanResource($loan->load(['asset', 'borrower']));
    }

    public function approve(AssetLoan $loan)
    {
        $this->authorize('review', $loan);

        return new AssetLoanResource($this->assetService->review($loan, 'approved'));
    }

    public function reject(AssetLoan $loan)
    {
        $this->authorize('review', $loan);

        return new AssetLoanResource($this->assetService->review($loan, 'rejected'));
    }

    public function markReturned(AssetLoan $loan)
    {
        $this->authorize('return', $loan);

        return new AssetLoanResource($this->assetService->markReturned($loan));
    }
}
