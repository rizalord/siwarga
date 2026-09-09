import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsOnlineService } from '@/services/payments-online'
import type { PaymentChannel, PaymentTrxFilter } from '@/types/api'
import { toast } from 'sonner'

export function usePaymentTransactions(params?: PaymentTrxFilter) {
  return useQuery({
    queryKey: ['payment-transactions', params],
    queryFn: () => paymentsOnlineService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function usePaymentTransaction(id: number | undefined) {
  return useQuery({
    queryKey: ['payment-transactions', id],
    queryFn: () => paymentsOnlineService.getById(id as number),
    select: (res) => res.data.data,
    enabled: typeof id === 'number',
    refetchInterval: (query) =>
      ['pending', 'awaiting_verification'].includes(
        query.state.data?.data.data.status ?? ''
      )
        ? 5000
        : false,
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      bill_id: number
      channel: PaymentChannel
      provider?: string
      proof?: File
    }) => paymentsOnlineService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-transactions'] })
      toast.success('Transaksi pembayaran dibuat')
    },
    onError: () => toast.error('Gagal membuat transaksi pembayaran'),
  })
}

export function useUploadProof() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, proof }: { id: number; proof: File }) =>
      paymentsOnlineService.uploadProof(id, proof),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-transactions'] })
      toast.success('Bukti terkirim, menunggu verifikasi')
    },
    onError: () => toast.error('Gagal mengunggah bukti pembayaran'),
  })
}

export function useVerifyTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      approve,
      reason,
    }: {
      id: number
      approve: boolean
      reason?: string
    }) => paymentsOnlineService.verify(id, approve, reason),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['payment-transactions'] })
      toast.success(
        vars.approve ? 'Pembayaran diverifikasi' : 'Transaksi ditolak'
      )
    },
    onError: () => toast.error('Gagal memverifikasi pembayaran'),
  })
}

export function useSimulatePay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => paymentsOnlineService.simulatePay(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-transactions'] })
      toast.success('Simulasi berhasil')
    },
    onError: () => toast.error('Gagal menjalankan simulasi pembayaran'),
  })
}
