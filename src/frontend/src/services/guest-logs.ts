import type {
  ApiResponse,
  GuestLog,
  GuestLogFilter,
  PaginatedResponse,
  RegisterGuestInput,
} from '@/types/api'
import api from './api'

export const guestLogsService = {
  getAll: (params?: GuestLogFilter) =>
    api.get<PaginatedResponse<GuestLog>>('/api/guest-logs', { params }),
  register: (input: RegisterGuestInput) =>
    api.post<ApiResponse<GuestLog>>('/api/guest-logs', input),
  checkIn: (id: number) =>
    api.post<ApiResponse<GuestLog>>(`/api/guest-logs/${id}/check-in`),
  checkOut: (id: number) =>
    api.post<ApiResponse<GuestLog>>(`/api/guest-logs/${id}/check-out`),
}
