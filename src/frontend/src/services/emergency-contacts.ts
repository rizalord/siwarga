import type {
  ApiResponse,
  EmergencyContact,
  PaginatedResponse,
} from '@/types/api'
import api from './api'

export interface EmergencyContactInput {
  name: string
  phone: string
  sort_order?: number
}

export const emergencyContactsService = {
  getAll: () =>
    api.get<PaginatedResponse<EmergencyContact>>('/api/emergency-contacts', {
      params: { per_page: 50 },
    }),
  create: (input: EmergencyContactInput) =>
    api.post<ApiResponse<EmergencyContact>>('/api/emergency-contacts', input),
  update: (id: number, input: Partial<EmergencyContactInput>) =>
    api.put<ApiResponse<EmergencyContact>>(
      `/api/emergency-contacts/${id}`,
      input
    ),
  remove: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/emergency-contacts/${id}`),
}
