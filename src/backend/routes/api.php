<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\AssetLoanController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\ContactMessageAdminController;
use App\Http\Controllers\Api\ContactMessageController;
use App\Http\Controllers\Api\DueTypeController;
use App\Http\Controllers\Api\EmergencyContactController;
use App\Http\Controllers\Api\EventAdminController;
use App\Http\Controllers\Api\ExpenseCategoryController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\ExportController;
use App\Http\Controllers\Api\FacilityController;
use App\Http\Controllers\Api\FamilyMemberController;
use App\Http\Controllers\Api\ForumPostController;
use App\Http\Controllers\Api\ForumThreadController;
use App\Http\Controllers\Api\GuestLogController;
use App\Http\Controllers\Api\HouseController;
use App\Http\Controllers\Api\HouseholdCardController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PageController;
use App\Http\Controllers\Api\PanicAlertController;
use App\Http\Controllers\Api\PatrolScheduleController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PaymentTransactionController;
use App\Http\Controllers\Api\PaymentWebhookController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\PollController;
use App\Http\Controllers\Api\PublicAnnouncementController;
use App\Http\Controllers\Api\PublicEventController;
use App\Http\Controllers\Api\PublicPageController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ResidentController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SuggestionController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WargaAnnouncementController;
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
    Route::post('residents/bulk-restore', [ResidentController::class, 'bulkRestore'])->middleware('can:residents.trash');
    Route::post('residents/bulk-force-delete', [ResidentController::class, 'bulkForceDestroy'])->middleware('can:residents.trash');
    Route::post('residents/{resident}/restore', [ResidentController::class, 'restore'])->withTrashed()->middleware('can:residents.trash');
    Route::delete('residents/{resident}/force-delete', [ResidentController::class, 'forceDestroy'])->withTrashed()->middleware('can:residents.trash');
    Route::get('residents/{resident}', [ResidentController::class, 'show'])->middleware('can:residents.view');
    Route::put('residents/{resident}', [ResidentController::class, 'update'])->middleware('can:residents.edit');
    Route::delete('residents/{resident}', [ResidentController::class, 'destroy'])->middleware('can:residents.delete');

    // Houses
    Route::get('houses', [HouseController::class, 'index'])->middleware('can:houses.view');
    Route::post('houses', [HouseController::class, 'store'])->middleware('can:houses.create');
    Route::post('houses/bulk-delete', [HouseController::class, 'bulkDestroy'])->middleware('can:houses.delete');
    Route::post('houses/bulk-restore', [HouseController::class, 'bulkRestore'])->middleware('can:houses.trash');
    Route::post('houses/bulk-force-delete', [HouseController::class, 'bulkForceDestroy'])->middleware('can:houses.trash');
    Route::post('houses/{house}/restore', [HouseController::class, 'restore'])->withTrashed()->middleware('can:houses.trash');
    Route::delete('houses/{house}/force-delete', [HouseController::class, 'forceDestroy'])->withTrashed()->middleware('can:houses.trash');
    Route::get('houses/{house}', [HouseController::class, 'show'])->middleware('can:houses.view');
    Route::put('houses/{house}', [HouseController::class, 'update'])->middleware('can:houses.edit');
    Route::delete('houses/{house}', [HouseController::class, 'destroy'])->middleware('can:houses.delete');
    Route::get('houses/{house}/history', [HouseController::class, 'history'])->middleware('can:houses.view');
    Route::post('houses/{house}/assign-resident', [HouseController::class, 'assignResident'])->middleware('can:houses.assign');
    Route::post('houses/{house}/vacate-resident', [HouseController::class, 'vacateResident'])->middleware('can:houses.assign');

    // Pages
    Route::get('pages/{slug}', [PageController::class, 'show'])->middleware('can:pages.manage');
    Route::put('pages/{slug}', [PageController::class, 'update'])->middleware('can:pages.manage');

    // Announcements
    Route::get('announcements', [AnnouncementController::class, 'index'])->middleware('can:announcements.view');
    Route::post('announcements', [AnnouncementController::class, 'store'])->middleware('can:announcements.manage');
    Route::get('announcements/{announcement}', [AnnouncementController::class, 'show'])->middleware('can:announcements.view');
    Route::put('announcements/{announcement}', [AnnouncementController::class, 'update']);
    Route::delete('announcements/{announcement}', [AnnouncementController::class, 'destroy']);
    Route::post('announcements/{announcement}/publish', [AnnouncementController::class, 'publish']);

    // Warga announcements (scoped, read-only)
    Route::get('warga/announcements', [WargaAnnouncementController::class, 'index'])->middleware('can:announcements.view');
    Route::get('warga/announcements/{announcement}', [WargaAnnouncementController::class, 'show'])->middleware('can:announcements.view');

    // Polls
    Route::get('polls', [PollController::class, 'index'])->middleware('can:polls.view');
    Route::post('polls', [PollController::class, 'store'])->middleware('can:polls.manage');
    Route::get('polls/{poll}', [PollController::class, 'show'])->middleware('can:polls.view');
    Route::put('polls/{poll}', [PollController::class, 'update']);
    Route::delete('polls/{poll}', [PollController::class, 'destroy']);
    Route::post('polls/{poll}/vote', [PollController::class, 'vote'])->middleware('can:polls.vote');
    Route::get('polls/{poll}/results', [PollController::class, 'results']);

    // Contact messages (admin)
    Route::get('contact-messages', [ContactMessageAdminController::class, 'index'])->middleware('can:contact-messages.view');
    Route::get('contact-messages/{contactMessage}', [ContactMessageAdminController::class, 'show'])->middleware('can:contact-messages.view');
    Route::post('contact-messages/{contactMessage}/mark-read', [ContactMessageAdminController::class, 'markRead'])->middleware('can:contact-messages.view');

    // Due Types
    Route::get('due-types', [DueTypeController::class, 'index'])->middleware('can:due-types.view');
    Route::post('due-types', [DueTypeController::class, 'store'])->middleware('can:due-types.manage');
    Route::post('due-types/bulk-delete', [DueTypeController::class, 'bulkDestroy'])->middleware('can:due-types.manage');
    Route::post('due-types/bulk-restore', [DueTypeController::class, 'bulkRestore'])->middleware('can:due-types.trash');
    Route::post('due-types/bulk-force-delete', [DueTypeController::class, 'bulkForceDestroy'])->middleware('can:due-types.trash');
    Route::post('due-types/{dueType}/restore', [DueTypeController::class, 'restore'])->withTrashed()->middleware('can:due-types.trash');
    Route::delete('due-types/{dueType}/force-delete', [DueTypeController::class, 'forceDestroy'])->withTrashed()->middleware('can:due-types.trash');
    Route::get('due-types/{dueType}', [DueTypeController::class, 'show'])->middleware('can:due-types.view');
    Route::put('due-types/{dueType}', [DueTypeController::class, 'update'])->middleware('can:due-types.manage');
    Route::delete('due-types/{dueType}', [DueTypeController::class, 'destroy'])->middleware('can:due-types.manage');

    // Expense Categories
    Route::get('expense-categories', [ExpenseCategoryController::class, 'index'])->middleware('can:expense-categories.view');
    Route::post('expense-categories', [ExpenseCategoryController::class, 'store'])->middleware('can:expense-categories.manage');
    Route::post('expense-categories/bulk-delete', [ExpenseCategoryController::class, 'bulkDestroy'])->middleware('can:expense-categories.manage');
    Route::post('expense-categories/bulk-restore', [ExpenseCategoryController::class, 'bulkRestore'])->middleware('can:expense-categories.trash');
    Route::post('expense-categories/bulk-force-delete', [ExpenseCategoryController::class, 'bulkForceDestroy'])->middleware('can:expense-categories.trash');
    Route::post('expense-categories/{expenseCategory}/restore', [ExpenseCategoryController::class, 'restore'])->withTrashed()->middleware('can:expense-categories.trash');
    Route::delete('expense-categories/{expenseCategory}/force-delete', [ExpenseCategoryController::class, 'forceDestroy'])->withTrashed()->middleware('can:expense-categories.trash');
    Route::get('expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'show'])->middleware('can:expense-categories.view');
    Route::put('expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'update'])->middleware('can:expense-categories.manage');
    Route::delete('expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'destroy'])->middleware('can:expense-categories.manage');

    // Bills
    Route::get('bills', [BillController::class, 'index'])->middleware('can:bills.view');
    Route::post('bills/generate', [BillController::class, 'generate'])->middleware('can:bills.generate');
    Route::post('bills/generate-flexible', [BillController::class, 'generateFlexible'])->middleware('can:bills.generate');
    Route::post('bills/bulk-delete', [BillController::class, 'bulkDestroy'])->middleware('can:bills.generate');
    Route::post('bills/bulk-restore', [BillController::class, 'bulkRestore'])->middleware('can:bills.trash');
    Route::post('bills/bulk-force-delete', [BillController::class, 'bulkForceDestroy'])->middleware('can:bills.trash');
    Route::post('bills/{bill}/restore', [BillController::class, 'restore'])->withTrashed()->middleware('can:bills.trash');
    Route::delete('bills/{bill}/force-delete', [BillController::class, 'forceDestroy'])->withTrashed()->middleware('can:bills.trash');
    Route::get('bills/{bill}', [BillController::class, 'show'])->middleware('can:bills.view');
    Route::delete('bills/{bill}', [BillController::class, 'destroy'])->middleware('can:bills.generate');

    // Payments
    Route::get('payments', [PaymentController::class, 'index'])->middleware('can:payments.view');
    Route::post('payments', [PaymentController::class, 'store'])->middleware('can:payments.create');
    Route::post('payments/bulk-delete', [PaymentController::class, 'bulkDestroy'])->middleware('can:payments.create');
    Route::post('payments/bulk-restore', [PaymentController::class, 'bulkRestore'])->middleware('can:payments.trash');
    Route::post('payments/bulk-force-delete', [PaymentController::class, 'bulkForceDestroy'])->middleware('can:payments.trash');
    Route::post('payments/{payment}/restore', [PaymentController::class, 'restore'])->withTrashed()->middleware('can:payments.trash');
    Route::delete('payments/{payment}/force-delete', [PaymentController::class, 'forceDestroy'])->withTrashed()->middleware('can:payments.trash');
    Route::get('payments/{payment}', [PaymentController::class, 'show'])->middleware('can:payments.view');
    Route::put('payments/{payment}', [PaymentController::class, 'update'])->middleware('can:payments.create');
    Route::delete('payments/{payment}', [PaymentController::class, 'destroy'])->middleware('can:payments.create');

    Route::get('payment-transactions', [PaymentTransactionController::class, 'index']);
    Route::post('payment-transactions', [PaymentTransactionController::class, 'store'])->middleware('can:payments.online');
    Route::get('payment-transactions/{paymentTransaction}', [PaymentTransactionController::class, 'show']);
    Route::post('payment-transactions/{paymentTransaction}/proof', [PaymentTransactionController::class, 'proof']);
    Route::post('payment-transactions/{paymentTransaction}/verify', [PaymentTransactionController::class, 'verify']);
    Route::post('payment-transactions/{paymentTransaction}/simulate-pay', [PaymentTransactionController::class, 'simulatePay']);

    // Expenses
    Route::get('expenses', [ExpenseController::class, 'index'])->middleware('can:expenses.view');
    Route::post('expenses', [ExpenseController::class, 'store'])->middleware('can:expenses.create');
    Route::post('expenses/bulk-delete', [ExpenseController::class, 'bulkDestroy'])->middleware('can:expenses.delete');
    Route::post('expenses/bulk-restore', [ExpenseController::class, 'bulkRestore'])->middleware('can:expenses.trash');
    Route::post('expenses/bulk-force-delete', [ExpenseController::class, 'bulkForceDestroy'])->middleware('can:expenses.trash');
    Route::post('expenses/{expense}/restore', [ExpenseController::class, 'restore'])->withTrashed()->middleware('can:expenses.trash');
    Route::delete('expenses/{expense}/force-delete', [ExpenseController::class, 'forceDestroy'])->withTrashed()->middleware('can:expenses.trash');
    Route::get('expenses/{expense}', [ExpenseController::class, 'show'])->middleware('can:expenses.view');
    Route::put('expenses/{expense}', [ExpenseController::class, 'update'])->middleware('can:expenses.edit');
    Route::delete('expenses/{expense}', [ExpenseController::class, 'destroy'])->middleware('can:expenses.delete');

    // Reports
    Route::get('reports/summary/{year}', [ReportController::class, 'summary'])->middleware('can:reports.view');
    Route::get('reports/monthly/{year}/{month}', [ReportController::class, 'monthly'])->middleware('can:reports.view');

    // Exports & backup (Fase 5)
    Route::get('reports/monthly/{year}/{month}/pdf', [ExportController::class, 'monthlyPdf'])->middleware(['can:reports.view', 'throttle:exports']);
    Route::get('reports/summary/{year}/pdf', [ExportController::class, 'summaryPdf'])->middleware(['can:reports.view', 'throttle:exports']);
    Route::get('exports/{dataset}/xlsx', [ExportController::class, 'dataset'])->middleware('throttle:exports');
    Route::get('backup/json', [ExportController::class, 'backup'])->middleware(['can:users.manage', 'throttle:exports']);

    // Users
    Route::get('users', [UserController::class, 'index'])->middleware('can:users.view');
    Route::post('users', [UserController::class, 'store'])->middleware('can:users.manage');
    Route::post('users/bulk-delete', [UserController::class, 'bulkDestroy'])->middleware('can:users.manage');
    Route::post('users/bulk-restore', [UserController::class, 'bulkRestore'])->middleware('can:users.trash');
    Route::post('users/bulk-force-delete', [UserController::class, 'bulkForceDestroy'])->middleware('can:users.trash');
    Route::post('users/{user}/restore', [UserController::class, 'restore'])->withTrashed()->middleware('can:users.trash');
    Route::delete('users/{user}/force-delete', [UserController::class, 'forceDestroy'])->withTrashed()->middleware('can:users.trash');
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

    // Forum
    Route::get('forum-threads', [ForumThreadController::class, 'index'])->middleware('can:forum.view');
    Route::post('forum-threads', [ForumThreadController::class, 'store'])->middleware('can:forum.view');
    Route::get('forum-threads/{thread}', [ForumThreadController::class, 'show'])->middleware('can:forum.view');
    Route::delete('forum-threads/{thread}', [ForumThreadController::class, 'destroy']);
    Route::get('forum-threads/{thread}/posts', [ForumPostController::class, 'index'])->middleware('can:forum.view');
    Route::post('forum-threads/{thread}/posts', [ForumPostController::class, 'store'])->middleware('can:forum.view');
    Route::delete('forum-posts/{post}', [ForumPostController::class, 'destroy']);

    // Tickets
    Route::get('tickets', [TicketController::class, 'index'])->middleware('can:tickets.view');
    Route::post('tickets', [TicketController::class, 'store'])->middleware('can:tickets.create');
    Route::get('tickets/{ticket}', [TicketController::class, 'show'])->middleware('can:tickets.view');
    Route::post('tickets/{ticket}/status', [TicketController::class, 'changeStatus'])->middleware('can:tickets.manage-status');
    Route::post('tickets/{ticket}/assign', [TicketController::class, 'assign'])->middleware('can:tickets.assign');
    Route::get('tickets/{ticket}/comments', [TicketController::class, 'comments'])->middleware('can:tickets.view');
    Route::post('tickets/{ticket}/comments', [TicketController::class, 'storeComment'])->middleware('can:tickets.view');
    Route::post('tickets/{ticket}/attachments', [TicketController::class, 'storeAttachment'])->middleware('can:tickets.view');

    // Facilities & bookings
    Route::get('facilities', [FacilityController::class, 'index'])->middleware('can:facilities.view');
    Route::post('facilities', [FacilityController::class, 'store'])->middleware('can:facilities.manage');
    Route::get('facilities/{facility}', [FacilityController::class, 'show'])->middleware('can:facilities.view');
    Route::put('facilities/{facility}', [FacilityController::class, 'update']);
    Route::delete('facilities/{facility}', [FacilityController::class, 'destroy']);
    Route::get('bookings', [BookingController::class, 'index'])->middleware('can:bookings.view');
    Route::post('bookings', [BookingController::class, 'store'])->middleware('can:bookings.create');
    Route::get('bookings/{booking}', [BookingController::class, 'show'])->middleware('can:bookings.view');
    Route::post('bookings/{booking}/approve', [BookingController::class, 'approve']);
    Route::post('bookings/{booking}/reject', [BookingController::class, 'reject']);
    Route::post('bookings/{booking}/cancel', [BookingController::class, 'cancel']);

    // Assets & loans
    Route::get('assets', [AssetController::class, 'index'])->middleware('can:assets.view');
    Route::post('assets', [AssetController::class, 'store'])->middleware('can:assets.manage');
    Route::get('assets/{asset}', [AssetController::class, 'show'])->middleware('can:assets.view');
    Route::put('assets/{asset}', [AssetController::class, 'update']);
    Route::delete('assets/{asset}', [AssetController::class, 'destroy']);
    Route::get('asset-loans', [AssetLoanController::class, 'index'])->middleware('can:asset-loans.request');
    Route::post('asset-loans', [AssetLoanController::class, 'store'])->middleware('can:asset-loans.request');
    Route::get('asset-loans/{loan}', [AssetLoanController::class, 'show'])->middleware('can:asset-loans.request');
    Route::post('asset-loans/{loan}/approve', [AssetLoanController::class, 'approve']);
    Route::post('asset-loans/{loan}/reject', [AssetLoanController::class, 'reject']);
    Route::post('asset-loans/{loan}/return', [AssetLoanController::class, 'markReturned']);

    // Events (admin)
    Route::get('events', [EventAdminController::class, 'index'])->middleware('can:events.manage');
    Route::post('events', [EventAdminController::class, 'store'])->middleware('can:events.manage');
    Route::get('events/{event}', [EventAdminController::class, 'show'])->middleware('can:events.manage');
    Route::put('events/{event}', [EventAdminController::class, 'update']);
    Route::delete('events/{event}', [EventAdminController::class, 'destroy']);
    Route::get('events/{event}/documentation', [EventAdminController::class, 'documentation'])->middleware('can:events.manage');
    Route::post('events/{event}/documentation', [EventAdminController::class, 'storeDocumentation'])->middleware('can:events.manage');
    Route::delete('event-documentation/{documentation}', [EventAdminController::class, 'destroyDocumentation']);

    // Notifications (own only, no permission gate beyond auth)
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::post('notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::post('notifications/{id}/read', [NotificationController::class, 'markRead']);

    // Suggestions (anonymous submit, admin inbox)
    Route::post('suggestions', [SuggestionController::class, 'store'])->middleware(['can:suggestions.create', 'throttle:suggestions']);
    Route::get('suggestions', [SuggestionController::class, 'index'])->middleware('can:suggestions.view');
    Route::post('suggestions/{suggestion}/mark-reviewed', [SuggestionController::class, 'markReviewed'])->middleware('can:suggestions.view');

    // Security — guest log (Fase 4)
    Route::get('guest-logs', [GuestLogController::class, 'index'])->middleware('can:guest-logs.view');
    Route::post('guest-logs', [GuestLogController::class, 'store'])->middleware('can:guest-logs.register');
    Route::get('guest-logs/{guestLog}', [GuestLogController::class, 'show'])->middleware('can:guest-logs.view');
    Route::post('guest-logs/{guestLog}/check-in', [GuestLogController::class, 'checkIn']);
    Route::post('guest-logs/{guestLog}/check-out', [GuestLogController::class, 'checkOut']);

    // Security — panic alerts (Fase 4)
    Route::get('panic-alerts', [PanicAlertController::class, 'index'])->middleware('can:panic-alerts.report');
    Route::post('panic-alerts', [PanicAlertController::class, 'store'])->middleware(['can:panic-alerts.report', 'throttle:panic']);
    Route::get('panic-alerts/{panicAlert}', [PanicAlertController::class, 'show'])->middleware('can:panic-alerts.report');
    Route::post('panic-alerts/{panicAlert}/handle', [PanicAlertController::class, 'handle']);
    Route::post('panic-alerts/{panicAlert}/resolve', [PanicAlertController::class, 'resolve']);
    Route::post('panic-alerts/{panicAlert}/cancel', [PanicAlertController::class, 'cancel']);

    // Security — patrols & emergency contacts (Fase 4)
    Route::get('patrol-schedules', [PatrolScheduleController::class, 'index'])->middleware('can:patrol-schedules.view');
    Route::post('patrol-schedules', [PatrolScheduleController::class, 'store'])->middleware('can:patrol-schedules.manage');
    Route::get('patrol-schedules/{patrolSchedule}', [PatrolScheduleController::class, 'show'])->middleware('can:patrol-schedules.view');
    Route::put('patrol-schedules/{patrolSchedule}', [PatrolScheduleController::class, 'update']);
    Route::delete('patrol-schedules/{patrolSchedule}', [PatrolScheduleController::class, 'destroy']);
    Route::get('emergency-contacts', [EmergencyContactController::class, 'index']);
    Route::post('emergency-contacts', [EmergencyContactController::class, 'store'])->middleware('can:emergency-contacts.manage');
    Route::put('emergency-contacts/{emergencyContact}', [EmergencyContactController::class, 'update']);
    Route::delete('emergency-contacts/{emergencyContact}', [EmergencyContactController::class, 'destroy']);

    // Security — family & household card (Fase 4)
    Route::get('family-members', [FamilyMemberController::class, 'index'])->middleware('can:family-members.view');
    Route::post('family-members', [FamilyMemberController::class, 'store'])->middleware('can:family-members.view');
    Route::get('family-members/{familyMember}', [FamilyMemberController::class, 'show'])->middleware('can:family-members.view');
    Route::put('family-members/{familyMember}', [FamilyMemberController::class, 'update']);
    Route::delete('family-members/{familyMember}', [FamilyMemberController::class, 'destroy']);
    Route::get('households/card', [HouseholdCardController::class, 'show'])->middleware('can:family-members.view');
});

Route::prefix('public')->group(function () {
    Route::get('pages/{slug}', [PublicPageController::class, 'show']);
    Route::get('announcements', [PublicAnnouncementController::class, 'index']);
    Route::get('announcements/{slug}', [PublicAnnouncementController::class, 'show']);
    Route::get('events', [PublicEventController::class, 'index']);
    Route::get('events/{slug}', [PublicEventController::class, 'show']);
    Route::post('contact', [ContactMessageController::class, 'store'])->middleware('throttle:contact');
    Route::get('households/{token}', [HouseholdCardController::class, 'verify']);
    Route::post('payments/webhook/{provider}', [PaymentWebhookController::class, 'handle'])
        ->name('payments.webhook')
        ->middleware('throttle:webhooks');
});
