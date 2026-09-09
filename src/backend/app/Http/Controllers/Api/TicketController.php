<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TicketAttachmentResource;
use App\Http\Resources\TicketCommentResource;
use App\Http\Resources\TicketResource;
use App\Models\Ticket;
use App\Services\TicketService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class TicketController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private TicketService $ticketService) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $query = Ticket::query()->with(['reporter:id,name', 'assignee:id,name', 'attachments'])
            ->withCount(['comments', 'attachments']);

        if (! $user->hasPermission('tickets.view-all')) {
            $query->where('reported_by', $user->id);
        }

        if ($request->search) {
            $query->where('title', 'like', "%{$request->search}%");
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $this->applySorting($query, $request, ['title', 'status', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), TicketResource::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'description' => ['required', 'string'],
            'category' => ['nullable', 'string', 'max:100'],
            'house_id' => ['nullable', 'integer', 'exists:houses,id'],
        ]);

        $ticket = $this->ticketService->create($validated, $request->user());

        return (new TicketResource($ticket->load(['reporter', 'assignee', 'attachments'])->loadCount(['comments', 'attachments'])))->response()->setStatusCode(201);
    }

    public function show(Ticket $ticket)
    {
        $this->authorize('view', $ticket);

        return new TicketResource($ticket->load(['reporter', 'assignee', 'attachments'])->loadCount(['comments', 'attachments']));
    }

    public function changeStatus(Request $request, Ticket $ticket)
    {
        $validated = $request->validate([
            'status' => ['required', 'in:open,in_progress,resolved'],
        ]);

        return new TicketResource($this->ticketService->changeStatus($ticket, $validated['status'], $request->user()));
    }

    public function assign(Request $request, Ticket $ticket)
    {
        $validated = $request->validate([
            'assigned_to' => ['required', 'integer', 'exists:users,id'],
        ]);

        return new TicketResource($this->ticketService->assign($ticket, $validated['assigned_to']));
    }

    public function comments(Ticket $ticket)
    {
        $this->authorize('view', $ticket);

        $comments = $ticket->comments()->with('user:id,name')->orderBy('id')->get();

        return TicketCommentResource::collection($comments);
    }

    public function storeComment(Request $request, Ticket $ticket)
    {
        $this->authorize('comment', $ticket);

        $validated = $request->validate([
            'comment' => ['required', 'string', 'max:5000'],
        ]);

        $comment = $this->ticketService->addComment($ticket, $validated['comment'], $request->user());

        return (new TicketCommentResource($comment->load('user')))->response()->setStatusCode(201);
    }

    public function storeAttachment(Request $request, Ticket $ticket)
    {
        $this->authorize('attach', $ticket);

        $validated = $request->validate([
            'photo' => ['required', 'image', 'max:2048'],
        ]);

        $attachment = $this->ticketService->addAttachment($ticket, $validated['photo']);

        return (new TicketAttachmentResource($attachment))->response()->setStatusCode(201);
    }
}
