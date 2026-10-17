import type {
  ApiResponse,
  Camera,
  CameraSnapshot,
  PaginatedResponse,
  SnapshotFilter,
} from '@/types/api'
import api from './api'

export interface CameraInput {
  name: string
  location?: string
  ftp_user: string
  camera_type: 'tapo' | 'simulator'
  stream_url?: string
  is_active?: boolean
}

export const cctvService = {
  cameras: (params?: { page?: number; search?: string }) =>
    api.get<PaginatedResponse<Camera>>('/api/cameras', { params }),
  createCamera: (input: CameraInput) =>
    api.post<ApiResponse<Camera>>('/api/cameras', input),
  updateCamera: (id: number, input: Partial<CameraInput>) =>
    api.put<ApiResponse<Camera>>(`/api/cameras/${id}`, input),
  deleteCamera: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/cameras/${id}`),
  snapshots: (params?: SnapshotFilter) =>
    api.get<PaginatedResponse<CameraSnapshot>>('/api/camera-snapshots', {
      params,
    }),
  snapshot: (id: number) =>
    api.get<ApiResponse<CameraSnapshot>>(`/api/camera-snapshots/${id}`),
  deleteSnapshot: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/camera-snapshots/${id}`),
  simulate: (id: number, count = 1) =>
    api.post<ApiResponse<CameraSnapshot[]>>(`/api/cameras/${id}/simulate`, {
      count,
    }),
}
