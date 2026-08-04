<?php

namespace App\Services;

use App\Models\Bill;
use App\Models\DueType;
use App\Models\House;
use App\Models\HouseResident;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class BillGenerationService
{
    public function generate(int $month, int $year, ?int $generatedBy = null): Collection
    {
        $generated = collect();
        $dueTypes = DueType::all();

        foreach ($dueTypes as $dueType) {
            if ($dueType->billing_cycle !== 'bulanan') {
                continue;
            }

            $periodStart = Carbon::createFromDate($year, $month, 1);
            $periodEnd = $periodStart->copy()->endOfMonth();
            $amountDue = $dueType->amount;

            $houses = House::where('status', 'dihuni')->get();
            foreach ($houses as $house) {
                $activeResident = HouseResident::where('house_id', $house->id)
                    ->whereNull('end_date')
                    ->whereDate('start_date', '<=', $periodEnd)
                    ->first();
                if (! $activeResident) {
                    continue;
                }

                $exists = Bill::withTrashed()
                    ->where('house_id', $house->id)
                    ->where('due_type_id', $dueType->id)
                    ->whereDate('period_start', $periodStart)
                    ->whereDate('period_end', $periodEnd)
                    ->exists();
                if ($exists) {
                    continue;
                }

                $bill = Bill::create([
                    'house_id' => $house->id,
                    'resident_id' => $activeResident->resident_id,
                    'due_type_id' => $dueType->id,
                    'period_start' => $periodStart,
                    'period_end' => $periodEnd,
                    'amount_due' => $amountDue,
                    'generated_by' => $generatedBy,
                    'generated_at' => now(),
                ]);
                $generated->push($bill);
            }
        }

        return $generated;
    }

    public function generateFlexible(
        int $dueTypeId,
        Carbon $periodStart,
        Carbon $periodEnd,
        float $amountDue,
        ?int $generatedBy = null,
    ): Collection {
        $dueType = DueType::findOrFail($dueTypeId);

        if ($dueType->billing_cycle !== 'fleksibel') {
            abort(422, 'Jenis iuran ini hanya dapat dibuat melalui generate bulanan.');
        }

        $generated = collect();
        $houses = House::where('status', 'dihuni')->get();

        foreach ($houses as $house) {
            $activeResident = HouseResident::where('house_id', $house->id)
                ->whereDate('start_date', '<=', $periodEnd)
                ->where(function ($query) use ($periodStart) {
                    $query->whereNull('end_date')
                        ->orWhereDate('end_date', '>=', $periodStart);
                })
                ->first();

            if (! $activeResident) {
                continue;
            }

            $exists = Bill::withTrashed()
                ->where('house_id', $house->id)
                ->where('due_type_id', $dueType->id)
                ->whereDate('period_start', $periodStart)
                ->whereDate('period_end', $periodEnd)
                ->exists();

            if ($exists) {
                continue;
            }

            $generated->push(Bill::create([
                'house_id' => $house->id,
                'resident_id' => $activeResident->resident_id,
                'due_type_id' => $dueType->id,
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
                'amount_due' => $amountDue,
                'generated_by' => $generatedBy,
                'generated_at' => now(),
            ]));
        }

        return $generated;
    }
}
