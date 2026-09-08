<?php

namespace App\Services;

use App\Models\Poll;
use App\Models\PollOption;
use App\Models\PollVote;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PollService
{
    /**
     * @param  array<string, mixed>  $data
     * @param  array<int, string>  $options
     */
    public function create(array $data, array $options, User $user): Poll
    {
        return DB::transaction(function () use ($data, $options, $user): Poll {
            $poll = Poll::create([...$data, 'created_by' => $user->id]);

            foreach ($options as $label) {
                $poll->options()->create(['label' => $label]);
            }

            return $poll->fresh(['options']);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Poll $poll, array $data): Poll
    {
        $poll->update($data);

        return $poll->fresh(['options']);
    }

    public function delete(Poll $poll): void
    {
        DB::transaction(function () use ($poll): void {
            PollVote::where('poll_id', $poll->id)->delete();
            $poll->options()->delete();
            $poll->delete();
        });
    }

    public function vote(Poll $poll, PollOption $option, User $user): PollVote
    {
        if ($option->poll_id !== $poll->id) {
            throw ValidationException::withMessages(['option_id' => ['Opsi tidak termasuk dalam polling ini.']]);
        }

        if (! now()->between($poll->starts_at, $poll->ends_at)) {
            throw ValidationException::withMessages(['poll' => ['Voting hanya dibuka selama periode polling.']]);
        }

        if ($poll->votes()->where('user_id', $user->id)->exists()) {
            throw ValidationException::withMessages(['poll' => ['Anda sudah memberikan suara di polling ini.']]);
        }

        try {
            return PollVote::create([
                'poll_id' => $poll->id,
                'option_id' => $option->id,
                'user_id' => $user->id,
                'voted_at' => now(),
            ]);
        } catch (QueryException $exception) {
            throw ValidationException::withMessages(['poll' => ['Anda sudah memberikan suara di polling ini.']]);
        }
    }
}
