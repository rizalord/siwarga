<?php

namespace App\Policies;

use App\Models\Ticket;
use App\Models\User;

class TicketPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('tickets.view');
    }

    public function view(User $user, Ticket $ticket): bool
    {
        if ($user->hasPermission('tickets.view-all')) {
            return true;
        }

        return $user->hasPermission('tickets.view') && $ticket->reported_by === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('tickets.create');
    }

    public function updateStatus(User $user): bool
    {
        return $user->hasPermission('tickets.manage-status');
    }

    public function assign(User $user): bool
    {
        return $user->hasPermission('tickets.assign');
    }

    public function comment(User $user, Ticket $ticket): bool
    {
        return $this->view($user, $ticket);
    }

    public function attach(User $user, Ticket $ticket): bool
    {
        return $this->view($user, $ticket);
    }
}
