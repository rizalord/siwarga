<?php

namespace Tests\Unit;

use App\Services\WahaService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WahaServiceTest extends TestCase
{
    public function test_sends_message_and_returns_true_on_success()
    {
        Http::fake([
            '*/api/sendText' => Http::response(['id' => 'msg-1'], 200),
        ]);

        $result = (new WahaService)->sendMessage('081234567890', 'New announcement');

        $this->assertTrue($result);
        Http::assertSent(function ($request) {
            return $request['chatId'] === '6281234567890@c.us'
                && $request['text'] === 'New announcement';
        });
    }

    public function test_returns_false_on_failure_response()
    {
        Http::fake([
            '*/api/sendText' => Http::response(['error' => 'session not found'], 422),
        ]);

        $result = (new WahaService)->sendMessage('081234567890', 'New announcement');

        $this->assertFalse($result);
    }

    public function test_normalizes_local_prefix_to_country_code()
    {
        Http::fake([
            '*/api/sendText' => Http::response(['id' => 'msg-1'], 200),
        ]);

        (new WahaService)->sendMessage('0812-3456-7890', 'Test');

        Http::assertSent(fn ($request) => $request['chatId'] === '6281234567890@c.us');
    }
}
