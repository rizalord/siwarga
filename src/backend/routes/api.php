<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillController;
use App\Http\Controllers\Api\DueTypeController;
use App\Http\Controllers\Api\ExpenseCategoryController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\HouseController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ResidentController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Residents
    Route::get('residents', [ResidentController::class, 'index'])->middleware('can:residents.view');
    Route::post('residents', [ResidentController::class, 'store'])->middleware('can:residents.create');
    Route::post('residents/bulk-delete', [ResidentController::class, 'bulkDestroy'])->middleware('can:residents.delete');
    Route::get('residents/{resident}', [ResidentController::class, 'show'])->middleware('can:residents.view');
    Route::put('residents/{resident}', [ResidentController::class, 'update'])->middleware('can:residents.edit');
    Route::delete('residents/{resident}', [ResidentController::class, 'destroy'])->middleware('can:residents.delete');

    // Houses
    Route::get('houses', [HouseController::class, 'index'])->middleware('can:houses.view');
    Route::post('houses', [HouseController::class, 'store'])->middleware('can:houses.create');
    Route::post('houses/bulk-delete', [HouseController::class, 'bulkDestroy'])->middleware('can:houses.delete');
    Route::get('houses/{house}', [HouseController::class, 'show'])->middleware('can:houses.view');
    Route::put('houses/{house}', [HouseController::class, 'update'])->middleware('can:houses.edit');
    Route::delete('houses/{house}', [HouseController::class, 'destroy'])->middleware('can:houses.delete');
    Route::get('houses/{house}/history', [HouseController::class, 'history'])->middleware('can:houses.view');
    Route::post('houses/{house}/assign-resident', [HouseController::class, 'assignResident'])->middleware('can:houses.assign');
    Route::post('houses/{house}/vacate-resident', [HouseController::class, 'vacateResident'])->middleware('can:houses.assign');

    // Due Types
    Route::get('due-types', [DueTypeController::class, 'index'])->middleware('can:due-types.view');
    Route::post('due-types', [DueTypeController::class, 'store'])->middleware('can:due-types.manage');
    Route::post('due-types/bulk-delete', [DueTypeController::class, 'bulkDestroy'])->middleware('can:due-types.manage');
    Route::get('due-types/{dueType}', [DueTypeController::class, 'show'])->middleware('can:due-types.view');
    Route::put('due-types/{dueType}', [DueTypeController::class, 'update'])->middleware('can:due-types.manage');
    Route::delete('due-types/{dueType}', [DueTypeController::class, 'destroy'])->middleware('can:due-types.manage');

    // Expense Categories
    Route::get('expense-categories', [ExpenseCategoryController::class, 'index'])->middleware('can:expense-categories.view');
    Route::post('expense-categories', [ExpenseCategoryController::class, 'store'])->middleware('can:expense-categories.manage');
    Route::post('expense-categories/bulk-delete', [ExpenseCategoryController::class, 'bulkDestroy'])->middleware('can:expense-categories.manage');
    Route::get('expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'show'])->middleware('can:expense-categories.view');
    Route::put('expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'update'])->middleware('can:expense-categories.manage');
    Route::delete('expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'destroy'])->middleware('can:expense-categories.manage');

    // Bills
    Route::get('bills', [BillController::class, 'index'])->middleware('can:bills.view');
    Route::post('bills/generate', [BillController::class, 'generate'])->middleware('can:bills.generate');
    Route::post('bills/bulk-delete', [BillController::class, 'bulkDestroy'])->middleware('can:bills.generate');
    Route::get('bills/{bill}', [BillController::class, 'show'])->middleware('can:bills.view');
    Route::delete('bills/{bill}', [BillController::class, 'destroy'])->middleware('can:bills.generate');

    // Payments
    Route::get('payments', [PaymentController::class, 'index'])->middleware('can:payments.view');
    Route::post('payments', [PaymentController::class, 'store'])->middleware('can:payments.create');
    Route::post('payments/bulk-delete', [PaymentController::class, 'bulkDestroy'])->middleware('can:payments.create');
    Route::get('payments/{payment}', [PaymentController::class, 'show'])->middleware('can:payments.view');
    Route::put('payments/{payment}', [PaymentController::class, 'update'])->middleware('can:payments.create');
    Route::delete('payments/{payment}', [PaymentController::class, 'destroy'])->middleware('can:payments.create');

    // Expenses
    Route::get('expenses', [ExpenseController::class, 'index'])->middleware('can:expenses.view');
    Route::post('expenses', [ExpenseController::class, 'store'])->middleware('can:expenses.create');
    Route::post('expenses/bulk-delete', [ExpenseController::class, 'bulkDestroy'])->middleware('can:expenses.delete');
    Route::get('expenses/categories', [ExpenseController::class, 'categories'])->middleware('can:expenses.view');
    Route::get('expenses/{expense}', [ExpenseController::class, 'show'])->middleware('can:expenses.view');
    Route::put('expenses/{expense}', [ExpenseController::class, 'update'])->middleware('can:expenses.edit');
    Route::delete('expenses/{expense}', [ExpenseController::class, 'destroy'])->middleware('can:expenses.delete');

    // Reports
    Route::get('reports/summary/{year}', [ReportController::class, 'summary'])->middleware('can:reports.view');
    Route::get('reports/monthly/{year}/{month}', [ReportController::class, 'monthly'])->middleware('can:reports.view');

    // Users
    Route::get('users', [UserController::class, 'index'])->middleware('can:users.view');
    Route::post('users', [UserController::class, 'store'])->middleware('can:users.manage');
    Route::post('users/bulk-delete', [UserController::class, 'bulkDestroy'])->middleware('can:users.manage');
    Route::get('users/{user}', [UserController::class, 'show'])->middleware('can:users.view');
    Route::put('users/{user}', [UserController::class, 'update'])->middleware('can:users.manage');
    Route::delete('users/{user}', [UserController::class, 'destroy'])->middleware('can:users.manage');

    // Roles
    Route::get('roles', [RoleController::class, 'index'])->middleware('can:users.view');
    Route::post('roles', [RoleController::class, 'store'])->middleware('can:users.manage');
    Route::get('roles/{role}', [RoleController::class, 'show'])->middleware('can:users.view');
    Route::put('roles/{role}', [RoleController::class, 'update'])->middleware('can:users.manage');
    Route::delete('roles/{role}', [RoleController::class, 'destroy'])->middleware('can:users.manage');

    // Permissions
    Route::get('permissions', [PermissionController::class, 'index'])->middleware('can:users.view');
    Route::post('permissions', [PermissionController::class, 'store'])->middleware('can:users.manage');
    Route::get('permissions/{permission}', [PermissionController::class, 'show'])->middleware('can:users.view');
    Route::put('permissions/{permission}', [PermissionController::class, 'update'])->middleware('can:users.manage');
    Route::delete('permissions/{permission}', [PermissionController::class, 'destroy'])->middleware('can:users.manage');

    // Activity Logs
    Route::get('activity-logs', [ActivityLogController::class, 'index'])->middleware('can:activity-logs.view');
    Route::post('activity-logs/track', [ActivityLogController::class, 'track']);
});
