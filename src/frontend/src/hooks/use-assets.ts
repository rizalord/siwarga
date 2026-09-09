import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assetsService, assetLoansService } from '@/services/assets'
import type { AssetFilter, AssetLoanFilter } from '@/types/api'
import { toast } from 'sonner'

export function useAssets(params?: AssetFilter) {
  return useQuery({
    queryKey: ['assets', params],
    queryFn: () => assetsService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useAssetLoans(params?: AssetLoanFilter) {
  return useQuery({
    queryKey: ['asset-loans', params],
    queryFn: () => assetLoansService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useRequestAssetLoan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ asset_id, quantity }: { asset_id: number; quantity: number }) =>
      assetLoansService.create(asset_id, quantity),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] })
      qc.invalidateQueries({ queryKey: ['asset-loans'] })
      toast.success('Pengajuan pinjaman terkirim')
    },
    onError: () => toast.error('Gagal mengajukan pinjaman'),
  })
}

export function useReviewAssetLoan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'approve' | 'reject' }) =>
      action === 'approve' ? assetLoansService.approve(id) : assetLoansService.reject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] })
      qc.invalidateQueries({ queryKey: ['asset-loans'] })
      toast.success('Peminjaman diproses')
    },
    onError: () => toast.error('Gagal memproses peminjaman'),
  })
}

export function useReturnAssetLoan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => assetLoansService.markReturned(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] })
      qc.invalidateQueries({ queryKey: ['asset-loans'] })
      toast.success('Pengembalian dicatat')
    },
    onError: () => toast.error('Gagal mencatat pengembalian'),
  })
}

export function useCreateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; quantity: number; condition?: string }) =>
      assetsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] })
      toast.success('Aset berhasil ditambahkan')
    },
    onError: () => toast.error('Gagal menambah aset'),
  })
}

export function useDeleteAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => assetsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] })
      toast.success('Aset berhasil dihapus')
    },
    onError: () => toast.error('Gagal menghapus aset'),
  })
}
