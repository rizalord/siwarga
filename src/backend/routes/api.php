<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\HouseController;
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
});
