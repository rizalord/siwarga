import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billsService } from '@/services/bills'
import type { BillFilter, GenerateBillsRequest } from '@/types/api'
import { toast } from 'sonner'

export function useBills(params?: BillFilter) {
  return useQuery({
    queryKey: ['bills', params],
    queryFn: () => billsService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useBill(id: number) {
  return useQuery({
    queryKey: ['bills', id],
    queryFn: () => billsService.getById(id),
    select: (res) => res.data.data,
    enabled: !!id,
  })
}

export function useGenerateBills() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: GenerateBillsRequest) => billsService.generate(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['bills'] })
      toast.success(res.data.message ?? 'Tagihan berhasil dibuat')
    },
  })
}

export function useDeleteBill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => billsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] })
      toast.success('Tagihan berhasil dihapus')
    },
  })
}

export function useRestoreBill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => billsService.restore(id),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['bills'] })
      toast.success(response.data.message ?? 'Tagihan berhasil dipulihkan')
    },
  })
}

export function useForceDeleteBill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => billsService.forceDelete(id),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['bills'] })
      toast.success(
        response.data.message ?? 'Tagihan berhasil dihapus permanen'
      )
    },
  })
}

export function useBulkDeleteBills() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => billsService.bulkDelete(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] })
      toast.success('Tagihan terpilih berhasil dihapus')
    },
  })
}

export function useBulkRestoreBills() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => billsService.bulkRestore(ids),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['bills'] })
      toast.success(
        response.data.message ?? 'Tagihan terpilih berhasil dipulihkan'
      )
    },
  })
}

export function useBulkForceDeleteBills() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => billsService.bulkForceDelete(ids),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['bills'] })
      toast.success(
        response.data.message ?? 'Tagihan terpilih berhasil dihapus permanen'
      )
    },
  })
}
