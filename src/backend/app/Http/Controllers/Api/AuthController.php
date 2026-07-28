<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Kredensial tidak valid.'],
            ]);
        }

        $token = $user->createToken('api-token', expiresAt: now()->addHours(24))->plainTextToken;

        ActivityLog::record('login', "Login: {$user->name}", $user, actorId: $user->id);

        return response()->json([
            'data' => [
                'user' => $user,
                'token' => $token,
                'permissions' => $user->getAllPermissions(),
            ],
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        $user->currentAccessToken()->delete();

        ActivityLog::record('logout', "Logout: {$user->name}", $user);

        return response()->json(['data' => null, 'message' => 'Logged out']);
    }

    public function refresh(Request $request)
    {
        $user = $request->user();
        $user->currentAccessToken()->delete();
        $token = $user->createToken('api-token', expiresAt: now()->addHours(24))->plainTextToken;

        return response()->json(['data' => ['token' => $token]]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'data' => [
                'user' => $request->user()->load('roles.permissions'),
                'permissions' => $request->user()->getAllPermissions(),
            ],
        ]);
    }
}
