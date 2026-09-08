<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PollResource;
use App\Models\Poll;
use App\Models\PollOption;
use App\Models\PollVote;
use App\Services\PollService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class PollController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private PollService $pollService) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $query = Poll::query()->with('options')
            ->withExists(['votes as has_voted' => fn ($q) => $q->where('user_id', $user->id)]);

        if ($request->search) {
            $query->where('title', 'like', "%{$request->search}%");
        }

        if ($request->filled('status')) {
            $query->when($request->status === 'upcoming', fn ($q) => $q->where('starts_at', '>', now()))
                ->when($request->status === 'ongoing', fn ($q) => $q->where('starts_at', '<=', now())->where('ends_at', '>=', now()))
                ->when($request->status === 'ended', fn ($q) => $q->where('ends_at', '<', now()));
        }

        $this->applySorting($query, $request, ['title', 'starts_at', 'ends_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), PollResource::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'options' => ['required', 'array', 'min:2'],
            'options.*' => ['string', 'max:150', 'distinct'],
        ]);

        $options = $validated['options'];
        unset($validated['options']);

        $poll = $this->pollService->create($validated, $options, $request->user());

        return (new PollResource($poll))->response()->setStatusCode(201);
    }

    public function show(Request $request, Poll $poll)
    {
        $poll->load('options');
        $vote = PollVote::where('poll_id', $poll->id)->where('user_id', $request->user()->id)->first();
        $poll->user_voted_option_id = $vote?->option_id;
        $poll->has_voted = $vote !== null;

        return new PollResource($poll);
    }

    public function update(Request $request, Poll $poll)
    {
        $this->authorize('update', $poll);

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:200'],
            'description' => ['sometimes', 'nullable', 'string'],
            'starts_at' => ['sometimes', 'date'],
            'ends_at' => ['sometimes', 'date', 'after:starts_at'],
            'options' => ['prohibited'],
        ]);

        return new PollResource($this->pollService->update($poll, $validated));
    }

    public function destroy(Poll $poll)
    {
        $this->authorize('delete', $poll);

        $this->pollService->delete($poll);

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function vote(Request $request, Poll $poll)
    {
        // Permission-only: the can:polls.vote route middleware already ran.
        // Period/duplicate/foreign-option rejections are owned by PollService
        // and return 422 (spec §2.2/§3) — no per-instance authorize() here,
        // it would 403 cases the spec mandates as 422.

        $validated = $request->validate([
            'option_id' => ['required', 'integer', 'exists:poll_options,id'],
        ]);

        $this->pollService->vote($poll, PollOption::findOrFail($validated['option_id']), $request->user());

        return response()->json(['data' => null, 'message' => 'Suara berhasil direkam']);
    }

    public function results(Request $request, Poll $poll)
    {
        $this->authorize('results', $poll);

        $poll->load(['options', 'votes']);
        $total = $poll->votes->count();

        return response()->json(['data' => [
            'poll_id' => $poll->id,
            'total_votes' => $total,
            'options' => $poll->options->map(fn ($option) => [
                'id' => $option->id,
                'label' => $option->label,
                'votes' => $poll->votes->where('option_id', $option->id)->count(),
                'percent' => $total > 0 ? round($poll->votes->where('option_id', $option->id)->count() / $total * 100, 1) : 0,
            ])->values(),
            'user_voted_option_id' => $poll->votes->firstWhere('user_id', $request->user()->id)?->option_id,
        ]]);
    }
}
