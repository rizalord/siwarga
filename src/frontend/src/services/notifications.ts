import type {
  ApiResponse,
  PaginatedResponse,
  AppNotification,
} from '@/types/api'
import api from './api'

export const notificationsService = {
  getAll: (page?: number) =>
    api.get<PaginatedResponse<AppNotification>>('/api/notifications', {
      params: { page },
    }),
  markRead: (id: string) =>
    api.post<ApiResponse<null>>(`/api/notifications/${id}/read`),
  markAllRead: () => api.post<ApiResponse<null>>('/api/notifications/read-all'),
}
