<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuthService;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private AuthService $authService) {}

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $result = $this->authService->login($request->email, $request->password);

        return response()->json(['data' => $result]);
    }

    public function logout(Request $request)
    {
        $this->authService->logout($request->user());

        return response()->json(['data' => null, 'message' => 'Logged out']);
    }

    public function refresh(Request $request)
    {
        $token = $this->authService->refresh($request->user());

        return response()->json(['data' => ['token' => $token]]);
    }

    public function me(Request $request)
    {
        return response()->json(['data' => $this->authService->me($request->user())]);
    }
}
