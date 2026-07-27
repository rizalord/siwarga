<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ReportService;

class ReportController extends Controller
{
    public function summary(int $year)
    {
        $service = new ReportService;
        $data = $service->yearlySummary($year);

        return response()->json(['data' => $data]);
    }

    public function monthly(int $year, int $month)
    {
        $service = new ReportService;
        $data = $service->monthlyDetail($year, $month);

        return response()->json(['data' => $data]);
    }
}
