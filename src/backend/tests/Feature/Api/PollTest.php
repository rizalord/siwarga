<?php

namespace Tests\Feature\Api;

use App\Models\Poll;
use App\Models\PollOption;
use App\Models\PollVote;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PollTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $warga;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->admin = User::factory()->create();
        $this->admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->admin->load('roles.permissions');

        $this->warga = User::factory()->create();
        $this->warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $this->warga->load('roles.permissions');
    }

    protected function makePoll(array $overrides = []): Poll
    {
        $poll = Poll::factory()->create($overrides);
        PollOption::factory()->create(['poll_id' => $poll->id, 'label' => 'Setuju']);
        PollOption::factory()->create(['poll_id' => $poll->id, 'label' => 'Tidak Setuju']);

        return $poll->fresh('options');
    }

    public function test_admin_can_create_poll_with_options()
    {
        $response = $this->actingAs($this->admin)->postJson('/api/polls', [
            'title' => 'Iuran Khusus?',
            'description' => 'Vote ya atau tidak.',
            'starts_at' => now()->addDay()->toDateTimeString(),
            'ends_at' => now()->addWeek()->toDateTimeString(),
            'options' => ['Setuju', 'Tidak Setuju'],
        ]);

        $response->assertStatus(201)->assertJsonPath('data.title', 'Iuran Khusus?');
        $this->assertCount(2, $response->json('data.options'));
        $this->assertDatabaseHas('polls', ['title' => 'Iuran Khusus?']);
    }

    public function test_warga_cannot_create_poll()
    {
        $response = $this->actingAs($this->warga)->postJson('/api/polls', [
            'title' => 'X',
            'starts_at' => now()->addDay()->toDateTimeString(),
            'ends_at' => now()->addWeek()->toDateTimeString(),
            'options' => ['A', 'B'],
        ]);

        $response->assertStatus(403);
    }

    public function test_warga_can_vote_once_inside_period()
    {
        $poll = $this->makePoll(['starts_at' => now()->subDay(), 'ends_at' => now()->addDay()]);

        $response = $this->actingAs($this->warga)->postJson("/api/polls/{$poll->id}/vote", [
            'option_id' => $poll->options->first()->id,
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('poll_votes', ['poll_id' => $poll->id, 'user_id' => $this->warga->id]);

        $this->actingAs($this->warga)->postJson("/api/polls/{$poll->id}/vote", [
            'option_id' => $poll->options->last()->id,
        ])->assertStatus(422);
    }

    public function test_vote_outside_period_is_rejected()
    {
        $poll = $this->makePoll(['starts_at' => now()->subWeek(), 'ends_at' => now()->subDay()]);

        $this->actingAs($this->warga)->postJson("/api/polls/{$poll->id}/vote", [
            'option_id' => $poll->options->first()->id,
        ])->assertStatus(422);
    }

    public function test_vote_with_foreign_option_is_rejected()
    {
        $poll = $this->makePoll(['starts_at' => now()->subDay(), 'ends_at' => now()->addDay()]);
        $other = $this->makePoll();

        $this->actingAs($this->warga)->postJson("/api/polls/{$poll->id}/vote", [
            'option_id' => $other->options->first()->id,
        ])->assertStatus(422)->assertJsonValidationErrors(['option_id']);
    }

    public function test_results_hidden_until_voted_or_ended()
    {
        $poll = $this->makePoll(['starts_at' => now()->subDay(), 'ends_at' => now()->addDay()]);

        $this->actingAs($this->warga)->getJson("/api/polls/{$poll->id}/results")->assertStatus(403);

        $this->actingAs($this->warga)->postJson("/api/polls/{$poll->id}/vote", [
            'option_id' => $poll->options->first()->id,
        ])->assertStatus(200);

        $this->actingAs($this->warga)->getJson("/api/polls/{$poll->id}/results")->assertStatus(200)
            ->assertJsonPath('data.total_votes', 1);
    }

    public function test_admin_can_update_before_start_but_not_after()
    {
        $poll = $this->makePoll(['starts_at' => now()->addDay(), 'ends_at' => now()->addWeek()]);

        $this->actingAs($this->admin)->putJson("/api/polls/{$poll->id}", ['title' => 'Judul Baru'])
            ->assertStatus(200)->assertJsonPath('data.title', 'Judul Baru');

        $poll->update(['starts_at' => now()->subDay()]);

        $this->actingAs($this->admin)->putJson("/api/polls/{$poll->id}", ['title' => 'Diubah Lagi'])
            ->assertStatus(403);
    }

    public function test_admin_can_delete_poll_with_votes()
    {
        $poll = $this->makePoll(['starts_at' => now()->subDay(), 'ends_at' => now()->addDay()]);
        PollVote::create(['poll_id' => $poll->id, 'option_id' => $poll->options->first()->id, 'user_id' => $this->warga->id, 'voted_at' => now()]);

        $this->actingAs($this->admin)->deleteJson("/api/polls/{$poll->id}")->assertStatus(200);
        $this->assertDatabaseMissing('polls', ['id' => $poll->id]);
        $this->assertDatabaseMissing('poll_votes', ['poll_id' => $poll->id]);
    }
}
