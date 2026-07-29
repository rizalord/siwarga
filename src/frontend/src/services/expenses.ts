import type {
  ApiResponse,
  PaginatedResponse,
  Expense,
  CreateExpenseRequest,
  ExpenseFilter,
} from '@/types/api'
import api from './api'

export const expensesService = {
  getAll: (params?: ExpenseFilter) =>
    api.get<PaginatedResponse<Expense>>('/api/expenses', { params }),
  getById: (id: number) => api.get<ApiResponse<Expense>>(`/api/expenses/${id}`),
  create: (data: CreateExpenseRequest) =>
    api.post<ApiResponse<Expense>>('/api/expenses', data),
  update: (id: number, data: Partial<CreateExpenseRequest>) =>
    api.put<ApiResponse<Expense>>(`/api/expenses/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<null>>(`/api/expenses/${id}`),
  restore: (id: number) =>
    api.post<ApiResponse<Expense>>(`/api/expenses/${id}/restore`),
  forceDelete: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/expenses/${id}/force-delete`),
  bulkDelete: (ids: number[]) =>
    api.post<ApiResponse<null>>('/api/expenses/bulk-delete', { ids }),
  bulkRestore: (ids: number[]) =>
    api.post<ApiResponse<null>>('/api/expenses/bulk-restore', { ids }),
  bulkForceDelete: (ids: number[]) =>
    api.post<ApiResponse<null>>('/api/expenses/bulk-force-delete', { ids }),
}
