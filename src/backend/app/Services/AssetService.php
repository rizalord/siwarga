<?php

namespace App\Services;

use App\Models\Asset;
use App\Models\AssetLoan;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AssetService
{
    public function available(Asset $asset): int
    {
        $borrowed = AssetLoan::where('asset_id', $asset->id)
            ->where('status', 'approved')
            ->sum('quantity');

        return max(0, $asset->quantity - $borrowed);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function request(array $data, User $user): AssetLoan
    {
        return AssetLoan::create([...$data, 'borrowed_by' => $user->id]);
    }

    public function review(AssetLoan $loan, string $decision): AssetLoan
    {
        if ($loan->status !== 'pending') {
            throw ValidationException::withMessages(['status' => ['Hanya peminjaman pending yang bisa direview.']]);
        }

        if ($decision === 'approved') {
            return DB::transaction(function () use ($loan): AssetLoan {
                $asset = Asset::whereKey($loan->asset_id)->lockForUpdate()->firstOrFail();

                if ($this->available($asset) < $loan->quantity) {
                    throw ValidationException::withMessages(['quantity' => ['Stok tersedia tidak mencukupi.']]);
                }

                $loan->update(['status' => 'approved', 'borrowed_at' => now()]);

                return $loan->fresh(['asset', 'borrower']);
            });
        }

        $loan->update(['status' => 'rejected']);

        return $loan->fresh(['asset', 'borrower']);
    }

    public function markReturned(AssetLoan $loan): AssetLoan
    {
        if ($loan->status !== 'approved') {
            throw ValidationException::withMessages(['status' => ['Hanya peminjaman approved yang bisa dikembalikan.']]);
        }

        $loan->update(['status' => 'returned', 'returned_at' => now()]);

        return $loan->fresh(['asset', 'borrower']);
    }
}
