<?php

namespace Tests\Unit;

use App\Models\ContactMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ContactMessageModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_contact_message_defaults_to_new_status()
    {
        $message = ContactMessage::factory()->create();

        $this->assertEquals('new', $message->status);
    }

    public function test_contact_message_can_be_marked_read()
    {
        $message = ContactMessage::factory()->create(['status' => 'new']);

        $message->update(['status' => 'read']);

        $this->assertDatabaseHas('contact_messages', ['id' => $message->id, 'status' => 'read']);
    }

    public function test_contact_messages_only_track_creation_time()
    {
        $this->assertTrue(Schema::hasColumn('contact_messages', 'created_at'));
        $this->assertFalse(Schema::hasColumn('contact_messages', 'updated_at'));
    }
}
