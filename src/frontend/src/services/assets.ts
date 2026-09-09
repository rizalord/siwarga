import type {
  ApiResponse,
  PaginatedResponse,
  Asset,
  AssetFilter,
  AssetLoan,
  AssetLoanFilter,
} from '@/types/api'
import api from './api'

export const assetsService = {
  getAll: (params?: AssetFilter) =>
    api.get<PaginatedResponse<Asset>>('/api/assets', { params }),
  create: (data: { name: string; quantity: number; condition?: string }) =>
    api.post<ApiResponse<Asset>>('/api/assets', data),
  delete: (id: number) => api.delete<ApiResponse<null>>(`/api/assets/${id}`),
}

export const assetLoansService = {
  getAll: (params?: AssetLoanFilter) =>
    api.get<PaginatedResponse<AssetLoan>>('/api/asset-loans', { params }),
  create: (asset_id: number, quantity: number) =>
    api.post<ApiResponse<AssetLoan>>('/api/asset-loans', { asset_id, quantity }),
  approve: (id: number) =>
    api.post<ApiResponse<AssetLoan>>(`/api/asset-loans/${id}/approve`),
  reject: (id: number) =>
    api.post<ApiResponse<AssetLoan>>(`/api/asset-loans/${id}/reject`),
  markReturned: (id: number) =>
    api.post<ApiResponse<AssetLoan>>(`/api/asset-loans/${id}/return`),
}
