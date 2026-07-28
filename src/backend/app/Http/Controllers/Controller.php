<?php

namespace App\Http\Controllers;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

abstract class Controller
{
    /**
     * Return a flat pagination payload ({data, current_page, last_page, per_page, total})
     * instead of Laravel's default JSON:API-style {data, links, meta} wrapper.
     */
    protected function paginated(LengthAwarePaginator $paginator, string $resourceClass): JsonResponse
    {
        return response()->json([
            'data' => $resourceClass::collection($paginator->items()),
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ]);
    }

    /**
     * Apply `sort`/`order` query params to a query, restricted to a whitelist of sortable columns.
     *
     * @param  array<int, string>  $sortable
     */
    protected function applySorting(Builder $query, Request $request, array $sortable, string $defaultColumn = 'id', string $defaultOrder = 'desc'): Builder
    {
        $sort = $request->string('sort')->toString();
        $order = $request->string('order')->lower()->toString() === 'asc' ? 'asc' : 'desc';

        if ($sort !== '' && in_array($sort, $sortable, true)) {
            return $query->orderBy($sort, $order);
        }

        return $query->orderBy($defaultColumn, $defaultOrder);
    }

    /**
     * Bulk delete records by id, restricted to ids that actually belong to the model.
     */
    protected function bulkDelete(Request $request, string $modelClass): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ]);

        $deleted = $modelClass::destroy($validated['ids']);

        return response()->json(['data' => null, 'message' => "{$deleted} data berhasil dihapus"]);
    }
}
