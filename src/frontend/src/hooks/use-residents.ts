import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { residentsService } from '@/services/residents'
import type {
  ResidentFilter,
  CreateResidentRequest,
  UpdateResidentRequest,
} from '@/types/api'
import { toast } from 'sonner'

export function useResidents(params?: ResidentFilter) {
  return useQuery({
    queryKey: ['residents', params],
    queryFn: () => residentsService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useResident(id: number) {
  return useQuery({
    queryKey: ['residents', id],
    queryFn: () => residentsService.getById(id),
    select: (res) => res.data.data,
    enabled: !!id,
  })
}

export function useCreateResident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateResidentRequest) => residentsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['residents'] })
      toast.success('Penghuni berhasil ditambahkan')
    },
  })
}

export function useUpdateResident(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateResidentRequest) =>
      residentsService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['residents'] })
      toast.success('Penghuni berhasil diperbarui')
    },
  })
}

export function useDeleteResident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => residentsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['residents'] })
      toast.success('Penghuni berhasil dihapus')
    },
  })
}

export function useRestoreResident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => residentsService.restore(id),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['residents'] })
      toast.success(response.data.message ?? 'Penghuni berhasil dipulihkan')
    },
  })
}

export function useForceDeleteResident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => residentsService.forceDelete(id),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['residents'] })
      toast.success(
        response.data.message ?? 'Penghuni berhasil dihapus permanen'
      )
    },
  })
}

export function useBulkDeleteResidents() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => residentsService.bulkDelete(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['residents'] })
      toast.success('Penghuni terpilih berhasil dihapus')
    },
  })
}

export function useBulkRestoreResidents() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => residentsService.bulkRestore(ids),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['residents'] })
      toast.success(
        response.data.message ?? 'Penghuni terpilih berhasil dipulihkan'
      )
    },
  })
}

export function useBulkForceDeleteResidents() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => residentsService.bulkForceDelete(ids),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['residents'] })
      toast.success(
        response.data.message ?? 'Penghuni terpilih berhasil dihapus permanen'
      )
    },
  })
}
