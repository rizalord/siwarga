import type {
  ApiResponse,
  PaginatedResponse,
  PaymentChannel,
  PaymentTransaction,
  PaymentTrxFilter,
} from '@/types/api'
import api from './api'

export const paymentsOnlineService = {
  getAll: (params?: PaymentTrxFilter) =>
    api.get<PaginatedResponse<PaymentTransaction>>(
      '/api/payment-transactions',
      { params }
    ),
  getById: (id: number) =>
    api.get<ApiResponse<PaymentTransaction>>(`/api/payment-transactions/${id}`),
  create: (input: {
    bill_id: number
    channel: PaymentChannel
    provider?: string
    proof?: File
  }) => {
    const form = new FormData()
    form.append('bill_id', String(input.bill_id))
    form.append('channel', input.channel)
    if (input.provider) form.append('provider', input.provider)
    if (input.proof) form.append('proof', input.proof)
    // Drop the instance JSON Content-Type so axios sends raw FormData and
    // the browser sets `multipart/form-data; boundary=...` itself (same
    // pattern as residents/pages photo uploads). Otherwise axios
    // JSON-serializes the FormData and the File never reaches the server.
    return api.post<ApiResponse<PaymentTransaction>>(
      '/api/payment-transactions',
      form,
      { headers: { 'Content-Type': undefined } }
    )
  },
  uploadProof: (id: number, proof: File) => {
    const form = new FormData()
    form.append('proof', proof)
    return api.post<ApiResponse<PaymentTransaction>>(
      `/api/payment-transactions/${id}/proof`,
      form,
      { headers: { 'Content-Type': undefined } }
    )
  },
  verify: (id: number, approve: boolean, reason?: string) =>
    api.post<ApiResponse<PaymentTransaction>>(
      `/api/payment-transactions/${id}/verify`,
      { approve, reason }
    ),
  simulatePay: (id: number) =>
    api.post<ApiResponse<PaymentTransaction>>(
      `/api/payment-transactions/${id}/simulate-pay`
    ),
}
