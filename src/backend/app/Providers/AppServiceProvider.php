<?php

namespace App\Providers;

use App\Models\Bill;
use App\Models\DueType;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\House;
use App\Models\Payment;
use App\Models\Permission;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use App\Observers\ActivityLogObserver;
use App\Policies\BillPolicy;
use App\Policies\DueTypePolicy;
use App\Policies\ExpenseCategoryPolicy;
use App\Policies\ExpensePolicy;
use App\Policies\HousePolicy;
use App\Policies\PaymentPolicy;
use App\Policies\ResidentPolicy;
use App\Policies\UserPolicy;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
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
        Gate::define('houses.assign', [HousePolicy::class, 'assign']);

        // Residents
        Gate::define('residents.view', [ResidentPolicy::class, 'viewAny']);
        Gate::define('residents.create', [ResidentPolicy::class, 'create']);
        Gate::define('residents.edit', [ResidentPolicy::class, 'update']);
        Gate::define('residents.delete', [ResidentPolicy::class, 'delete']);

        // Bills
        Gate::define('bills.view', [BillPolicy::class, 'viewAny']);
        Gate::define('bills.generate', [BillPolicy::class, 'create']);

        // Due Types
        Gate::define('due-types.view', [DueTypePolicy::class, 'viewAny']);
        Gate::define('due-types.manage', [DueTypePolicy::class, 'create']);

        // Expense Categories
        Gate::define('expense-categories.view', [ExpenseCategoryPolicy::class, 'viewAny']);
        Gate::define('expense-categories.manage', [ExpenseCategoryPolicy::class, 'create']);
        Gate::define('expense-categories.trash', [ExpenseCategoryPolicy::class, 'restore']);

        // Payments
        Gate::define('payments.view', [PaymentPolicy::class, 'viewAny']);
        Gate::define('payments.create', [PaymentPolicy::class, 'create']);

        // Expenses
        Gate::define('expenses.view', [ExpensePolicy::class, 'viewAny']);
        Gate::define('expenses.create', [ExpensePolicy::class, 'create']);
        Gate::define('expenses.edit', [ExpensePolicy::class, 'update']);
        Gate::define('expenses.delete', [ExpensePolicy::class, 'delete']);

        // Reports
        Gate::define('reports.view', fn (User $user) => $user->hasPermission('reports.view'));

        // Users
        Gate::define('users.view', [UserPolicy::class, 'viewAny']);
        Gate::define('users.manage', [UserPolicy::class, 'create']);

        // Activity Logs
        Gate::define('activity-logs.view', fn (User $user) => $user->hasPermission('activity-logs.view'));
    }

    /**
     * Observe models whose changes should be recorded in the activity log.
     */
    protected function registerActivityLogObservers(): void
    {
        foreach ([Resident::class, House::class, DueType::class, Bill::class, Payment::class, Expense::class, ExpenseCategory::class, User::class, Role::class, Permission::class] as $model) {
            $model::observe(ActivityLogObserver::class);
        }
    }
}
