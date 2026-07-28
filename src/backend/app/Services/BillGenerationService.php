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
            $isAnnual = $dueType->billing_cycle === 'fleksibel';
            $periodStart = $isAnnual
                ? Carbon::createFromDate($year, 1, 1)
                : Carbon::createFromDate($year, $month, 1);
            $periodEnd = $isAnnual
                ? Carbon::createFromDate($year, 12, 31)
                : $periodStart->copy()->endOfMonth();
            $amountDue = $isAnnual ? $dueType->amount * 12 : $dueType->amount;

            $houses = House::where('status', 'dihuni')->get();
            foreach ($houses as $house) {
                $activeResident = HouseResident::where('house_id', $house->id)
                    ->whereNull('end_date')->first();
                if (! $activeResident) {
                    continue;
                }

                $exists = $isAnnual
                    ? Bill::where('house_id', $house->id)
                        ->where('due_type_id', $dueType->id)
                        ->whereYear('period_start', $year)
                        ->exists()
                    : Bill::where('house_id', $house->id)
                        ->where('due_type_id', $dueType->id)
                        ->whereYear('period_start', $year)->whereMonth('period_start', $month)
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
}
