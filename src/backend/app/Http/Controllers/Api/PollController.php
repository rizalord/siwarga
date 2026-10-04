<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PollResource;
use App\Models\Poll;
use App\Models\PollOption;
use App\Models\PollVote;
use App\Services\PollService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PollController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private PollService $pollService) {}

    public function index(Request $request): JsonResponse
    {
        $user = $this->authUser($request);
        $query = Poll::query()->with('options')
            ->withExists(['votes as has_voted' => fn (Builder $q) => $q->where('user_id', $user->id)]);

        if ($request->search) {
            $query->where('title', 'like', "%{$request->string('search')}%");
        }

        if ($request->filled('status')) {
            $query->when($request->status === 'upcoming', fn ($q) => $q->where('starts_at', '>', now()))
                ->when($request->status === 'ongoing', fn ($q) => $q->where('starts_at', '<=', now())->where('ends_at', '>=', now()))
                ->when($request->status === 'ended', fn ($q) => $q->where('ends_at', '<', now()));
        }

        $this->applySorting($query, $request, ['title', 'starts_at', 'ends_at']);

        return $this->paginated($query->paginate($request->integer('per_page') ?: 10), PollResource::class);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validate($request, [
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'options' => ['required', 'array', 'min:2'],
            'options.*' => ['string', 'max:150', 'distinct'],
        ]);

        $options = array_values(array_map(fn (mixed $option): string => is_string($option) ? $option : '', $request->array('options')));
        unset($validated['options']);

        $poll = $this->pollService->create($validated, $options, $this->authUser($request));

        return (new PollResource($poll))->response()->setStatusCode(201);
    }

    public function show(Request $request, Poll $poll): PollResource
    {
        $poll->load('options');
        $vote = PollVote::where('poll_id', $poll->id)->where('user_id', $this->authUser($request)->id)->first();
        $poll->setAttribute('user_voted_option_id', $vote?->option_id);
        $poll->setAttribute('has_voted', $vote !== null);

        return new PollResource($poll);
    }

    public function update(Request $request, Poll $poll): PollResource
    {
        $this->authorize('update', $poll);

        $validated = $this->validate($request, [
            'title' => ['sometimes', 'string', 'max:200'],
            'description' => ['sometimes', 'nullable', 'string'],
            'starts_at' => ['sometimes', 'date'],
            'ends_at' => ['sometimes', 'date', 'after:starts_at'],
            'options' => ['prohibited'],
        ]);

        return new PollResource($this->pollService->update($poll, $validated));
    }

    public function destroy(Poll $poll): JsonResponse
    {
        $this->authorize('delete', $poll);

        $this->pollService->delete($poll);

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function vote(Request $request, Poll $poll): JsonResponse
    {
        // Permission-only: the can:polls.vote route middleware already ran.
        // Period/duplicate/foreign-option rejections are owned by PollService
        // and return 422 (spec §2.2/§3) — no per-instance authorize() here,
        // it would 403 cases the spec mandates as 422.

        $this->validate($request, [
            'option_id' => ['required', 'integer', 'exists:poll_options,id'],
        ]);

        $this->pollService->vote($poll, PollOption::query()->findOrFail($request->integer('option_id')), $this->authUser($request));

        return response()->json(['data' => null, 'message' => 'Suara berhasil direkam']);
    }

    public function results(Request $request, Poll $poll): JsonResponse
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
            'user_voted_option_id' => $poll->votes->firstWhere('user_id', $this->authUser($request)->id)?->option_id,
        ]]);
    }
}
