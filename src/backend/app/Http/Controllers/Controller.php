<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\IdList;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\UploadedFile;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

abstract class Controller
{
    use ValidatesRequests;

    /**
     * Validate the request; same as ValidatesRequests::validate() but with typed keys.
     *
     * @param  array<string, mixed>  $rules
     * @param  array<string, string>  $messages
     * @param  array<string, string>  $attributes
     * @return array<string, mixed>
     */
    public function validate(Request $request, array $rules, array $messages = [], array $attributes = []): array
    {
        $validated = [];

        foreach ($this->getValidationFactory()->make($request->all(), $rules, $messages, $attributes)->validate() as $key => $value) {
            if (is_string($key)) {
                $validated[$key] = $value;
            }
        }

        return $validated;
    }

    /**
     * Validate and return the `ids` array used by bulk endpoints.
     *
     * @return array<int, int>
     */
    protected function validatedIds(Request $request): array
    {
        $this->validate($request, [
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ]);

        return IdList::from($request->array('ids'));
    }

    /**
     * A validated optional string input: null when absent or empty.
     */
    protected function optionalString(Request $request, string $key): ?string
    {
        return $request->filled($key) ? $request->string($key)->toString() : null;
    }

    /**
     * A single validated upload (the rule set must already require it).
     */
    protected function uploadedFile(Request $request, string $key): UploadedFile
    {
        $file = $request->file($key);
        abort_unless($file instanceof UploadedFile, 422, "File {$key} wajib diunggah.");

        return $file;
    }

    /**
     * The authenticated user for routes behind `auth:sanctum`.
     */
    protected function authUser(?Request $request = null): User
    {
        $user = ($request ?? request())->user();
        abort_unless($user instanceof User, 401);

        return $user;
    }

    /**
     * Return a flat pagination payload ({data, current_page, last_page, per_page, total})
     * instead of Laravel's default JSON:API-style {data, links, meta} wrapper.
     *
     * @template TModel of Model
     *
     * @param  LengthAwarePaginator<int, TModel>  $paginator
     * @param  class-string<JsonResource>  $resourceClass
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
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @param  array<int, string>  $sortable
     * @param  'asc'|'desc'  $defaultOrder
     * @return Builder<TModel>
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
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    protected function applyTrashedFilter(Builder $query, Request $request): Builder
    {
        return $this->withTrashedMode($query, $request->string('trashed')->toString());
    }

    /**
     * Typed equivalent of the SoftDeletes `withTrashed()` / `onlyTrashed()` builder macros.
     *
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    protected function withTrashedMode(Builder $query, string $mode): Builder
    {
        $deletedAt = $query->getModel()->qualifyColumn('deleted_at');

        return match ($mode) {
            'with' => $query->withoutGlobalScope(SoftDeletingScope::class),
            'only' => $query->withoutGlobalScope(SoftDeletingScope::class)->whereNotNull($deletedAt),
            default => $query,
        };
    }

    /**
     * Bulk delete records by id, restricted to ids that actually belong to the model.
     *
     * @param  class-string<Model>  $modelClass
     */
    protected function bulkDelete(Request $request, string $modelClass): JsonResponse
    {
        $ids = $this->validatedIds($request);

        $deleted = $modelClass::destroy($ids);

        return response()->json(['data' => null, 'message' => "{$deleted} data berhasil dihapus"]);
    }

    /**
     * @param  class-string<Model>  $modelClass
     */
    protected function bulkRestore(Request $request, string $modelClass): JsonResponse
    {
        return $this->bulkRestoreWithCallback($request, $modelClass);
    }

    /**
     * @param  class-string<Model>  $modelClass
     */
    protected function bulkRestoreWithCallback(Request $request, string $modelClass, ?callable $afterRestore = null): JsonResponse
    {
        $ids = $this->validatedIds($request);

        /** @var EloquentCollection<int, Model> $models */
        $models = $this->withTrashedMode($modelClass::query(), 'only')->whereIn('id', $ids)->get();

        DB::transaction(function () use ($models, $afterRestore): void {
            foreach ($models as $model) {
                if (method_exists($model, 'restore')) {
                    $model->restore();
                }
            }

            if ($afterRestore !== null) {
                $afterRestore($models);
            }
        });

        $restored = $models->count();

        return response()->json(['data' => null, 'message' => "{$restored} data berhasil dipulihkan"]);
    }

    /**
     * @param  class-string<Model>  $modelClass
     */
    protected function bulkForceDelete(Request $request, string $modelClass): JsonResponse
    {
        $ids = $this->validatedIds($request);

        /** @var EloquentCollection<int, Model> $models */
        $models = $this->withTrashedMode($modelClass::query(), 'only')->whereIn('id', $ids)->get();

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
            if (method_exists($model, 'restore')) {
                $model->restore();
            }

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
