import type { ApiResponse, Page, UpdatePageRequest } from '@/types/api'
import api from './api'

function toPageFormData(data: UpdatePageRequest) {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value)
    }
  })
  return formData
}

export const pagesService = {
  getBySlug: (slug: string) => api.get<ApiResponse<Page>>(`/api/pages/${slug}`),
  update: (slug: string, data: UpdatePageRequest) => {
    const formData = toPageFormData(data)
    formData.append('_method', 'PUT')
    return api.post<ApiResponse<Page>>(`/api/pages/${slug}`, formData, {
      headers: { 'Content-Type': undefined },
    })
  },
}
