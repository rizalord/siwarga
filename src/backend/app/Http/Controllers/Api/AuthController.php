<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private AuthService $authService) {}

    public function login(Request $request): JsonResponse
    {
        $this->validate($request, [
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $result = $this->authService->login($request->string('email')->toString(), $request->string('password')->toString());

        return response()->json(['data' => $result]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($this->authUser($request));

        return response()->json(['data' => null, 'message' => 'Logged out']);
    }

    public function refresh(Request $request): JsonResponse
    {
        $token = $this->authService->refresh($this->authUser($request));

        return response()->json(['data' => ['token' => $token]]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->authService->me($this->authUser($request))]);
    }
}
