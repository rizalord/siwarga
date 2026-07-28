import api from './api'
import type { ApiResponse, Role } from '@/types/api'

export const rolesService = {
  getAll: () => api.get<ApiResponse<Role[]>>('/api/roles'),
}
