<?php

namespace App\Policies;

use App\Models\FacilityBooking;
use App\Models\User;

class BookingPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('bookings.view');
    }

    public function view(User $user, FacilityBooking $booking): bool
    {
        if ($user->hasPermission('bookings.review')) {
            return true;
        }

        return $user->hasPermission('bookings.view') && $booking->booked_by === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('bookings.create');
    }

    public function review(User $user, FacilityBooking $booking): bool
    {
        return $user->hasPermission('bookings.review');
    }

    public function cancel(User $user, FacilityBooking $booking): bool
    {
        return $booking->booked_by === $user->id || $user->hasPermission('bookings.review');
    }
}
