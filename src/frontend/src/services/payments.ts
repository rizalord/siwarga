import type {
  ApiResponse,
  PaginatedResponse,
  Payment,
  PaymentFilter,
  CreatePaymentRequest,
} from '@/types/api'
import api from './api'

export const paymentsService = {
  getAll: (params?: PaymentFilter) =>
    api.get<PaginatedResponse<Payment>>('/api/payments', { params }),
  getById: (id: number) => api.get<ApiResponse<Payment>>(`/api/payments/${id}`),
  create: (data: CreatePaymentRequest) =>
    api.post<ApiResponse<Payment>>('/api/payments', data),
  delete: (id: number) => api.delete<ApiResponse<null>>(`/api/payments/${id}`),
  restore: (id: number) =>
    api.post<ApiResponse<Payment>>(`/api/payments/${id}/restore`),
  forceDelete: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/payments/${id}/force-delete`),
  bulkDelete: (ids: number[]) =>
    api.post<ApiResponse<null>>('/api/payments/bulk-delete', { ids }),
  bulkRestore: (ids: number[]) =>
    api.post<ApiResponse<null>>('/api/payments/bulk-restore', { ids }),
  bulkForceDelete: (ids: number[]) =>
    api.post<ApiResponse<null>>('/api/payments/bulk-force-delete', { ids }),
}
