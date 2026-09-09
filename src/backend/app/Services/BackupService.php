<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\Asset;
use App\Models\AssetLoan;
use App\Models\Bill;
use App\Models\DueType;
use App\Models\EmergencyContact;
use App\Models\Event;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Facility;
use App\Models\FacilityBooking;
use App\Models\FamilyMember;
use App\Models\GuestLog;
use App\Models\House;
use App\Models\HouseResident;
use App\Models\PanicAlert;
use App\Models\PatrolSchedule;
use App\Models\Payment;
use App\Models\PaymentTransaction;
use App\Models\Permission;
use App\Models\Resident;
use App\Models\Role;
use App\Models\Ticket;
use App\Models\User;

class BackupService
{
    /**
     * @return array{meta: array{version: int, exported_at: string, app: string}, domains: array<string, mixed>}
     */
    public function dump(): array
    {
        return [
            'meta' => [
                'version' => 1,
                'exported_at' => now()->toIso8601String(),
                'app' => config('app.name'),
            ],
            'domains' => [
                'residents' => Resident::withTrashed()->get(),
                'houses' => House::withTrashed()->get(),
                'house_residents' => HouseResident::withTrashed()->get(),
                'due_types' => DueType::withTrashed()->get(),
                'bills' => Bill::withTrashed()->get(),
                'payments' => Payment::withTrashed()->get(),
                'expenses' => Expense::withTrashed()->get(),
                'expense_categories' => ExpenseCategory::withTrashed()->get(),
                'users' => User::withTrashed()->get()->makeHidden(['password', 'remember_token']),
                'roles' => Role::query()->get(),
                'permissions' => Permission::query()->get(),
                'announcements' => Announcement::withTrashed()->get(),
                'tickets' => Ticket::withTrashed()->get(),
                'facilities' => Facility::withTrashed()->get(),
                'facility_bookings' => FacilityBooking::query()->get(),
                'assets' => Asset::withTrashed()->get(),
                'asset_loans' => AssetLoan::query()->get(),
                'events' => Event::withTrashed()->get(),
                'guest_logs' => GuestLog::withTrashed()->get(),
                'panic_alerts' => PanicAlert::withTrashed()->get(),
                'patrol_schedules' => PatrolSchedule::withTrashed()->get(),
                'family_members' => FamilyMember::withTrashed()->get(),
                'emergency_contacts' => EmergencyContact::withTrashed()->get(),
                'payment_transactions' => PaymentTransaction::withTrashed()->get(),
            ],
        ];
    }
}
