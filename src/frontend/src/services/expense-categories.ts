import type {
  ApiResponse,
  PaginatedResponse,
  ExpenseCategory,
  ExpenseCategoryFilter,
  CreateExpenseCategoryRequest,
} from '@/types/api'
import api from './api'

export const expenseCategoriesService = {
  getAll: (params?: ExpenseCategoryFilter) =>
    api.get<PaginatedResponse<ExpenseCategory>>('/api/expense-categories', {
      params,
    }),
  getById: (id: number) =>
    api.get<ApiResponse<ExpenseCategory>>(`/api/expense-categories/${id}`),
  create: (data: CreateExpenseCategoryRequest) =>
    api.post<ApiResponse<ExpenseCategory>>('/api/expense-categories', data),
  update: (id: number, data: CreateExpenseCategoryRequest) =>
    api.put<ApiResponse<ExpenseCategory>>(
      `/api/expense-categories/${id}`,
      data
    ),
  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/expense-categories/${id}`),
  restore: (id: number) =>
    api.post<ApiResponse<ExpenseCategory>>(
      `/api/expense-categories/${id}/restore`
    ),
  forceDelete: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/expense-categories/${id}/force-delete`),
  bulkDelete: (ids: number[]) =>
    api.post<ApiResponse<null>>('/api/expense-categories/bulk-delete', { ids }),
  bulkRestore: (ids: number[]) =>
    api.post<ApiResponse<null>>('/api/expense-categories/bulk-restore', {
      ids,
    }),
  bulkForceDelete: (ids: number[]) =>
    api.post<ApiResponse<null>>('/api/expense-categories/bulk-force-delete', {
      ids,
    }),
}
