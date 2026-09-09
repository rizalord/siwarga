<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentTransactionResource;
use App\Services\PaymentTransactionService;
use Illuminate\Http\Request;

class PaymentWebhookController extends Controller
{
    public function __construct(private PaymentTransactionService $service) {}

    public function handle(string $provider, Request $request)
    {
        try {
            $transaction = $this->service->handleWebhook($provider, $request);
        } catch (\InvalidArgumentException $exception) {
            abort(404);
        }

        return new PaymentTransactionResource($transaction);
    }
}
