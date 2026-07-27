import api from './api'
import type { ApiResponse, PaginatedResponse, Expense, CreateExpenseRequest, ExpenseFilter } from '@/types/api'

export const expensesService = {
  getAll: (params?: ExpenseFilter) =>
    api.get<PaginatedResponse<Expense>>('/api/expenses', { params }),
  getById: (id: number) =>
    api.get<ApiResponse<Expense>>(`/api/expenses/${id}`),
  create: (data: CreateExpenseRequest) =>
    api.post<ApiResponse<Expense>>('/api/expenses', data),
  update: (id: number, data: Partial<CreateExpenseRequest>) =>
    api.put<ApiResponse<Expense>>(`/api/expenses/${id}`, data),
  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/expenses/${id}`),
}
