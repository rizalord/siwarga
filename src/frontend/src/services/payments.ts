import api from './api'
import type { ApiResponse, PaginatedResponse, Payment, CreatePaymentRequest } from '@/types/api'

export const paymentsService = {
  getAll: (params?: { bill_id?: number; page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<Payment>>('/api/payments', { params }),
  getById: (id: number) =>
    api.get<ApiResponse<Payment>>(`/api/payments/${id}`),
  create: (data: CreatePaymentRequest) =>
    api.post<ApiResponse<Payment>>('/api/payments', data),
  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/payments/${id}`),
}
