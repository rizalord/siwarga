import api from './api'
import type { ApiResponse, PaginatedResponse, Payment, PaymentFilter, CreatePaymentRequest } from '@/types/api'

export const paymentsService = {
  getAll: (params?: PaymentFilter) =>
    api.get<PaginatedResponse<Payment>>('/api/payments', { params }),
  getById: (id: number) =>
    api.get<ApiResponse<Payment>>(`/api/payments/${id}`),
  create: (data: CreatePaymentRequest) =>
    api.post<ApiResponse<Payment>>('/api/payments', data),
  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/payments/${id}`),
}
