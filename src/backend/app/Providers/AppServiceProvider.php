<?php

namespace App\Providers;

use App\Models\Announcement;
use App\Models\Asset;
use App\Models\Bill;
use App\Models\DueType;
use App\Models\Event;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Facility;
use App\Models\FacilityBooking;
use App\Models\ForumThread;
use App\Models\House;
use App\Models\Payment;
use App\Models\Permission;
use App\Models\Poll;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use App\Observers\ActivityLogObserver;
use App\Policies\AnnouncementPolicy;
use App\Policies\AssetLoanPolicy;
use App\Policies\AssetPolicy;
use App\Policies\BillPolicy;
use App\Policies\BookingPolicy;
use App\Policies\ContactMessagePolicy;
use App\Policies\DueTypePolicy;
use App\Policies\EmergencyContactPolicy;
use App\Policies\EventPolicy;
use App\Policies\ExpenseCategoryPolicy;
use App\Policies\ExpensePolicy;
use App\Policies\FacilityPolicy;
use App\Policies\FamilyMemberPolicy;
use App\Policies\ForumThreadPolicy;
use App\Policies\GuestLogPolicy;
use App\Policies\HousePolicy;
use App\Policies\PagePolicy;
use App\Policies\PanicAlertPolicy;
use App\Policies\PatrolSchedulePolicy;
use App\Policies\PaymentPolicy;
use App\Policies\PaymentTransactionPolicy;
use App\Policies\PollPolicy;
use App\Policies\ResidentPolicy;
use App\Policies\SuggestionPolicy;
use App\Policies\TicketPolicy;
use App\Policies\UserPolicy;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->registerGates();
        $this->registerActivityLogObservers();
        $this->registerRateLimiters();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }

    /**
     * Register authorization gates for route middleware.
     */
    protected function registerGates(): void
    {
        Gate::policy(FacilityBooking::class, BookingPolicy::class);

        // Houses
        Gate::define('houses.view', [HousePolicy::class, 'viewAny']);
        Gate::define('houses.create', [HousePolicy::class, 'create']);
        Gate::define('houses.edit', [HousePolicy::class, 'update']);
        Gate::define('houses.delete', [HousePolicy::class, 'delete']);
        Gate::define('houses.trash', [HousePolicy::class, 'restore']);
        Gate::define('houses.assign', [HousePolicy::class, 'assign']);

        // Pages
        Gate::define('pages.manage', [PagePolicy::class, 'update']);

        // Announcements
        Gate::define('announcements.view', [AnnouncementPolicy::class, 'viewAny']);
        Gate::define('announcements.manage', [AnnouncementPolicy::class, 'create']);

        // Contact messages
        Gate::define('contact-messages.view', [ContactMessagePolicy::class, 'viewAny']);

        // Polls & forum
        Gate::define('polls.view', [PollPolicy::class, 'viewAny']);
        Gate::define('polls.manage', [PollPolicy::class, 'create']);
        Gate::define('polls.vote', fn (User $user) => $user->hasPermission('polls.vote'));
        Gate::define('forum.view', [ForumThreadPolicy::class, 'viewAny']);

        // Tickets & suggestions
        Gate::define('tickets.view', [TicketPolicy::class, 'viewAny']);
        Gate::define('tickets.view-all', fn (User $user) => $user->hasPermission('tickets.view-all'));
        Gate::define('tickets.create', [TicketPolicy::class, 'create']);
        Gate::define('tickets.manage-status', [TicketPolicy::class, 'updateStatus']);
        Gate::define('tickets.assign', [TicketPolicy::class, 'assign']);
        Gate::define('suggestions.view', [SuggestionPolicy::class, 'viewAny']);
        Gate::define('suggestions.create', [SuggestionPolicy::class, 'create']);

        // Facilities & bookings
        Gate::define('facilities.view', [FacilityPolicy::class, 'viewAny']);
        Gate::define('facilities.manage', [FacilityPolicy::class, 'create']);
        Gate::define('bookings.view', [BookingPolicy::class, 'viewAny']);
        Gate::define('bookings.create', [BookingPolicy::class, 'create']);
        Gate::define('bookings.review', fn (User $user) => $user->hasPermission('bookings.review'));

        // Assets & events
        Gate::define('assets.view', [AssetPolicy::class, 'viewAny']);
        Gate::define('assets.manage', [AssetPolicy::class, 'create']);
        Gate::define('asset-loans.request', [AssetLoanPolicy::class, 'create']);
        Gate::define('asset-loans.review', fn (User $user) => $user->hasPermission('asset-loans.review'));
        Gate::define('events.manage', [EventPolicy::class, 'viewAny']);

        // Security (Fase 4)
        Gate::define('guest-logs.view', [GuestLogPolicy::class, 'viewAny']);
        Gate::define('guest-logs.manage', fn (User $user) => $user->hasPermission('guest-logs.manage'));
        Gate::define('guest-logs.register', [GuestLogPolicy::class, 'create']);
        Gate::define('panic-alerts.report', [PanicAlertPolicy::class, 'report']);
        Gate::define('panic-alerts.handle', fn (User $user) => $user->hasPermission('panic-alerts.handle'));
        Gate::define('patrol-schedules.view', [PatrolSchedulePolicy::class, 'viewAny']);
        Gate::define('patrol-schedules.manage', [PatrolSchedulePolicy::class, 'create']);
        Gate::define('family-members.view', [FamilyMemberPolicy::class, 'viewAny']);
        Gate::define('family-members.manage', fn (User $user) => $user->hasPermission('family-members.manage'));
        Gate::define('emergency-contacts.manage', [EmergencyContactPolicy::class, 'create']);

        // Residents
        Gate::define('residents.view', [ResidentPolicy::class, 'viewAny']);
        Gate::define('residents.create', [ResidentPolicy::class, 'create']);
        Gate::define('residents.edit', [ResidentPolicy::class, 'update']);
        Gate::define('residents.delete', [ResidentPolicy::class, 'delete']);
        Gate::define('residents.trash', [ResidentPolicy::class, 'restore']);

        // Bills
        Gate::define('bills.view', [BillPolicy::class, 'viewAny']);
        Gate::define('bills.generate', [BillPolicy::class, 'create']);
        Gate::define('bills.trash', [BillPolicy::class, 'restore']);

        // Due Types
        Gate::define('due-types.view', [DueTypePolicy::class, 'viewAny']);
        Gate::define('due-types.manage', [DueTypePolicy::class, 'create']);
        Gate::define('due-types.trash', [DueTypePolicy::class, 'restore']);

        // Expense Categories
        Gate::define('expense-categories.view', [ExpenseCategoryPolicy::class, 'viewAny']);
        Gate::define('expense-categories.manage', [ExpenseCategoryPolicy::class, 'create']);
        Gate::define('expense-categories.trash', [ExpenseCategoryPolicy::class, 'restore']);

        // Payments
        Gate::define('payments.view', [PaymentPolicy::class, 'viewAny']);
        Gate::define('payments.create', [PaymentPolicy::class, 'create']);
        Gate::define('payments.trash', [PaymentPolicy::class, 'restore']);
        Gate::define('payments.online', [PaymentTransactionPolicy::class, 'create']);
        Gate::define('payments.verify', fn (User $user) => $user->hasPermission('payments.verify'));

        // Expenses
        Gate::define('expenses.view', [ExpensePolicy::class, 'viewAny']);
        Gate::define('expenses.create', [ExpensePolicy::class, 'create']);
        Gate::define('expenses.edit', [ExpensePolicy::class, 'update']);
        Gate::define('expenses.delete', [ExpensePolicy::class, 'delete']);
        Gate::define('expenses.trash', [ExpensePolicy::class, 'restore']);

        // Reports
        Gate::define('reports.view', fn (User $user) => $user->hasPermission('reports.view'));

        // Users
        Gate::define('users.view', [UserPolicy::class, 'viewAny']);
        Gate::define('users.manage', [UserPolicy::class, 'create']);
        Gate::define('users.trash', [UserPolicy::class, 'restore']);

        // Activity Logs
        Gate::define('activity-logs.view', fn (User $user) => $user->hasPermission('activity-logs.view'));
    }

    /**
     * Observe models whose changes should be recorded in the activity log.
     */
    protected function registerActivityLogObservers(): void
    {
        foreach ([Resident::class, House::class, DueType::class, Bill::class, Payment::class, Expense::class, ExpenseCategory::class, User::class, Role::class, Permission::class, Announcement::class, Poll::class, ForumThread::class, Facility::class, Asset::class, Event::class] as $model) {
            $model::observe(ActivityLogObserver::class);
        }
    }

    /**
     * Register named rate limiters for public-facing routes.
     */
    protected function registerRateLimiters(): void
    {
        RateLimiter::for('contact', function (Request $request) {
            return Limit::perMinute(3)->by($request->ip());
        });

        RateLimiter::for('suggestions', function (Request $request) {
            return Limit::perMinute(3)->by($request->user()?->id ?? $request->ip());
        });

        RateLimiter::for('panic', function (Request $request) {
            return Limit::perMinute(3)->by($request->user()?->id ?? $request->ip());
        });

        RateLimiter::for('webhooks', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip());
        });

        RateLimiter::for('exports', function (Request $request) {
            return Limit::perMinute(10)->by($request->user()?->id ?? $request->ip());
        });
    }
}
