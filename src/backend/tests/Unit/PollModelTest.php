<?php

namespace Tests\Unit;

use App\Models\Poll;
use App\Models\PollOption;
use App\Models\PollVote;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PollModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_poll_has_many_options()
    {
        $poll = Poll::factory()->create();
        PollOption::factory()->count(3)->create(['poll_id' => $poll->id]);

        $this->assertCount(3, $poll->options);
    }

    public function test_user_can_vote_once_per_poll()
    {
        $poll = Poll::factory()->create();
        $option = PollOption::factory()->create(['poll_id' => $poll->id]);
        $user = User::factory()->create();

        PollVote::factory()->create(['poll_id' => $poll->id, 'option_id' => $option->id, 'user_id' => $user->id]);

        $this->expectException(QueryException::class);

        PollVote::factory()->create(['poll_id' => $poll->id, 'option_id' => $option->id, 'user_id' => $user->id]);
    }

    public function test_vote_belongs_to_option_and_poll()
    {
        $poll = Poll::factory()->create();
        $option = PollOption::factory()->create(['poll_id' => $poll->id]);
        $vote = PollVote::factory()->create(['poll_id' => $poll->id, 'option_id' => $option->id]);

        $this->assertTrue($vote->poll->is($poll));
        $this->assertTrue($vote->option->is($option));
    }
}
