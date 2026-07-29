import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dueTypesService } from '@/services/due-types'
import type { CreateDueTypeRequest, DueTypeFilter } from '@/types/api'
import { toast } from 'sonner'

export function useDueTypes(params?: DueTypeFilter) {
  return useQuery({
    queryKey: ['due-types', params],
    queryFn: () => dueTypesService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useDueType(id: number) {
  return useQuery({
    queryKey: ['due-types', id],
    queryFn: () => dueTypesService.getById(id),
    select: (res) => res.data.data,
    enabled: !!id,
  })
}

export function useCreateDueType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDueTypeRequest) => dueTypesService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['due-types'] })
      toast.success('Jenis iuran berhasil ditambahkan')
    },
  })
}

export function useUpdateDueType(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDueTypeRequest) =>
      dueTypesService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['due-types'] })
      toast.success('Jenis iuran berhasil diperbarui')
    },
  })
}

export function useDeleteDueType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => dueTypesService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['due-types'] })
      toast.success('Jenis iuran berhasil dihapus')
    },
  })
}

export function useRestoreDueType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => dueTypesService.restore(id),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['due-types'] })
      toast.success(response.data.message ?? 'Jenis iuran berhasil dipulihkan')
    },
  })
}

export function useForceDeleteDueType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => dueTypesService.forceDelete(id),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['due-types'] })
      toast.success(
        response.data.message ?? 'Jenis iuran berhasil dihapus permanen'
      )
    },
  })
}

export function useBulkDeleteDueTypes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => dueTypesService.bulkDelete(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['due-types'] })
      toast.success('Jenis iuran terpilih berhasil dihapus')
    },
  })
}

export function useBulkRestoreDueTypes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => dueTypesService.bulkRestore(ids),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['due-types'] })
      toast.success(
        response.data.message ?? 'Jenis iuran terpilih berhasil dipulihkan'
      )
    },
  })
}

export function useBulkForceDeleteDueTypes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => dueTypesService.bulkForceDelete(ids),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['due-types'] })
      toast.success(
        response.data.message ??
          'Jenis iuran terpilih berhasil dihapus permanen'
      )
    },
  })
}
