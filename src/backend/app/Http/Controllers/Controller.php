<?php

namespace App\Http\Controllers;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

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

    protected function applyTrashedFilter(Builder $query, Request $request): Builder
    {
        return match ($request->string('trashed')->toString()) {
            'with' => $query->withTrashed(),
            'only' => $query->onlyTrashed(),
            default => $query,
        };
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

    protected function bulkRestore(Request $request, string $modelClass): JsonResponse
    {
        return $this->bulkRestoreWithCallback($request, $modelClass);
    }

    protected function bulkRestoreWithCallback(Request $request, string $modelClass, ?callable $afterRestore = null): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ]);

        /** @var EloquentCollection<int, Model> $models */
        $models = $modelClass::onlyTrashed()->whereIn('id', $validated['ids'])->get();

        DB::transaction(function () use ($models, $afterRestore): void {
            foreach ($models as $model) {
                $model->restore();
            }

            if ($afterRestore !== null) {
                $afterRestore($models);
            }
        });

        $restored = $models->count();

        return response()->json(['data' => null, 'message' => "{$restored} data berhasil dipulihkan"]);
    }

    protected function bulkForceDelete(Request $request, string $modelClass): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ]);

        /** @var EloquentCollection<int, Model> $models */
        $models = $modelClass::onlyTrashed()->whereIn('id', $validated['ids'])->get();

        try {
            DB::transaction(function () use ($models): void {
                foreach ($models as $model) {
                    $model->forceDelete();
                }
            });
        } catch (QueryException $exception) {
            $this->throwIfRestrictedForceDelete($exception, 'ids');
        }

        $deleted = $models->count();

        return response()->json(['data' => null, 'message' => "{$deleted} data berhasil dihapus permanen"]);
    }

    protected function restoreModel(Model $model, ?callable $afterRestore = null): void
    {
        $this->ensureModelIsTrashed($model, 'id', 'Data aktif tidak dapat dipulihkan.');

        DB::transaction(function () use ($model, $afterRestore): void {
            $model->restore();

            if ($afterRestore !== null) {
                $afterRestore($model);
            }
        });
    }

    protected function forceDeleteModel(Model $model): void
    {
        $this->ensureModelIsTrashed($model, 'id', 'Data aktif tidak dapat dihapus permanen.');

        try {
            DB::transaction(function () use ($model): void {
                $model->forceDelete();
            });
        } catch (QueryException $exception) {
            $this->throwIfRestrictedForceDelete($exception, 'id');
        }
    }

    protected function ensureModelIsTrashed(Model $model, string $field, string $message): void
    {
        if (! method_exists($model, 'trashed') || ! $model->trashed()) {
            throw ValidationException::withMessages([$field => [$message]]);
        }
    }

    protected function throwIfRestrictedForceDelete(QueryException $exception, string $field): never
    {
        if (! $this->isRestrictiveForeignKeyViolation($exception)) {
            throw $exception;
        }

        throw ValidationException::withMessages([
            $field => ['Data masih digunakan dan tidak dapat dihapus permanen.'],
        ]);
    }

    protected function isRestrictiveForeignKeyViolation(QueryException $exception): bool
    {
        $code = (string) $exception->getCode();
        $message = $exception->getMessage();

        return in_array($code, ['19', '23000', '23503'], true)
            || str_contains($message, 'FOREIGN KEY constraint failed')
            || str_contains($message, 'foreign key constraint fails')
            || str_contains($message, 'violates foreign key constraint');
    }
}
