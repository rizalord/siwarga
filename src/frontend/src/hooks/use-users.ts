import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersService } from '@/services/users'
import type { UserFilter } from '@/types/api'
import { toast } from 'sonner'

export function useUsers(params?: UserFilter) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => usersService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useUser(id: number) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => usersService.getById(id),
    select: (res) => res.data.data,
    enabled: !!id,
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name: string
      email: string
      password: string
      is_active?: boolean
      role_ids?: number[]
    }) => usersService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Pengguna berhasil ditambahkan')
    },
  })
}

export function useUpdateUser(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name?: string
      email?: string
      is_active?: boolean
      role_ids?: number[]
    }) => usersService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Pengguna berhasil diperbarui')
    },
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => usersService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Pengguna berhasil dihapus')
    },
  })
}

export function useRestoreUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => usersService.restore(id),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success(response.data.message ?? 'Pengguna berhasil dipulihkan')
    },
  })
}

export function useForceDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => usersService.forceDelete(id),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success(
        response.data.message ?? 'Pengguna berhasil dihapus permanen'
      )
    },
  })
}

export function useBulkDeleteUsers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => usersService.bulkDelete(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Pengguna terpilih berhasil dihapus')
    },
  })
}

export function useBulkRestoreUsers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => usersService.bulkRestore(ids),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success(
        response.data.message ?? 'Pengguna terpilih berhasil dipulihkan'
      )
    },
  })
}

export function useBulkForceDeleteUsers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => usersService.bulkForceDelete(ids),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success(
        response.data.message ?? 'Pengguna terpilih berhasil dihapus permanen'
      )
    },
  })
}
