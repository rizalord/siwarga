<?php

namespace Tests\Unit;

use App\Models\Announcement;
use App\Models\AnnouncementRead;
use App\Models\AnnouncementTarget;
use App\Models\House;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnnouncementModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_announcement_can_be_created_with_category()
    {
        $announcement = Announcement::factory()->create(['category' => 'darurat', 'is_public' => true]);

        $this->assertDatabaseHas('announcements', ['category' => 'darurat', 'is_public' => true]);
    }

    public function test_announcement_has_many_targets()
    {
        $announcement = Announcement::factory()->create();
        $house = House::factory()->create();
        AnnouncementTarget::factory()->create(['announcement_id' => $announcement->id, 'house_id' => $house->id]);

        $this->assertCount(1, $announcement->targets);
        $this->assertTrue($announcement->targets->first()->house->is($house));
    }

    public function test_announcement_read_is_unique_per_user()
    {
        $announcement = Announcement::factory()->create();
        $user = User::factory()->create();
        AnnouncementRead::factory()->create(['announcement_id' => $announcement->id, 'user_id' => $user->id]);

        $this->expectException(QueryException::class);

        AnnouncementRead::factory()->create(['announcement_id' => $announcement->id, 'user_id' => $user->id]);
    }

    public function test_announcement_soft_deletes()
    {
        $announcement = Announcement::factory()->create();

        $announcement->delete();

        $this->assertSoftDeleted($announcement);
    }
}
