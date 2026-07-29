import type { Bill } from '@/types/api'

export const mockBills: Bill[] = [
  {
    id: 1,
    house: { id: 1, house_number: 'A-01', address: 'Jl. Mawar No. 1', status: 'dihuni', created_at: '', updated_at: '', deleted_at: null },
    resident: { id: 1, full_name: 'Ahmad Fauzi', status: 'tetap', phone_number: '081234567890', marital_status: 'menikah', ktp_photo_url: null, created_at: '', updated_at: '', deleted_at: null },
    due_type: { id: 1, name: 'Iuran Satpam', amount: 100000, billing_cycle: 'bulanan', created_at: '', updated_at: '', deleted_at: null },
    period_start: '2026-07-01',
    period_end: '2026-07-31',
    amount_due: 100000,
    status: 'belum_lunas',
    created_at: '2026-07-01T00:00:00.000000Z',
    updated_at: '2026-07-01T00:00:00.000000Z',
    deleted_at: null,
  },
  {
    id: 2,
    house: { id: 1, house_number: 'A-01', address: 'Jl. Mawar No. 1', status: 'dihuni', created_at: '', updated_at: '', deleted_at: null },
    resident: { id: 1, full_name: 'Ahmad Fauzi', status: 'tetap', phone_number: '081234567890', marital_status: 'menikah', ktp_photo_url: null, created_at: '', updated_at: '', deleted_at: null },
    due_type: { id: 1, name: 'Iuran Satpam', amount: 100000, billing_cycle: 'bulanan', created_at: '', updated_at: '', deleted_at: null },
    period_start: '2026-06-01',
    period_end: '2026-06-30',
    amount_due: 100000,
    status: 'lunas',
    created_at: '2026-06-01T00:00:00.000000Z',
    updated_at: '2026-06-30T00:00:00.000000Z',
    deleted_at: '2026-07-20T10:00:00.000000Z',
  },
]
