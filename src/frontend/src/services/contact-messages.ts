import type {
  ApiResponse,
  PaginatedResponse,
  ContactMessage,
  ContactMessageFilter,
} from '@/types/api'
import api from './api'

export const contactMessagesService = {
  getAll: (params?: ContactMessageFilter) =>
    api.get<PaginatedResponse<ContactMessage>>('/api/contact-messages', {
      params,
    }),
  getById: (id: number) =>
    api.get<ApiResponse<ContactMessage>>(`/api/contact-messages/${id}`),
  markRead: (id: number) =>
    api.post<ApiResponse<ContactMessage>>(
      `/api/contact-messages/${id}/mark-read`
    ),
}
