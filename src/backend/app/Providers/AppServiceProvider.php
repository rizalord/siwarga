<?php

namespace App\Providers;

use App\Models\User;
use App\Policies\BillPolicy;
use App\Policies\DueTypePolicy;
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
    }
}
