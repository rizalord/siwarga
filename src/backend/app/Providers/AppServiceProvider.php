<?php

namespace App\Providers;

use App\Models\Announcement;
use App\Models\Bill;
use App\Models\DueType;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\House;
use App\Models\Payment;
use App\Models\Permission;
use App\Models\Poll;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use App\Observers\ActivityLogObserver;
use App\Policies\AnnouncementPolicy;
use App\Policies\BillPolicy;
use App\Policies\ContactMessagePolicy;
use App\Policies\DueTypePolicy;
use App\Policies\ExpenseCategoryPolicy;
use App\Policies\ExpensePolicy;
use App\Policies\ForumThreadPolicy;
use App\Policies\HousePolicy;
use App\Policies\PagePolicy;
use App\Policies\PaymentPolicy;
use App\Policies\PollPolicy;
use App\Policies\ResidentPolicy;
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
        foreach ([Resident::class, House::class, DueType::class, Bill::class, Payment::class, Expense::class, ExpenseCategory::class, User::class, Role::class, Permission::class, Announcement::class, Poll::class] as $model) {
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
    }
}
