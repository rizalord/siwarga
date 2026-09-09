<?php

namespace App\Services;

use App\Models\HouseResident;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\TicketComment;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TicketService
{
    public const STATUS_ORDER = ['open' => 0, 'in_progress' => 1, 'resolved' => 2];

    public function __construct(private HtmlSanitizer $htmlSanitizer) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, User $user): Ticket
    {
        $data['description'] = $this->htmlSanitizer->sanitize($data['description']);
        $data['reported_by'] = $user->id;
        $data['house_id'] ??= HouseResident::where('resident_id', $user->resident_id)
            ->whereNull('end_date')
            ->value('house_id');

        return Ticket::create($data);
    }

    public function changeStatus(Ticket $ticket, string $newStatus, User $actor): Ticket
    {
        $order = self::STATUS_ORDER;

        if (! isset($order[$newStatus]) || $order[$newStatus] !== $order[$ticket->status] + 1) {
            throw ValidationException::withMessages(['status' => ['Transisi status tidak valid. Tiket hanya bergerak maju: open → in_progress → resolved.']]);
        }

        $oldStatus = $ticket->status;

        DB::transaction(function () use ($ticket, $newStatus, $oldStatus, $actor): void {
            $ticket->update(['status' => $newStatus]);
            TicketComment::create([
                'ticket_id' => $ticket->id,
                'user_id' => $actor->id,
                'comment' => "Status diubah {$oldStatus} → {$newStatus} oleh {$actor->name}.",
            ]);
        });

        return $ticket->fresh(['reporter', 'assignee'])->loadCount(['comments', 'attachments']);
    }

    public function assign(Ticket $ticket, int $userId): Ticket
    {
        $ticket->update(['assigned_to' => $userId]);

        return $ticket->fresh(['reporter', 'assignee'])->loadCount(['comments', 'attachments']);
    }

    public function addComment(Ticket $ticket, string $comment, User $user): TicketComment
    {
        return $ticket->comments()->create([
            'user_id' => $user->id,
            'comment' => $this->htmlSanitizer->sanitize($comment),
        ]);
    }

    public function addAttachment(Ticket $ticket, UploadedFile $file): TicketAttachment
    {
        if ($ticket->attachments()->count() >= 3) {
            throw ValidationException::withMessages(['photo' => ['Maksimal 3 foto per tiket.']]);
        }

        return $ticket->attachments()->create([
            'file_path' => $file->store('ticket-attachments', 'public'),
        ]);
    }
}
