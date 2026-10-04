<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = $this->authUser($request)->notifications()
            ->orderByRaw('read_at IS NULL DESC')
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page') ?: 10);

        return response()->json([
            'data' => $notifications->items(),
            'current_page' => $notifications->currentPage(),
            'last_page' => $notifications->lastPage(),
            'per_page' => $notifications->perPage(),
            'total' => $notifications->total(),
        ]);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $notification = $this->authUser($request)->notifications()->findOrFail($id);
        $notification->markAsRead();

        return response()->json(['data' => null, 'message' => 'Ditandai dibaca']);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $this->authUser($request)->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['data' => null, 'message' => 'Semua ditandai dibaca']);
    }
}
