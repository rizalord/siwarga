import type {
  ApiResponse,
  PaginatedResponse,
  AdminEvent,
  EventDocumentation,
  EventFilter,
} from '@/types/api'
import api from './api'

export const eventsAdminService = {
  getAll: (params?: EventFilter) =>
    api.get<PaginatedResponse<AdminEvent>>('/api/events', { params }),
  getById: (id: number) =>
    api.get<ApiResponse<AdminEvent>>(`/api/events/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post<ApiResponse<AdminEvent>>('/api/events', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put<ApiResponse<AdminEvent>>(`/api/events/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<null>>(`/api/events/${id}`),
  uploadDocumentation: (
    id: number,
    photo: File,
    media_type: string,
    caption?: string
  ) => {
    const form = new FormData()
    form.append('photo', photo)
    form.append('media_type', media_type)
    if (caption) form.append('caption', caption)
    return api.post<ApiResponse<EventDocumentation>>(
      `/api/events/${id}/documentation`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  },
  deleteDocumentation: (docId: number) =>
    api.delete<ApiResponse<null>>(`/api/event-documentation/${docId}`),
}
