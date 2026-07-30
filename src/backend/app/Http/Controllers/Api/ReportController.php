<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ReportService;

class ReportController extends Controller
{
    public function __construct(private ReportService $reportService) {}

    public function summary(int $year)
    {
        $data = $this->reportService->yearlySummary($year);

        return response()->json(['data' => $data]);
    }

    public function monthly(int $year, int $month)
    {
        $data = $this->reportService->monthlyDetail($year, $month);

        return response()->json(['data' => $data]);
    }
}
