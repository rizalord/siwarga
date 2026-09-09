import type {
  ApiResponse,
  FamilyFilter,
  FamilyInput,
  FamilyMember,
  HouseholdCard,
  PaginatedResponse,
} from '@/types/api'
import api from './api'

export const familyService = {
  getAll: (params?: FamilyFilter) =>
    api.get<PaginatedResponse<FamilyMember>>('/api/family-members', {
      params,
    }),
  create: (input: FamilyInput) =>
    api.post<ApiResponse<FamilyMember>>('/api/family-members', input),
  update: (id: number, input: Partial<FamilyInput>) =>
    api.put<ApiResponse<FamilyMember>>(`/api/family-members/${id}`, input),
  remove: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/family-members/${id}`),
  card: () => api.get<ApiResponse<HouseholdCard>>('/api/households/card'),
}
