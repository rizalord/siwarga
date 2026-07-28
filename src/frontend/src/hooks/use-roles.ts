import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { rolesService } from '@/services/roles'
import type { RoleFilter, CreateRoleRequest } from '@/types/api'

export function useRoles(params?: RoleFilter) {
  return useQuery({
    queryKey: ['roles', params],
    queryFn: () => rolesService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useRole(id: number) {
  return useQuery({
    queryKey: ['roles', id],
    queryFn: () => rolesService.getById(id),
    select: (res) => res.data.data,
    enabled: !!id,
  })
}

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRoleRequest) => rolesService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      toast.success('Role berhasil ditambahkan')
    },
  })
}

export function useUpdateRole(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CreateRoleRequest>) => rolesService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      toast.success('Role berhasil diperbarui')
    },
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => rolesService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      toast.success('Role berhasil dihapus')
    },
  })
}
