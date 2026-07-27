<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillController;
use App\Http\Controllers\Api\DueTypeController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\HouseController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ResidentController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    Route::apiResource('residents', ResidentController::class);
    Route::apiResource('houses', HouseController::class);
    Route::get('houses/{house}/history', [HouseController::class, 'history']);
    Route::post('houses/{house}/assign-resident', [HouseController::class, 'assignResident']);

    Route::apiResource('due-types', DueTypeController::class);
    Route::get('bills', [BillController::class, 'index']);
    Route::post('bills/generate', [BillController::class, 'generate']);
    Route::get('bills/{bill}', [BillController::class, 'show']);
    Route::delete('bills/{bill}', [BillController::class, 'destroy']);
    Route::apiResource('payments', PaymentController::class);
    Route::apiResource('expenses', ExpenseController::class);
    Route::get('reports/summary/{year}', [ReportController::class, 'summary']);
    Route::get('reports/monthly/{year}/{month}', [ReportController::class, 'monthly']);
});
