import api from './api'
import type {
  ApiResponse,
  PaginatedResponse,
  ExpenseCategory,
  ExpenseCategoryFilter,
  CreateExpenseCategoryRequest,
} from '@/types/api'

export const expenseCategoriesService = {
  getAll: (params?: ExpenseCategoryFilter) =>
    api.get<PaginatedResponse<ExpenseCategory>>('/api/expense-categories', { params }),
  getById: (id: number) =>
    api.get<ApiResponse<ExpenseCategory>>(`/api/expense-categories/${id}`),
  create: (data: CreateExpenseCategoryRequest) =>
    api.post<ApiResponse<ExpenseCategory>>('/api/expense-categories', data),
  update: (id: number, data: CreateExpenseCategoryRequest) =>
    api.put<ApiResponse<ExpenseCategory>>(`/api/expense-categories/${id}`, data),
  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/expense-categories/${id}`),
  bulkDelete: (ids: number[]) =>
    api.post<ApiResponse<null>>('/api/expense-categories/bulk-delete', { ids }),
}
