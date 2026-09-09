import type {
  ApiResponse,
  EmergencyContact,
  PaginatedResponse,
  PanicAlert,
  PanicFilter,
} from '@/types/api'
import api from './api'

export const panicService = {
  getAll: (params?: PanicFilter) =>
    api.get<PaginatedResponse<PanicAlert>>('/api/panic-alerts', { params }),
  report: (input: { location_note?: string; note?: string }) =>
    api.post<ApiResponse<PanicAlert>>('/api/panic-alerts', input),
  handle: (id: number) =>
    api.post<ApiResponse<PanicAlert>>(`/api/panic-alerts/${id}/handle`),
  resolve: (id: number) =>
    api.post<ApiResponse<PanicAlert>>(`/api/panic-alerts/${id}/resolve`),
  cancel: (id: number) =>
    api.post<ApiResponse<PanicAlert>>(`/api/panic-alerts/${id}/cancel`),
}

export const emergencyContactsService = {
  getAll: () =>
    api.get<PaginatedResponse<EmergencyContact>>('/api/emergency-contacts', {
      params: { per_page: 50 },
    }),
}
