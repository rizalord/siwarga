<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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

        return response()->json([
            'data' => [
                'user' => $user,
                'token' => $token,
                'permissions' => [],
            ],
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

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
                'permissions' => [],
            ],
        ]);
    }
}
