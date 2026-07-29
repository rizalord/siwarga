import type { Payment } from '@/types/api'

export const mockPayments: Payment[] = [
  {
    id: 1,
    bill_id: 1,
    amount_paid: 100000,
    payment_date: '2026-07-15',
    notes: 'Bayar iuran bulan Juli',
    created_by: 1,
    created_at: '2026-07-15T00:00:00.000000Z',
    updated_at: '2026-07-15T00:00:00.000000Z',
    deleted_at: null,
  },
  {
    id: 2,
    bill_id: 1,
    amount_paid: 50000,
    payment_date: '2026-06-20',
    notes: 'Pembayaran parsial lama',
    created_by: 1,
    created_at: '2026-06-20T00:00:00.000000Z',
    updated_at: '2026-06-20T00:00:00.000000Z',
    deleted_at: '2026-07-20T10:00:00.000000Z',
  },
]
