<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(private ReportService $reportService) {}

    public function summary(int $year): JsonResponse
    {
        $data = $this->reportService->yearlySummary($year);

        return response()->json(['data' => $data]);
    }

    public function monthly(Request $request, int $year, int $month): JsonResponse
    {
        $data = $this->reportService->monthlyDetail($year, $month);

        // Summary-only viewers (Warga) see the cash flow for transparency, but
        // not who paid: payment rows are reduced to date, amount and due type.
        if (! $this->authUser($request)->can('reports.view')) {
            $data['payments'] = $data['payments']->map(fn (Payment $payment) => [
                'id' => $payment->id,
                'payment_date' => $payment->payment_date,
                'amount_paid' => $payment->amount_paid,
                'notes' => 'Iuran '.($payment->bill?->dueType->name ?? ''),
            ])->values();
        }

        return response()->json(['data' => $data]);
    }
}
