<?php

namespace Tests\Unit;

use App\Models\Event;
use App\Models\EventDocumentation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_event_can_be_created()
    {
        $creator = User::factory()->create();
        $event = Event::factory()->create([
            'title' => 'Community Cleanup',
            'created_by' => $creator->id,
            'status' => 'upcoming',
        ]);

        $this->assertDatabaseHas('events', ['title' => 'Community Cleanup', 'status' => 'upcoming']);
        $this->assertTrue($event->createdBy->is($creator));
    }

    public function test_event_soft_deletes()
    {
        $event = Event::factory()->create();

        $event->delete();

        $this->assertSoftDeleted($event);
    }

    public function test_event_has_many_documentation()
    {
        $event = Event::factory()->create();
        EventDocumentation::factory()->count(2)->create(['event_id' => $event->id]);

        $this->assertCount(2, $event->documentation);
    }

    public function test_documentation_belongs_to_event()
    {
        $event = Event::factory()->create();
        $doc = EventDocumentation::factory()->create(['event_id' => $event->id, 'media_type' => 'foto']);

        $this->assertTrue($doc->event->is($event));
        $this->assertEquals('foto', $doc->media_type);
    }
}
