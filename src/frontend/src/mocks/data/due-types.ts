import type { DueType } from '@/types/api'

export const mockDueTypes: DueType[] = [
  {
    id: 1,
    name: 'Iuran Satpam',
    amount: 100000,
    billing_cycle: 'bulanan',
    created_at: '2026-07-01T00:00:00.000000Z',
    updated_at: '2026-07-01T00:00:00.000000Z',
    deleted_at: null,
  },
  {
    id: 2,
    name: 'Iuran Kebersihan',
    amount: 15000,
    billing_cycle: 'bulanan',
    created_at: '2026-07-01T00:00:00.000000Z',
    updated_at: '2026-07-01T00:00:00.000000Z',
    deleted_at: '2026-07-20T10:00:00.000000Z',
  },
]
