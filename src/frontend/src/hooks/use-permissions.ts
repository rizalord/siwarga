import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { permissionsService } from '@/services/permissions'
import type { PermissionFilter, CreatePermissionRequest } from '@/types/api'

export function usePermissions(params?: PermissionFilter) {
  return useQuery({
    queryKey: ['permissions', params],
    queryFn: () => permissionsService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function usePermission(id: number) {
  return useQuery({
    queryKey: ['permissions', id],
    queryFn: () => permissionsService.getById(id),
    select: (res) => res.data.data,
    enabled: !!id,
  })
}

export function useCreatePermission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePermissionRequest) => permissionsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions'] })
      toast.success('Permission berhasil ditambahkan')
    },
  })
}

export function useUpdatePermission(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CreatePermissionRequest>) => permissionsService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions'] })
      toast.success('Permission berhasil diperbarui')
    },
  })
}

export function useDeletePermission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => permissionsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions'] })
      toast.success('Permission berhasil dihapus')
    },
  })
}
